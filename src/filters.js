/**
 * One Euro filter for pose landmark smoothing.
 *
 * Raw MediaPipe world landmarks jitter a few degrees frame-to-frame, which
 * inflates motion/jerkiness metrics and the min/max elbow extension used by
 * the bowling legality screen. The One Euro filter (Casiez et al., CHI 2012)
 * is the standard choice for pose tracking: heavy smoothing at low speeds,
 * minimal lag during fast movement.
 */

const TWO_PI = 2 * Math.PI;

class LowPassFilter {
  constructor() {
    this.initialized = false;
    this.prev = 0;
  }

  filter(value, alpha) {
    if (!this.initialized) {
      this.initialized = true;
      this.prev = value;
      return value;
    }
    this.prev = alpha * value + (1 - alpha) * this.prev;
    return this.prev;
  }

  reset() {
    this.initialized = false;
  }
}

class OneEuroFilter {
  /**
   * @param {number} minCutoff Minimum cutoff frequency (Hz). Lower = smoother at rest.
   * @param {number} beta Speed coefficient. Higher = less lag during fast motion.
   * @param {number} dCutoff Cutoff for the derivative estimate (Hz).
   */
  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.x = new LowPassFilter();
    this.dx = new LowPassFilter();
    this.lastTime = null;
  }

  static alpha(cutoff, dt) {
    const tau = 1 / (TWO_PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(value, timestampMs) {
    if (this.lastTime === null) {
      this.lastTime = timestampMs;
      this.dx.filter(0, 1);
      return this.x.filter(value, 1);
    }
    const dt = Math.max((timestampMs - this.lastTime) / 1000, 1e-3);
    this.lastTime = timestampMs;

    const dxRaw = (value - this.x.prev) / dt;
    const dxHat = this.dx.filter(dxRaw, OneEuroFilter.alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    return this.x.filter(value, OneEuroFilter.alpha(cutoff, dt));
  }

  reset() {
    this.x.reset();
    this.dx.reset();
    this.lastTime = null;
  }
}

const LANDMARK_COUNT = 33;
const AXES = ['x', 'y', 'z'];
// A gap longer than this between frames means tracking was lost — restart the
// filters rather than smoothing across the discontinuity.
const RESET_GAP_MS = 500;

/**
 * Smooths a full 33-landmark pose stream, one One Euro filter per landmark
 * per axis. Visibility is passed through untouched (it gates angle math
 * server-side and must not be low-passed).
 */
export class PoseSmoother {
  constructor(minCutoff = 1.0, beta = 0.007) {
    this.filters = Array.from({ length: LANDMARK_COUNT }, () =>
      AXES.map(() => new OneEuroFilter(minCutoff, beta))
    );
    this.lastTimestamp = null;
  }

  /**
   * @param {Array<{x,y,z,visibility}>} landmarks 33 landmarks for one frame.
   * @param {number} timestampMs Monotonic frame timestamp in milliseconds.
   * @returns New array of smoothed landmark objects (input is not mutated).
   */
  smooth(landmarks, timestampMs) {
    if (!landmarks || landmarks.length !== LANDMARK_COUNT) return landmarks;

    if (this.lastTimestamp !== null && timestampMs - this.lastTimestamp > RESET_GAP_MS) {
      this.reset();
    }
    this.lastTimestamp = timestampMs;

    return landmarks.map((lm, i) => ({
      x: this.filters[i][0].filter(lm.x, timestampMs),
      y: this.filters[i][1].filter(lm.y, timestampMs),
      z: this.filters[i][2].filter(lm.z, timestampMs),
      visibility: lm.visibility === undefined ? 1.0 : lm.visibility,
    }));
  }

  reset() {
    for (const perLandmark of this.filters) {
      for (const f of perLandmark) f.reset();
    }
    this.lastTimestamp = null;
  }
}

export { OneEuroFilter };
