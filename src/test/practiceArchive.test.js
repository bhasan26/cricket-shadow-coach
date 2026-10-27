import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { archiveCompletedPractice, filterPractices, MAX_SAVED_PRACTICES, PRACTICE_ARCHIVE_KEY, readCompletedPractices } from '../practiceArchive';
import { PRACTICE_STORAGE_KEY } from '../practiceSession';
import { completedPractice } from './practiceFixtures';

beforeEach(() => {
  const values = new Map();
  vi.stubGlobal('localStorage', { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) });
});
afterEach(() => vi.unstubAllGlobals());

describe('completed practice archive', () => {
  it('retains earlier comparisons after a new practice replaces the current one', () => {
    archiveCompletedPractice(completedPractice({ id: 'first', completedAt: 100 }));
    archiveCompletedPractice(completedPractice({ id: 'second', completedAt: 200 }));
    localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify({ stage: 'baseline' }));
    expect(readCompletedPractices().map(session => session.id)).toEqual(['second', 'first']);
  });

  it('deduplicates a completed practice on repeated saves', () => {
    const practice = completedPractice();
    archiveCompletedPractice(practice);
    archiveCompletedPractice(practice);
    expect(readCompletedPractices()).toHaveLength(1);
  });

  it('preserves a legacy completed session without writing storage during reads', () => {
    localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(completedPractice()));
    expect(readCompletedPractices()).toHaveLength(1);
    expect(localStorage.getItem(PRACTICE_ARCHIVE_KEY)).toBeNull();
  });

  it('keeps only the latest fifty practices', () => {
    const sessions = Array.from({ length: 55 }, (_, i) => completedPractice({ id: `practice-${i}`, completedAt: i + 1 }));
    localStorage.setItem(PRACTICE_ARCHIVE_KEY, JSON.stringify(sessions));
    const saved = readCompletedPractices();
    expect(saved).toHaveLength(MAX_SAVED_PRACTICES);
    expect(saved[0].id).toBe('practice-54');
    expect(saved.at(-1).id).toBe('practice-5');
  });

  it('ignores incomplete and corrupt entries and strips unrelated data', () => {
    localStorage.setItem(PRACTICE_ARCHIVE_KEY, JSON.stringify([
      null, {}, { ...completedPractice(), stage: 'repeat' },
      { ...completedPractice(), frames: ['private'], baseline: completedPractice().baseline.map(rep => ({ ...rep, landmarks: ['private'] })) },
    ]));
    expect(readCompletedPractices()).toHaveLength(1);
    expect(JSON.stringify(readCompletedPractices())).not.toContain('private');
  });

  it('handles unavailable storage without blocking practice', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Full'); } });
    expect(readCompletedPractices()).toEqual([]);
    expect(archiveCompletedPractice(completedPractice())).toBe(false);
  });

  it('filters by both hand and selected camera', () => {
    const practices = [completedPractice(), completedPractice({ id: 'left', isRightHanded: false, facingMode: 'user' })];
    expect(filterPractices(practices, 'left', 'user').map(session => session.id)).toEqual(['left']);
    expect(filterPractices(practices, 'right', 'user')).toEqual([]);
  });
});
