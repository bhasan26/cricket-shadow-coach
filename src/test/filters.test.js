import { describe, it, expect } from 'vitest';
import { OneEuroFilter, PoseSmoother } from '../filters';

const makeLandmarks = (jitter = 0, rand = Math.random) =>
  Array.from({ length: 33 }, (_, i) => ({
    x: i * 0.01 + (rand() - 0.5) * jitter,
    y: i * 0.02 + (rand() - 0.5) * jitter,
    z: 0 + (rand() - 0.5) * jitter,
    visibility: 0.9,
  }));

describe('OneEuroFilter', () => {
  it('reduces jitter on a static signal', () => {
    const f = new OneEuroFilter();
    const raw = [];
    const smoothed = [];
    for (let i = 0; i < 120; i++) {
      const v = 1.0 + Math.sin(i * 7.13) * 0.02; // ±0.02 jitter around 1.0
      raw.push(v);
      smoothed.push(f.filter(v, i * 33));
    }
    const variance = (a) => {
      const m = a.reduce((s, v) => s + v, 0) / a.length;
      return a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length;
    };
    // Ignore warm-up frames.
    expect(variance(smoothed.slice(30))).toBeLessThan(variance(raw.slice(30)) * 0.5);
  });

  it('tracks fast motion with bounded lag', () => {
    // A constant-velocity ramp has a fixed steady-state lag; with the default
    // params (minCutoff=1.0, beta=0.007, 30fps) that is ~0.23 units. The filter
    // must keep up (bounded lag), not fall progressively behind.
    const f = new OneEuroFilter();
    const lags = [];
    for (let i = 0; i < 90; i++) {
      const target = i * 0.05;
      lags.push(target - f.filter(target, i * 33));
    }
    expect(Math.abs(lags[89])).toBeLessThan(0.3);
    // Lag has converged: last two frames within a hair of each other.
    expect(Math.abs(lags[89] - lags[88])).toBeLessThan(0.005);
  });
});

describe('PoseSmoother', () => {
  it('returns same shape and passes visibility through', () => {
    const s = new PoseSmoother();
    const out = s.smooth(makeLandmarks(), 0);
    expect(out).toHaveLength(33);
    expect(out[5].visibility).toBe(0.9);
  });

  it('resets after a tracking gap instead of smoothing across it', () => {
    const s = new PoseSmoother();
    s.smooth(makeLandmarks(), 0);
    const jumped = makeLandmarks().map((lm) => ({ ...lm, x: lm.x + 5 }));
    // 2s gap — filters must reset, so the jumped position is taken as-is.
    const out = s.smooth(jumped, 2000);
    expect(out[10].x).toBeCloseTo(jumped[10].x, 6);
  });

  it('passes through malformed input unchanged', () => {
    const s = new PoseSmoother();
    expect(s.smooth(null, 0)).toBeNull();
    const short = [{ x: 1, y: 1, z: 1 }];
    expect(s.smooth(short, 0)).toBe(short);
  });
});
