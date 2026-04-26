/**
 * API client for communicating with the Python backend.
 * 
 * Handles POST requests to the FastAPI server for analyzing cricket shots,
 * with retry logic and error handling.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
 * @returns {Promise} Response containing overall score and feedback
 */
export async function analyzeShotSequence(shotSequence) {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze-shot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shot_sequence: shotSequence,
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
