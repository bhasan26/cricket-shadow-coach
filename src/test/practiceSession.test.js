import { afterEach, describe, expect, it, vi } from 'vitest';
import { choosePracticeFocus, getPracticeSummary, loadPracticeSession, PRACTICE_STORAGE_KEY, practiceReducer, summarizeSet } from '../practiceSession';

const result = {
  shot_type: 'cover_drive', score: 65, tracking_quality: 95,
  angle_scores: { left_elbow: 60, right_elbow: 70, left_knee: 75, right_knee: 80,
    backswing_phase: 45, impact_phase: 80, follow_through_phase: 90 },
};
const start = () => practiceReducer(null, { type: 'start', id: 'session-1', now: 100, isRightHanded: true, facingMode: 'environment' });
const record = (session, id, response = result, context = {}) => practiceReducer(session, {
  type: 'result', result: response, now: 200,
  attempt: { id, practiceId: session.id, practiceStage: session.stage, ...context },
});
const fillSet = session => Array.from({ length: 5 }, (_, i) => `${session.stage}-${i}`).reduce((current, id) => record(current, id), session);

afterEach(() => vi.unstubAllGlobals());

describe('guided practice', () => {
  it('pauses at five, selects one measured focus, and completes only after a second set', () => {
    const review = fillSet(start());
    expect(review.stage).toBe('review');
    expect(review.focus.key).toBe('backswing_phase');
    expect(record(review, 'extra')).toBe(review);
    const repeat = practiceReducer(review, { type: 'beginRepeat' });
    const complete = fillSet(repeat);
    expect(complete.stage).toBe('complete');
    expect(complete.baseline).toHaveLength(5);
    expect(complete.repeat).toHaveLength(5);
    expect(record(complete, 'eleventh')).toBe(complete);
  });

  it.each([
    { ...result, tracking_quality: 30 },
    { ...result, confidence: 'low' },
    { ...result, score: NaN },
    { ...result, angle_scores: {} },
    { ...result, shot_match: { confident: true, best: 'pull_shot' } },
  ])('does not advance for uncertain, invalid, incomplete, or mismatched attempts', response => {
    const session = record(start(), 'rep-1', response);
    expect(session.baseline).toHaveLength(0);
    expect(session.notice).not.toBe('');
  });

  it('counts a well-tracked low-scoring stroke so the baseline is not biased toward good scores', () => {
    expect(record(start(), 'rep-1', { ...result, score: 20 }).baseline).toHaveLength(1);
  });

  it('ignores duplicate responses and attempts from another session or set', () => {
    const session = record(start(), 'rep-1');
    expect(record(session, 'rep-1')).toBe(session);
    expect(record(session, 'late', result, { practiceId: 'old-session' })).toBe(session);
    expect(record(session, 'late', result, { practiceStage: 'repeat' })).toBe(session);
  });

  it('does not combine old and corrected scoring methods in one comparison', () => {
    const session = record(start(), 'rep-1', { ...result, scoring_version: '2' });
    const next = record(session, 'rep-2', result);
    expect(next.baseline).toHaveLength(1);
    expect(next.notice).toContain('scoring method changed');
  });

  it('falls back to a general rhythm cue when phase segmentation is incomplete', () => {
    const review = fillSet(start());
    const reps = review.baseline.map((rep, index) => index === 0 ? { ...rep, phases: {} } : rep);
    expect(choosePracticeFocus(reps).key).toBe('rhythm');
  });

  it('compares averages and score spread without claiming a percentage of skill improvement', () => {
    expect(summarizeSet([{ score: 50 }, { score: 70 }])).toEqual({ average: 60, spread: 10, count: 2 });
    expect(summarizeSet([])).toBeNull();
  });

  it('restores progress with the same setup and recomputes the cue', () => {
    const session = fillSet(start());
    vi.stubGlobal('localStorage', { getItem: key => key === PRACTICE_STORAGE_KEY ? JSON.stringify({ ...session, focus: { cue: 'untrusted saved cue' } }) : null });
    const restored = loadPracticeSession();
    expect(restored.stage).toBe('review');
    expect(restored.focus.key).toBe('backswing_phase');
    expect(restored.focus.cue).not.toBe('untrusted saved cue');
  });

  it('exports only practice summaries even if other fields are present in memory', () => {
    const review = fillSet(start());
    const complete = fillSet(practiceReducer(review, { type: 'beginRepeat' }));
    const summary = getPracticeSummary({ ...complete, frames: ['private'], baseline: complete.baseline.map(rep => ({ ...rep, frames: ['private'] })) });
    expect(summary.firstSet.average).toBe(65);
    expect(summary.secondSet.attempts).toHaveLength(5);
    expect(JSON.stringify(summary)).not.toContain('private');
    expect(summary.setup.isRightHanded).toBe(true);
  });

  it.each(['null', '{bad json', JSON.stringify({ ...start(), stage: 'complete' }), JSON.stringify({ ...start(), baseline: [null] })])('ignores corrupt or inconsistent saved state', value => {
    vi.stubGlobal('localStorage', { getItem: () => value });
    expect(loadPracticeSession()).toBeNull();
  });
});
