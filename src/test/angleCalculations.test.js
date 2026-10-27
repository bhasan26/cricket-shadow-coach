import { describe, expect, it } from 'vitest';
import { calculateAngleJS, calculateSpineTiltJS } from '../drawSkeleton';
import { appendRecordingFrame } from '../recording';

describe('camera geometry and recording timing', () => {
  it.each([[1000, 1000], [1280, 720], [720, 1280]])('measures the same pixel-space 45-degree angle at %ix%i', (width, height) => {
    const a = { x: 100 / width, y: 100 / height, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: 100 / width, y: 0, z: 0 };
    expect(calculateAngleJS(a, b, c, height / width)).toBe(45);
  });

  it('distinguishes a real zero-degree angle from missing or degenerate geometry', () => {
    const p = { x: 1, y: 0, z: 0 }, origin = { x: 0, y: 0, z: 0 };
    expect(calculateAngleJS(p, origin, p)).toBe(0);
    expect(calculateAngleJS(origin, origin, p)).toBeNull();
    expect(calculateAngleJS({ ...p, visibility: 0 }, origin, p)).toBeNull();
  });

  it('reports a tracked upright torso as zero tilt and an unseen one as unavailable', () => {
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.8, z: 0, visibility: 1 }));
    landmarks[11].y = 0.2;
    landmarks[12].y = 0.2;
    expect(calculateSpineTiltJS(landmarks, 720 / 1280)).toBe(0);
    landmarks[11].visibility = 0;
    expect(calculateSpineTiltJS(landmarks, 720 / 1280)).toBeNull();
  });

  it('retains wholly missing poses as untracked frames with monotonic timestamps', () => {
    const frames = [];
    appendRecordingFrame(frames, null, null, 100);
    appendRecordingFrame(frames, null, null, 100);
    expect(frames).toHaveLength(2);
    expect(frames[0].landmarks).toHaveLength(33);
    expect(frames[0].landmarks.every(point => point.visibility === 0)).toBe(true);
    expect(frames[1].timestamp).toBeGreaterThan(frames[0].timestamp);
  });
});
