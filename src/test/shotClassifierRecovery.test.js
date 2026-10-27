import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyShot } from '../shotClassifier';

vi.mock('onnxruntime-web', () => ({
  env: { versions: {}, wasm: {} },
  InferenceSession: { create: () => new Promise(() => {}) },
}));

afterEach(() => vi.useRealTimers());

describe('optional shot verification', () => {
  it('skips a stalled experimental model instead of blocking the result', async () => {
    vi.useFakeTimers();
    const pending = classifyShot(Array.from({ length: 10 }, () => []));
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(pending).resolves.toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels verification promptly while the model is loading', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const pending = classifyShot(Array.from({ length: 10 }, () => []), { signal: controller.signal });
    controller.abort();
    await expect(pending).resolves.toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
