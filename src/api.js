/**
 * API client for communicating with the Python backend.
 * 
 * Handles POST requests to the FastAPI server for analyzing cricket shots,
 * with retry logic and error handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Analyze a single frame of pose landmarks
 * 
 * @param {Array} poseLandmarks - Array of 33 MediaPipe landmarks
 * @returns {Promise} Response containing score and feedback
 */
export async function analyzeFrame(poseLandmarks) {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze-frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        poseLandmarks: poseLandmarks,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Frame analysis failed:', error);
    throw error;
  }
}

/**
 * Analyze a complete shot sequence
 * 
 * @param {Array} shotSequence - Array of pose landmark arrays over time
 * @param {string} shotType - Shot type key (e.g., 'cover_drive', 'pull_shot')
 * @returns {Promise} Response containing overall score and feedback
 */
export async function analyzeShotSequence(shotSequence, shotType = 'cover_drive') {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze-shot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shot_sequence: shotSequence,
        shot_type: shotType,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Shot sequence analysis failed:', error);
    throw error;
  }
}

/**
 * Check API health
 * 
 * @returns {Promise<boolean>} True if API is accessible
 */
export async function checkAPIHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
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
    const response = await fetch(`${API_BASE_URL}/shots`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error('Failed to fetch shots');
    return await response.json();
  } catch (error) {
    console.error('Fetch shots failed:', error);
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

/**
 * Retry a function with exponential backoff
 * 
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} delayMs - Initial delay in milliseconds
 * @returns {Promise} Function result or error
 */
export async function retryWithBackoff(fn, maxAttempts = 3, delayMs = 100) {
  let lastError;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (2 ** i)));
      }
    }
  }

  throw lastError;
}

/**
 * Batch analyze multiple frames for efficiency
 * 
 * @param {Array<Array>} frames - Array of pose landmark arrays
 * @param {number} batchSize - Number of frames per batch
 * @returns {Promise<Array>} Array of analysis results
 */
export async function batchAnalyzeFrames(frames, batchSize = 10) {
  const results = [];

  for (let i = 0; i < frames.length; i += batchSize) {
    const batch = frames.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((frame) => retryWithBackoff(() => analyzeFrame(frame)))
    );
    results.push(...batchResults);
  }

  return results;
}
