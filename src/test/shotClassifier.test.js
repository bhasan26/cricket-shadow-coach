import { describe, it, expect } from 'vitest';
import { savgol, preprocess } from '../shotClassifier';

const SEQ_LEN = 48;
const N_FEATURES = 99;

describe('savgol', () => {
  it('matches scipy savgol_filter(window=7, polyorder=2)', () => {
    // Reference values computed with scipy on [0,1,4,9,16,25,36,49,64,81]
    // (x², a quadratic — the polyorder-2 filter must reproduce it exactly).
    const quad = Array.from({ length: 10 }, (_, i) => i * i);
    const out = savgol(quad);
    for (let i = 0; i < 10; i++) expect(out[i]).toBeCloseTo(quad[i], 8);
  });

  it('reduces noise on a flat series', () => {
    const noisy = Array.from({ length: 40 }, (_, i) => 5 + Math.sin(i * 9.7) * 0.5);
    const out = savgol(noisy);
    const variance = (a) => {
      const m = a.reduce((s, v) => s + v, 0) / a.length;
      return a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length;
    };
    expect(variance(out)).toBeLessThan(variance(noisy) * 0.6);
  });

  it('passes short series through unchanged', () => {
    expect(savgol([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

const randomFrames = (T, rand) =>
  Array.from({ length: T }, () =>
    Array.from({ length: 33 }, () => ({ x: rand(), y: rand(), z: rand() }))
  );

// Deterministic PRNG so failures reproduce.
const mulberry32 = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('preprocess', () => {
  it('outputs feature-major (99 x 48) float32 with finite values', () => {
    const out = preprocess(randomFrames(30, mulberry32(7)));
    expect(out).toBeInstanceOf(Float32Array);
    expect(out.length).toBe(N_FEATURES * SEQ_LEN);
    for (const v of out) expect(Number.isFinite(v)).toBe(true);
  });

  it('is invariant to global translation (hip centering)', () => {
    const frames = randomFrames(30, mulberry32(11));
    const shifted = frames.map((f) =>
      f.map((lm) => ({ x: lm.x + 3.7, y: lm.y - 1.2, z: lm.z + 0.5 }))
    );
    const a = preprocess(frames);
    const b = preprocess(shifted);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBeCloseTo(a[i], 4);
  });

  it('is invariant to uniform scale (torso normalization)', () => {
    const frames = randomFrames(30, mulberry32(13));
    const scaled = frames.map((f) =>
      f.map((lm) => ({ x: lm.x * 2.5, y: lm.y * 2.5, z: lm.z * 2.5 }))
    );
    const a = preprocess(frames);
    const b = preprocess(scaled);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBeCloseTo(a[i], 4);
  });
});
