import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CameraFeed from '../CameraFeed';
import { createPoseDetector } from '../poseUtils';
import { analyzeShotSequence, checkAPIHealth, fetchShots } from '../api';
import { MAX_RECORDING_FRAMES, MAX_RECORDING_MS } from '../recording';
import { PRACTICE_STORAGE_KEY } from '../practiceSession';
import { PRACTICE_ARCHIVE_KEY } from '../practiceArchive';

vi.mock('../poseUtils', () => ({ createPoseDetector: vi.fn() }));
vi.mock('../api', () => ({ analyzeShotSequence: vi.fn(), checkAPIHealth: vi.fn(), fetchShots: vi.fn() }));
vi.mock('../drawSkeleton', () => ({ drawSkeleton: vi.fn(), calculateAngleJS: () => 140, calculateSpineTiltJS: () => 10 }));
vi.mock('../audioCoaching', () => ({
  speakCoachingCue: vi.fn(), playCountdownStep: vi.fn(), playAutoStartSound: vi.fn(),
  playAutoStopSound: vi.fn(), unlockMobileAudio: vi.fn(),
}));

let onPose;
let onTrackingError;
let detector;
const frame = () => Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0 }));
const result = { score: 80, feedback: 'Practice complete', shot_name: 'Cover Drive', shot_type: 'cover_drive', is_good_shot: true, angle_scores: {}, tracking_quality: 100 };
const guidedResult = { ...result, score: 60, angle_scores: {
  left_elbow: 60, right_elbow: 70, left_knee: 75, right_knee: 80,
  backswing_phase: 45, impact_phase: 80, follow_through_phase: 90,
} };

beforeEach(() => {
  vi.useFakeTimers();
  const storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
    clear: () => storage.clear(),
  });
  checkAPIHealth.mockResolvedValue(true);
  fetchShots.mockResolvedValue(null);
  analyzeShotSequence.mockReset().mockResolvedValue(result);
  detector = { start: vi.fn().mockResolvedValue(), destroy: vi.fn() };
  createPoseDetector.mockImplementation((video, callback, options) => {
    onPose = callback;
    onTrackingError = options.onError;
    return detector;
  });
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
  } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect() {}, beginPath() {}, arc() {}, fill() {}, stroke() {},
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

async function openCamera() {
  render(<MemoryRouter><HelmetProvider><CameraFeed /></HelmetProvider></MemoryRouter>);
  await act(async () => {});
  const video = document.querySelector('video');
  Object.defineProperties(video, { videoWidth: { value: 1280 }, videoHeight: { value: 720 } });
  fireEvent.loadedMetadata(video);
  await act(async () => {});
}

async function recordOneFrame() {
  fireEvent.click(screen.getByRole('button', { name: 'Start Practice' }));
  act(() => onPose(frame(), null));
  fireEvent.click(screen.getByRole('button', { name: 'Stop & Analyze Action' }));
  await act(async () => {});
}

async function recordGuidedAttempt(number) {
  fireEvent.click(screen.getByRole('button', { name: `Record attempt ${number}` }));
  act(() => onPose(frame(), null));
  fireEvent.click(screen.getByRole('button', { name: 'Finish this attempt' }));
  await act(async () => {});
}

describe('practice recording and recovery', () => {
  it('keeps the bowling arm separate from the batting hand in requests and saved preferences', async () => {
    await openCamera();
    fireEvent.click(screen.getByRole('button', { name: 'Left-Handed' }));
    fireEvent.click(screen.getByRole('button', { name: /Bowling Action Check ICC/ }));
    expect(screen.getByRole('button', { name: 'Right Arm' })).toHaveAttribute('aria-pressed', 'true');
    analyzeShotSequence.mockResolvedValue({ ...result, shot_type: 'bowling_action', angle_scores: { bowling_arm_extension: 5 } });
    await recordOneFrame();
    expect(analyzeShotSequence.mock.calls[0][3]).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Left Arm' }));
    await recordOneFrame();
    expect(analyzeShotSequence.mock.calls[1][3]).toBe(false);
    expect(localStorage.getItem('shadow_is_right_handed')).toBe('false');
    expect(localStorage.getItem('shadow_bowling_right_arm')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: /Cover Drive Classic/ }));
    expect(screen.getByRole('button', { name: 'Left-Handed' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('discards a recording interrupted by runtime tracking failure and recovers without submitting it', async () => {
    await openCamera();
    fireEvent.click(screen.getByRole('button', { name: 'Start Practice' }));
    act(() => onPose(frame(), null));
    act(() => onTrackingError(new Error('Tracking runtime failed')));
    expect(analyzeShotSequence).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Movement tracking stopped');
    expect(screen.getByRole('button', { name: 'Stop & Analyze Action' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry tracking' }));
    await act(async () => {});
    await recordOneFrame();
    expect(analyzeShotSequence).toHaveBeenCalledOnce();
    expect(analyzeShotSequence.mock.calls[0][0]).toHaveLength(1);
  });

  it('stops exactly at the API frame limit and preserves zero visibility', async () => {
    await openCamera();
    fireEvent.click(screen.getByRole('button', { name: 'Start Practice' }));
    await act(async () => {
      for (let i = 0; i < MAX_RECORDING_FRAMES + 5; i++) onPose(frame(), null);
    });
    expect(analyzeShotSequence).toHaveBeenCalledOnce();
    const sequence = analyzeShotSequence.mock.calls[0][0];
    expect(sequence).toHaveLength(MAX_RECORDING_FRAMES);
    expect(sequence[0][0].visibility).toBe(0);
  });

  it('stops on elapsed time even when no more tracked frames arrive', async () => {
    await openCamera();
    fireEvent.click(screen.getByRole('button', { name: 'Start Practice' }));
    act(() => onPose(frame(), null));
    await act(async () => { await vi.advanceTimersByTimeAsync(MAX_RECORDING_MS); });
    expect(analyzeShotSequence).toHaveBeenCalledOnce();
    expect(analyzeShotSequence.mock.calls[0][0]).toHaveLength(1);
  });

  it('sends lost-pose frames, image geometry, and actual monotonic times to scoring', async () => {
    await openCamera();
    fireEvent.click(screen.getByRole('button', { name: 'Start Practice' }));
    act(() => { onPose(frame(), null); onPose(null, null); onPose(frame(), null); });
    fireEvent.click(screen.getByRole('button', { name: 'Stop & Analyze Action' }));
    await act(async () => {});
    const [sequence, , , , options] = analyzeShotSequence.mock.calls[0];
    expect(sequence).toHaveLength(3);
    expect(sequence[1].every(point => point.visibility === 0)).toBe(true);
    expect(options.imageWidth).toBe(1280);
    expect(options.imageHeight).toBe(720);
    expect(options.frameTimestamps).toHaveLength(3);
    expect(options.frameTimestamps[2]).toBeGreaterThan(options.frameTimestamps[1]);
  });

  it('retries the same captured attempt and original drill after a network failure', async () => {
    analyzeShotSequence.mockRejectedValueOnce(new Error('Connection lost. Retry this attempt.'));
    await openCamera();
    await recordOneFrame();
    expect(screen.getByText('Connection lost. Retry this attempt.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pull Shot Horizontal/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry Cover Drive analysis' }));
    await act(async () => {});
    expect(analyzeShotSequence).toHaveBeenCalledTimes(2);
    expect(analyzeShotSequence.mock.calls[1].slice(0, 4)).toEqual(analyzeShotSequence.mock.calls[0].slice(0, 4));
    expect(JSON.parse(localStorage.getItem('shadow_drills_history'))).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('shadow_drills_history'))[0].key).toBe('cover_drive');
  });

  it('cancels in-flight analysis while keeping the attempt for retry', async () => {
    analyzeShotSequence.mockImplementationOnce((sequence, shot, world, hand, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('Analysis cancelled. You can retry this attempt.')));
    }));
    await openCamera();
    await recordOneFrame();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel analysis' }));
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Retry Cover Drive analysis' })).toBeEnabled();
    expect(localStorage.getItem('shadow_drills_history')).toBeNull();
  });

  it('does not enable recording when the model fails, and offers a working retry', async () => {
    detector.start.mockRejectedValueOnce(new Error('Model unavailable'));
    await openCamera();
    expect(screen.getByRole('alert')).toHaveTextContent('Model unavailable');
    expect(screen.getByRole('button', { name: 'Waiting for tracking…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry tracking' }));
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Start Practice' })).toBeEnabled();
  });

  it('offers recovery after camera access is denied', async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
    render(<MemoryRouter><HelmetProvider><CameraFeed /></HelmetProvider></MemoryRouter>);
    await act(async () => {});
    expect(createPoseDetector).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Waiting for tracking…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry Camera' }));
    await act(async () => {});
    fireEvent.loadedMetadata(document.querySelector('video'));
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Start Practice' })).toBeEnabled();
  });

  it('asks for another recording instead of adding uncertain scores to history', async () => {
    analyzeShotSequence.mockResolvedValueOnce({ ...result, tracking_quality: 30, angle_scores: { left_elbow: 90 } });
    await openCamera();
    await recordOneFrame();
    expect(screen.getByText('RECORD AGAIN')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
    expect(localStorage.getItem('shadow_drills_history')).toBeNull();
  });
});

describe('guided cover-drive practice', () => {
  it('runs two five-rep sets with an explicit focus break and comparison', async () => {
    analyzeShotSequence.mockResolvedValue(guidedResult);
    await openCamera();
    fireEvent.click(screen.getByRole('button', { name: 'Start cover-drive practice' }));
    expect(screen.getByRole('button', { name: 'Left-Handed' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Pull Shot Horizontal/ })).toBeDisabled();
    for (let i = 1; i <= 5; i++) await recordGuidedAttempt(i);
    expect(screen.getByRole('heading', { name: 'Your practice focus' })).toBeInTheDocument();
    expect(screen.getByText('One focus · Backswing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue guided practice above' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Auto-record hands-free' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Start second set' }));
    analyzeShotSequence.mockResolvedValue({ ...guidedResult, score: 80 });
    for (let i = 1; i <= 5; i++) await recordGuidedAttempt(i);
    expect(screen.getByRole('heading', { name: 'Your set comparison' })).toBeInTheDocument();
    expect(screen.getByText('Average match rose by 20.0 points.')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(PRACTICE_STORAGE_KEY));
    expect(saved.stage).toBe('complete');
    expect(saved.baseline).toHaveLength(5);
    expect(saved.repeat).toHaveLength(5);
    expect(saved.baseline[0]).not.toHaveProperty('frames');
    expect(analyzeShotSequence).toHaveBeenCalledTimes(10);
    expect(screen.getByRole('link', { name: 'View practice progress' })).toHaveAttribute('href', '/progress');
    expect(JSON.parse(localStorage.getItem(PRACTICE_ARCHIVE_KEY))).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Practice another ten' }));
    expect(JSON.parse(localStorage.getItem(PRACTICE_ARCHIVE_KEY))).toHaveLength(1);
    expect(screen.getByRole('progressbar', { name: 'First set progress' })).toHaveAttribute('value', '0');
  });

  it('keeps the same rep number after a tracking failure or failed request, then counts one retry', async () => {
    await openCamera();
    fireEvent.click(screen.getByRole('button', { name: 'Start cover-drive practice' }));
    analyzeShotSequence.mockResolvedValueOnce({ ...guidedResult, tracking_quality: 30 });
    await recordGuidedAttempt(1);
    expect(screen.getByRole('progressbar', { name: 'First set progress' })).toHaveAttribute('value', '0');
    analyzeShotSequence.mockRejectedValueOnce(new Error('Connection lost'));
    await recordGuidedAttempt(1);
    expect(screen.getByRole('progressbar', { name: 'First set progress' })).toHaveAttribute('value', '0');
    analyzeShotSequence.mockResolvedValueOnce(guidedResult);
    fireEvent.click(screen.getByRole('button', { name: 'Retry saved attempt' }));
    await act(async () => {});
    expect(screen.getByRole('progressbar', { name: 'First set progress' })).toHaveAttribute('value', '1');
    expect(JSON.parse(localStorage.getItem('shadow_drills_history'))).toHaveLength(1);
  });

  it('resumes a partial session and releases the setup when returning to free practice', async () => {
    analyzeShotSequence.mockResolvedValue(guidedResult);
    await openCamera();
    fireEvent.click(screen.getByRole('button', { name: 'Left-Handed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start cover-drive practice' }));
    await recordGuidedAttempt(1);
    cleanup();
    await openCamera();
    expect(screen.getByText(/Practice restored/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'First set progress' })).toHaveAttribute('value', '1');
    await recordGuidedAttempt(2);
    expect(analyzeShotSequence.mock.calls[1][3]).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Return to free practice' }));
    expect(screen.getByRole('button', { name: /Pull Shot Horizontal/ })).toBeEnabled();
    expect(localStorage.getItem(PRACTICE_STORAGE_KEY)).toBeNull();
  });

  it('continues in memory and explains when browser storage cannot save progress', async () => {
    analyzeShotSequence.mockResolvedValue(guidedResult);
    await openCamera();
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    fireEvent.click(screen.getByRole('button', { name: 'Start cover-drive practice' }));
    expect(screen.getByText(/Browser storage is unavailable/)).toBeInTheDocument();
    await recordGuidedAttempt(1);
    expect(screen.getByRole('progressbar', { name: 'First set progress' })).toHaveAttribute('value', '1');
  });
});
