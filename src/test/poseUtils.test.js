import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
});

afterEach(() => {
  delete window.Pose;
  document.querySelectorAll('script[src*="@mediapipe/pose"]').forEach(script => script.remove());
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function workingPose(initialize = vi.fn().mockResolvedValue()) {
  const model = { initialize, setOptions: vi.fn(), onResults: vi.fn(), close: vi.fn().mockResolvedValue() };
  window.Pose = class { constructor() { return model; } };
  return model;
}

describe('pose initialization', () => {
  it('reports a failed script load and allows another attempt', async () => {
    const { createPoseDetector } = await import('../poseUtils');
    const detector = createPoseDetector(document.createElement('video'), vi.fn());
    const failure = expect(detector.start()).rejects.toThrow('Could not load movement tracking');
    document.querySelector('script[src*="@mediapipe/pose"]').dispatchEvent(new Event('error'));
    await failure;
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(document.querySelector('script[src*="@mediapipe/pose"]')).toBeNull();

    const model = workingPose();
    await detector.start();
    expect(model.initialize).toHaveBeenCalledOnce();
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce();
    detector.destroy();
  });

  it('waits for model initialization and propagates WASM/model failures', async () => {
    const model = workingPose(vi.fn().mockRejectedValue(new Error('Model download failed')));
    const { createPoseDetector } = await import('../poseUtils');
    const detector = createPoseDetector(document.createElement('video'), vi.fn());
    await expect(detector.start()).rejects.toThrow('Model download failed');
    expect(model.close).toHaveBeenCalledOnce();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();

    model.initialize.mockResolvedValue();
    await detector.start();
    expect(window.requestAnimationFrame).toHaveBeenCalledOnce();
    detector.destroy();
  });

  it('does not start processing after being destroyed during loading', async () => {
    let finish;
    const model = workingPose(() => new Promise(resolve => { finish = resolve; }));
    const { createPoseDetector } = await import('../poseUtils');
    const detector = createPoseDetector(document.createElement('video'), vi.fn());
    const starting = detector.start();
    await Promise.resolve();
    detector.destroy();
    finish();
    await starting;
    expect(model.onResults).not.toHaveBeenCalled();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('bounds loading even when model initialization and cleanup both stall', async () => {
    vi.useFakeTimers();
    const model = workingPose(() => new Promise(() => {}));
    model.close.mockImplementation(() => new Promise(() => {}));
    const { createPoseDetector } = await import('../poseUtils');
    const detector = createPoseDetector(document.createElement('video'), vi.fn());
    const failure = expect(detector.start()).rejects.toThrow('took too long');
    await vi.advanceTimersByTimeAsync(20_000);
    await failure;
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});
