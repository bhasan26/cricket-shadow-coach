import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeShotSequence, ANALYSIS_TIMEOUT_MS } from '../api';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stalledFetch() {
  vi.stubGlobal('fetch', vi.fn((_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  })));
}

describe('analysis requests', () => {
  it('times out instead of leaving analysis pending indefinitely', async () => {
    vi.useFakeTimers();
    stalledFetch();
    const failure = expect(analyzeShotSequence([])).rejects.toThrow('took too long');
    await vi.advanceTimersByTimeAsync(ANALYSIS_TIMEOUT_MS);
    await failure;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels an in-flight attempt and clears its timeout', async () => {
    vi.useFakeTimers();
    stalledFetch();
    const controller = new AbortController();
    const failure = expect(analyzeShotSequence([], 'cover_drive', null, true, { signal: controller.signal }))
      .rejects.toThrow('cancelled');
    controller.abort();
    await failure;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the timeout active while reading the response body', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async (_, { signal }) => ({
      ok: true,
      json: () => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
    })));
    const failure = expect(analyzeShotSequence([])).rejects.toThrow('took too long');
    await vi.advanceTimersByTimeAsync(ANALYSIS_TIMEOUT_MS);
    await failure;
  });

  it('shows readable validation errors instead of Pydantic error arrays', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 422, json: async () => ({ detail: [{ msg: 'bad frame' }] }) })));
    await expect(analyzeShotSequence([])).rejects.toThrow('Could not read your pose data');
  });
});
