/**
 * Pose detection utilities using MediaPipe Pose via CDN.
 * 
 * Loads MediaPipe dynamically from the CDN to avoid ESM bundling issues
 * with the @mediapipe/pose npm package.
 */

let poseInstance = null;
let loadPromise = null;
const MODEL_LOAD_TIMEOUT_MS = 20_000;

/**
 * Load MediaPipe Pose script from CDN
 */
function loadMediaPipeScript(src) {
  if (window.Pose) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    const script = existing || document.createElement('script');
    const cleanup = () => {
      clearTimeout(timer);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };
    const onLoad = () => { cleanup(); resolve(); };
    const onError = () => {
      cleanup();
      script.remove();
      reject(new Error('Could not load movement tracking. Check your connection and retry.'));
    };
    const timer = setTimeout(onError, MODEL_LOAD_TIMEOUT_MS);
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

/**
 * Initialize MediaPipe Pose
 */
async function initPose() {
  if (poseInstance) return poseInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Load MediaPipe Pose from CDN
    await loadMediaPipeScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js');

    // Wait for the Pose class to be available on window
    const PoseClass = window.Pose;
    if (!PoseClass) {
      throw new Error('MediaPipe Pose class not found on window');
    }

    const pose = new PoseClass({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
    });

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const complexity = isMobile ? 0 : 1;

    pose.setOptions({
      modelComplexity: complexity,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // Script load alone doesn't mean the WASM/model assets are usable.
    // Wait for initialization so callers only mark a working detector ready.
    let timer;
    try {
      await Promise.race([
        pose.initialize(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Movement tracking took too long to load. Please retry.')), MODEL_LOAD_TIMEOUT_MS);
        }),
      ]);
    } catch (error) {
      // A stalled WASM initialization can also stall close(); recovery must
      // not wait on cleanup of a broken instance.
      try { Promise.resolve(pose.close()).catch(() => {}); } catch { /* partially initialized model */ }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    poseInstance = pose;
    return pose;
  })().catch(error => {
    loadPromise = null;
    throw error;
  });

  return loadPromise;
}

/**
 * Create a pose detector that processes video frames
 */
export function createPoseDetector(videoElement, onPoseLandmarks, { onError = () => {} } = {}) {
  if (!videoElement) {
    throw new Error('A video element is required to initialize Pose.');
  }

  if (typeof onPoseLandmarks !== 'function') {
    throw new Error('A callback function is required to receive poseLandmarks.');
  }

  let frameId = null;
  let stopped = false;
  let pose = null;
  let initialized = false;
  let destroyed = false;
  let consecutiveErrors = 0;

  const init = async () => {
    pose = await initPose();
    if (destroyed) return;
    pose.onResults((results) => {
      // Screen landmarks drive drawing; world landmarks supply metric geometry.
      if (!stopped && !destroyed) {
        onPoseLandmarks(results.poseLandmarks || null, results.poseWorldLandmarks || null);
      }
    });
    initialized = true;
  };

  const processFrame = async () => {
    if (stopped) return;

    if (initialized && pose && videoElement.readyState >= 2) {
      try {
        await pose.send({ image: videoElement });
        consecutiveErrors = 0;
      } catch (error) {
        if (stopped || destroyed) return;
        // Include transient failures in tracking coverage, then stop after
        // repeated failures instead of displaying a permanently frozen pose.
        onPoseLandmarks(null, null);
        consecutiveErrors += 1;
        if (consecutiveErrors >= 3) {
          stop();
          initialized = false;
          if (poseInstance === pose) {
            poseInstance = null;
            loadPromise = null;
          }
          try { Promise.resolve(pose.close()).catch(() => {}); } catch { /* broken runtime */ }
          onError(error);
          return;
        }
      }
    }

    if (!stopped) frameId = window.requestAnimationFrame(processFrame);
  };

  const start = async () => {
    if (destroyed) return;
    if (!initialized) {
      await init();
    }
    if (!destroyed && frameId === null) {
      stopped = false;
      consecutiveErrors = 0;
      frameId = window.requestAnimationFrame(processFrame);
    }
  };

  const stop = () => {
    stopped = true;
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
  };

  const destroy = () => {
    destroyed = true;
    stop();
    // Don't close the pose instance since it's shared
  };

  return {
    pose,
    start,
    stop,
    destroy,
  };
}
