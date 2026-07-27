import { describe, it, expect } from 'vitest';
import { repConsistency, standardDeviation, MIN_REPS_FOR_CONSISTENCY } from '../consistency';

const reps = (key, scores) => scores.map((score, i) => ({ key, score, timestamp: i }));

describe('standardDeviation', () => {
  it('is zero for identical values', () => {
    expect(standardDeviation([70, 70, 70])).toBe(0);
  });

  it('needs at least two values', () => {
    expect(standardDeviation([70])).toBe(0);
    expect(standardDeviation([])).toBe(0);
  });
});

describe('repConsistency', () => {
  it('separates a repeatable player from an erratic one at the same average', () => {
    // Both average 70 — only the steady player has a grooved shot.
    const steady = repConsistency(reps('cover_drive', [70, 70, 70, 70]), 'cover_drive');
    const erratic = repConsistency(reps('cover_drive', [95, 45, 90, 50]), 'cover_drive');
    expect(steady.consistency).toBe(100);
    expect(erratic.consistency).toBeLessThan(20);
    expect(steady.label).toBe('Grooved');
    expect(erratic.label).toBe('Erratic');
  });

  it('ignores reps of other drills', () => {
    // Wild pull-shot scores must not make the steady cover drive look erratic.
    const mixed = [
      ...reps('cover_drive', [80, 80, 80]),
      ...reps('pull_shot', [10, 100, 20]),
    ];
    expect(repConsistency(mixed, 'cover_drive').consistency).toBe(100);
  });

  it('returns null below the minimum rep count', () => {
    const scores = Array(MIN_REPS_FOR_CONSISTENCY - 1).fill(70);
    expect(repConsistency(reps('cover_drive', scores), 'cover_drive')).toBeNull();
    expect(repConsistency([], 'cover_drive')).toBeNull();
    expect(repConsistency(null, 'cover_drive')).toBeNull();
  });

  it('reports the spread and rep count it used', () => {
    const result = repConsistency(reps('cover_drive', [60, 70, 80]), 'cover_drive');
    expect(result.reps).toBe(3);
    expect(result.spread).toBeCloseTo(8.2, 1);
  });

  it('only counts recent reps, so improving does not read as inconsistent', () => {
    // 12 reps: long-ago scores of 10, recent steady 80s. Window is 10.
    const history = reps('cover_drive', [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 10, 10]);
    expect(repConsistency(history, 'cover_drive').consistency).toBe(100);
  });
});
