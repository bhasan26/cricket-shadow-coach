/**
 * API client for communicating with the Python backend.
 * 
 * Handles POST requests to the FastAPI server for analyzing cricket shots,
 * with bounded requests and error handling. Retries are explicit so the user
 * can reuse a captured attempt without accidentally submitting it twice.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const ANALYSIS_TIMEOUT_MS = 30_000;

export async function checkContactAvailability() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${API_BASE_URL}/contact/status`, { signal: controller.signal });
    return response.ok && (await response.json()).available === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function sendContactMessage(payload, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 30_000);
  try {
    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(response.status === 422 ? 'Please check your name, email, and message, then try again.'
        : typeof body.detail === 'string' ? body.detail : 'We could not confirm delivery. Please try again later.');
    }
    if (response.status !== 202 || typeof body.message !== 'string') {
      throw new Error('We could not confirm delivery. Your message is still here; please try again later.');
    }
    return body;
  } catch (error) {
    if (timedOut || error instanceof TypeError) {
      throw new Error('We could not confirm delivery. Check your connection before trying again; your message is still here.', { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

async function request(path, options = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const signal = options.signal;
  let timedOut = false;
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, signal: controller.signal });
    if (!response.ok) {
      let detail;
      try { detail = (await response.json())?.detail; } catch { /* non-JSON response */ }
      throw new Error(response.status === 422
        ? 'Could not read your pose data — please record the shot again.'
        : (typeof detail === 'string' ? detail : 'Analysis failed. Please try again.'));
    }
    // Keep the timeout active until the body has also arrived.
    return await response.json();
  } catch (error) {
    if (timedOut) throw new Error('Analysis took too long. Retry this attempt when your connection is ready.', { cause: error });
    if (signal?.aborted) throw new Error('Analysis cancelled. You can retry this attempt.', { cause: error });
    if (error instanceof TypeError) throw new Error('Could not connect. Check your connection and retry this attempt.', { cause: error });
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

/**
 * Analyze a complete shot sequence
 *
 * @param {Array} shotSequence - Array of 2D pose landmark arrays over time
 * @param {string} shotType - Shot type key (e.g., 'cover_drive', 'pull_shot')
 * @param {Array|null} worldSequence - Optional metric 3D world landmark arrays
 * @param {boolean} isRightHanded - Batting handedness (default true)
 * @param {{signal?: AbortSignal}} options - Optional cancellation signal
 * @returns {Promise} Response containing overall score and feedback
 */
export async function analyzeShotSequence(shotSequence, shotType = 'cover_drive', worldSequence = null, isRightHanded = true, { signal, frameTimestamps, imageWidth, imageHeight } = {}) {
  return request('/analyze-shot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      shot_sequence: shotSequence,
      shot_type: shotType,
      is_right_handed: isRightHanded,
      ...(worldSequence ? { world_landmarks: worldSequence } : {}),
      ...(frameTimestamps ? { frame_timestamps_ms: frameTimestamps } : {}),
      ...(imageWidth && imageHeight ? { image_width: imageWidth, image_height: imageHeight } : {}),
    }),
  }, ANALYSIS_TIMEOUT_MS);
}

/**
 * Check API health
 * 
 * @returns {Promise<boolean>} True if API is accessible
 */
export async function checkAPIHealth() {
  try {
    await request('/health');
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch available shot types from the backend
 * 
 * @returns {Promise<Object>} Dict of shot types with metadata
 */
export async function fetchShots() {
  try {
    return await request('/shots');
  } catch {
    // Return fallback shot list
    return {
      cover_drive: { name: 'Cover Drive', emoji: '🏏', description: 'Classic off-side drive', difficulty: 'Intermediate' },
      straight_drive: { name: 'Straight Drive', emoji: '⬆️', description: 'Drive past the bowler', difficulty: 'Advanced' },
      pull_shot: { name: 'Pull Shot', emoji: '💪', description: 'Horizontal bat shot', difficulty: 'Intermediate' },
      defensive_block: { name: 'Defensive Block', emoji: '🛡️', description: 'Forward defense', difficulty: 'Beginner' },
      flick_shot: { name: 'Flick Shot', emoji: '🖐️', description: 'Wristy flick to leg', difficulty: 'Advanced' },
    };
  }
}
