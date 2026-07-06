/**
 * API client for communicating with the Python backend.
 * 
 * Handles POST requests to the FastAPI server for analyzing cricket shots,
 * with retry logic and error handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Analyze a complete shot sequence
 *
 * @param {Array} shotSequence - Array of 2D pose landmark arrays over time
 * @param {string} shotType - Shot type key (e.g., 'cover_drive', 'pull_shot')
 * @param {Array|null} worldSequence - Optional metric 3D world landmark arrays
 * @param {boolean} isRightHanded - Batting handedness (default true)
 * @returns {Promise} Response containing overall score and feedback
 */
export async function analyzeShotSequence(shotSequence, shotType = 'cover_drive', worldSequence = null, isRightHanded = true) {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze-shot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shot_sequence: shotSequence,
        shot_type: shotType,
        is_right_handed: isRightHanded,
        ...(worldSequence ? { world_landmarks: worldSequence } : {}),
      }),
    });

    if (!response.ok) {
      // Surface the server's friendly `detail` message when present, without
      // leaking raw stack traces (the backend no longer returns those).
      let detail = '';
      try {
        const body = await response.json();
        detail = body?.detail || '';
      } catch {
        detail = '';
      }
      const friendly = response.status === 422
        ? 'Could not read your pose data — please record the shot again.'
        : (detail || 'Analysis failed. Please try again.');
      throw new Error(friendly);
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
