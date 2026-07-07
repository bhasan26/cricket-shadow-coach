/**
 * In-browser shot classifier over MediaPipe world-landmark sequences.
 *
 * EXPERIMENTAL — the current model tests at 62.6% over 5 classes (gate for
 * default-on is 80%), so it only runs when enabled via ?experimental=1 or
 * localStorage 'shadow_experimental' = '1'. Used as a second opinion
 * ("this looked more like a Pull Shot"), never as the score.
 *
 * The preprocessing here is a faithful port of api/train_landmark_classifier.py
 * (`preprocess`): Savitzky-Golay smoothing (window 7, polyorder 2, scipy
 * 'interp' edge handling — verified to 1e-15 against scipy), hip-center +
 * torso-scale normalization, linear resample to 48 frames, feature-major
 * layout (99 x 48). Change them together or accuracy silently degrades.
 */

const SEQ_LEN = 48;
const N_LANDMARKS = 33;
const N_FEATURES = N_LANDMARKS * 3;
const MODEL_URL = '/models/shot_classifier.onnx';
const ORT_VERSION = '1.23.2';

// Model class order (alphabetical training folders) -> app shot types.
const CLASS_NAMES = ['cover', 'defense', 'flick', 'pull', 'straight'];
const CLASS_TO_SHOT = {
  cover: 'cover_drive',
  defense: 'defensive_block',
  flick: 'flick_shot',
  pull: 'pull_shot',
  straight: 'straight_drive',
};

// Savitzky-Golay (window 7, polyorder 2). Interior = convolution kernel;
// first/last 3 samples use the quadratic-fit edge rows (scipy mode='interp').
const SG_KERNEL = [-2 / 21, 3 / 21, 6 / 21, 7 / 21, 6 / 21, 3 / 21, -2 / 21];
const SG_EDGE = [
  [0.7619047619, 0.3571428571, 0.0714285714, -0.0952380952, -0.1428571429, -0.0714285714, 0.119047619],
  [0.3571428571, 0.2857142857, 0.2142857143, 0.1428571429, 0.0714285714, 0.0, -0.0714285714],
  [0.0714285714, 0.2142857143, 0.2857142857, 0.2857142857, 0.2142857143, 0.0714285714, -0.1428571429],
];

export const isExperimentalEnabled = () => {
  try {
    return (
      new URLSearchParams(window.location.search).get('experimental') === '1' ||
      localStorage.getItem('shadow_experimental') === '1'
    );
  } catch {
    return false;
  }
};

// Smooth one scalar series in place-safe fashion (returns a new array).
export const savgol = (values) => {
  const n = values.length;
  if (n < 7) return values.slice();
  const out = new Array(n);
  for (let i = 3; i < n - 3; i++) {
    let s = 0;
    for (let k = 0; k < 7; k++) s += SG_KERNEL[k] * values[i - 3 + k];
    out[i] = s;
  }
  for (let e = 0; e < 3; e++) {
    let head = 0, tail = 0;
    for (let k = 0; k < 7; k++) {
      head += SG_EDGE[e][k] * values[k];
      tail += SG_EDGE[e][k] * values[n - 1 - k];
    }
    out[e] = head;
    out[n - 1 - e] = tail;
  }
  return out;
};

// (T, 33, {x,y,z}) world frames -> Float32Array laid out (99 features, 48 frames).
export const preprocess = (frames) => {
  const T = frames.length;
  // 1. Savitzky-Golay per landmark per axis over time.
  const smoothed = Array.from({ length: T }, () => new Array(N_FEATURES));
  for (let l = 0; l < N_LANDMARKS; l++) {
    for (const [a, axis] of ['x', 'y', 'z'].entries()) {
      const series = savgol(frames.map((f) => f[l][axis]));
      for (let t = 0; t < T; t++) smoothed[t][l * 3 + a] = series[t];
    }
  }
  // 2. Normalize each frame: center on hip midpoint, scale by torso length.
  for (let t = 0; t < T; t++) {
    const f = smoothed[t];
    const hip = [0, 0, 0];
    const sho = [0, 0, 0];
    for (let a = 0; a < 3; a++) {
      hip[a] = (f[23 * 3 + a] + f[24 * 3 + a]) / 2;
      sho[a] = (f[11 * 3 + a] + f[12 * 3 + a]) / 2;
    }
    let torso = Math.hypot(sho[0] - hip[0], sho[1] - hip[1], sho[2] - hip[2]);
    if (torso < 1e-6) torso = 1.0;
    for (let l = 0; l < N_LANDMARKS; l++) {
      for (let a = 0; a < 3; a++) {
        f[l * 3 + a] = (f[l * 3 + a] - hip[a]) / torso;
      }
    }
  }
  // 3. Linear resample to SEQ_LEN frames, feature-major output (99, 48).
  const out = new Float32Array(N_FEATURES * SEQ_LEN);
  for (let j = 0; j < SEQ_LEN; j++) {
    const pos = (j / (SEQ_LEN - 1)) * (T - 1);
    const i0 = Math.floor(pos);
    const i1 = Math.min(T - 1, i0 + 1);
    const w = pos - i0;
    for (let fIdx = 0; fIdx < N_FEATURES; fIdx++) {
      out[fIdx * SEQ_LEN + j] = smoothed[i0][fIdx] * (1 - w) + smoothed[i1][fIdx] * w;
    }
  }
  return out;
};

let sessionPromise = null;

const getSession = () => {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import('onnxruntime-web');
      // Load the WASM backend from the CDN (same pattern as MediaPipe assets)
      // so the app bundle stays small.
      ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
      const session = await ort.InferenceSession.create(MODEL_URL);
      return { ort, session };
    })();
  }
  return sessionPromise;
};

/**
 * Classify a recorded world-landmark sequence.
 * @param {Array<Array<{x,y,z}>>} worldFrames one 33-landmark frame per entry.
 * @returns {Promise<{shotType, label, confidence}|null>} null when unusable.
 */
export async function classifyShot(worldFrames) {
  if (!worldFrames || worldFrames.length < 10) return null;
  try {
    const { ort, session } = await getSession();
    const input = new ort.Tensor('float32', preprocess(worldFrames), [1, N_FEATURES, SEQ_LEN]);
    const { logits } = await session.run({ landmarks: input });
    const raw = Array.from(logits.data);
    const max = Math.max(...raw);
    const exps = raw.map((v) => Math.exp(v - max));
    const sum = exps.reduce((s, v) => s + v, 0);
    const probs = exps.map((v) => v / sum);
    const best = probs.indexOf(Math.max(...probs));
    return {
      label: CLASS_NAMES[best],
      shotType: CLASS_TO_SHOT[CLASS_NAMES[best]],
      confidence: probs[best],
    };
  } catch (err) {
    console.warn('Shot classifier unavailable:', err);
    return null;
  }
}
