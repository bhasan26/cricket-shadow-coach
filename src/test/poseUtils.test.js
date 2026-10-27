import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  delete window.Pose;
  document.querySelectorAll('script[src*="@mediapipe/pose"]').forEach(script => script.remove());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const model = workingPose(() => new Promise(() => {}));
    model.close.mockImplementation(() => new Promise(() => {}));
    const { createPoseDetector } = await import('../poseUtils');
    const detector = createPoseDetector(document.createElement('video'), vi.fn());
    const failure = expect(detector.start()).rejects.toThrow('took too long');
    await vi.advanceTimersByTimeAsync(20_000);
    await failure;
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('stops repeated frame-processing failures and rebuilds the model on retry', async () => {
    const model = workingPose();
    model.send = vi.fn().mockRejectedValue(new Error('WebGL failed'));
    const video = document.createElement('video');
    Object.defineProperty(video, 'readyState', { value: 2 });
    const onError = vi.fn(), onPose = vi.fn();
    const { createPoseDetector } = await import('../poseUtils');
    const detector = createPoseDetector(video, onPose, { onError });
    await detector.start();
    for (let i = 0; i < 3; i++) await window.requestAnimationFrame.mock.calls.at(-1)[0]();
    expect(onError).toHaveBeenCalledOnce();
    expect(onPose.mock.calls).toEqual([[null, null], [null, null], [null, null]]);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(3);
    expect(model.close).toHaveBeenCalledOnce();
    model.send.mockResolvedValue();
    const retry = createPoseDetector(video, onPose, { onError });
    await retry.start();
    expect(model.initialize).toHaveBeenCalledTimes(2);
    await window.requestAnimationFrame.mock.calls.at(-1)[0]();
    expect(onError).toHaveBeenCalledOnce();
    detector.destroy();
    retry.destroy();
  });

  it('recovers from isolated frame errors without stopping a usable detector', async () => {
    const model = workingPose();
    model.send = vi.fn().mockRejectedValueOnce(new Error('Transient')).mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('Transient')).mockResolvedValue();
    const video = document.createElement('video');
    Object.defineProperty(video, 'readyState', { value: 2 });
    const onError = vi.fn();
    const { createPoseDetector } = await import('../poseUtils');
    const detector = createPoseDetector(video, vi.fn(), { onError });
    await detector.start();
    for (let i = 0; i < 4; i++) await window.requestAnimationFrame.mock.calls.at(-1)[0]();
    expect(onError).not.toHaveBeenCalled();
    expect(model.close).not.toHaveBeenCalled();
    detector.destroy();
  });
});
