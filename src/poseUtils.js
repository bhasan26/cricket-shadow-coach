/**
 * Pose detection utilities using MediaPipe Pose via CDN.
 * 
 * Loads MediaPipe dynamically from the CDN to avoid ESM bundling issues
 * with the @mediapipe/pose npm package.
 */

let poseInstance = null;
let loadPromise = null;

/**
 * Load MediaPipe Pose script from CDN
 */
function loadMediaPipeScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
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
    console.log(`Dynamically setting MediaPipe modelComplexity to ${complexity} (isMobile: ${isMobile})`);

    pose.setOptions({
      modelComplexity: complexity,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    poseInstance = pose;
    return pose;
  })();

  return loadPromise;
}

/**
 * Create a pose detector that processes video frames
 */
export function createPoseDetector(videoElement, onPoseLandmarks) {
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

  const init = async () => {
    try {
      pose = await initPose();
      pose.onResults((results) => {
        // Pass both 2D image landmarks (for drawing) and metric 3D world
        // landmarks (for accurate backend angles). World landmarks may be absent
        // on some devices — callers fall back to 2D.
        onPoseLandmarks(results.poseLandmarks || null, results.poseWorldLandmarks || null);
      });
      initialized = true;
      console.log('MediaPipe Pose initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MediaPipe Pose:', error);
    }
  };

  const processFrame = async () => {
    if (stopped) return;

    if (initialized && pose && videoElement.readyState >= 2) {
      try {
        await pose.send({ image: videoElement });
      } catch {
        // Silently handle frame processing errors
      }
    }

    frameId = window.requestAnimationFrame(processFrame);
  };

  const start = async () => {
    if (!initialized) {
      await init();
    }
    if (frameId === null) {
      stopped = false;
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
