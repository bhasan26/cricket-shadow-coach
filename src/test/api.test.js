import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeShotSequence, ANALYSIS_TIMEOUT_MS, checkContactAvailability, sendContactMessage } from '../api';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stalledFetch() {
  vi.stubGlobal('fetch', vi.fn((_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  })));
}

describe('contact requests', () => {
  const payload = { name: 'Visitor', email: 'visitor@example.com', message: 'Thanks for the coaching tool.' };
  const send = () => sendContactMessage(payload, new AbortController().signal);

  it('only clears the draft for a valid acceptance response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 202, json: async () => ({ message: 'Accepted for delivery' }) })));
    await expect(send()).resolves.toEqual({ message: 'Accepted for delivery' });
    expect(fetch.mock.calls[0][1].body).toBe(JSON.stringify(payload));
  });

  it('does not mistake the SPA fallback for successful delivery', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('HTML'); } })));
    await expect(send()).rejects.toThrow('could not confirm delivery');
  });

  it('provides readable validation and rate-limit failures', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ detail: [{ msg: 'Invalid' }] }) })
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ detail: 'Too many messages. Please wait ten minutes.' }) }));
    await expect(send()).rejects.toThrow('Please check your name, email, and message');
    await expect(send()).rejects.toThrow('Please wait ten minutes');
  });

  it('bounds a stalled send without claiming that delivery failed', async () => {
    vi.useFakeTimers();
    stalledFetch();
    const failure = expect(send()).rejects.toThrow('could not confirm delivery');
    await vi.advanceTimersByTimeAsync(30_000);
    await failure;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels an in-flight wait and removes its timeout', async () => {
    vi.useFakeTimers();
    stalledFetch();
    const controller = new AbortController();
    const failure = expect(sendContactMessage(payload, controller.signal)).rejects.toThrow('Aborted');
    controller.abort();
    await failure;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports unavailable when configuration checking fails or times out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Offline'); }));
    await expect(checkContactAvailability()).resolves.toBe(false);
    vi.useFakeTimers();
    stalledFetch();
    const availability = checkContactAvailability();
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(availability).resolves.toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});

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
