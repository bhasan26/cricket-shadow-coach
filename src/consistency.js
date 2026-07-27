/**
 * Rep-to-rep consistency over a drill's recent history.
 *
 * Average score says how good your best technique looks; consistency says
 * whether you can reproduce it. Those come apart in practice — a player
 * alternating 90 and 50 averages the same 70 as one scoring 70 every time, and
 * only the second has a repeatable shot. Coaches treat repeatability as the
 * real marker of a grooved technique, so it is worth surfacing separately.
 *
 * Consistency is derived from the population standard deviation of the recent
 * scores for ONE drill: reps of different shots aren't comparable, and mixing
 * them would report a spread that is really just drill switching.
 */

// Scores vary run to run even for a grooved shot; this is the spread (in score
// points) mapped to 0% consistency. 25 points is roughly the gap between a
// clean rep and a mistimed one.
const SPREAD_AT_ZERO = 25;

// Fewer reps than this and the spread is noise, not a trend.
export const MIN_REPS_FOR_CONSISTENCY = 3;

// Only recent reps count — improvement over a long session shouldn't read as
// inconsistency.
const WINDOW = 10;

export const standardDeviation = (values) => {
  if (!values || values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

/**
 * Consistency for one drill's recent reps.
 *
 * @param {Array<{key: string, score: number}>} history newest-first, as stored.
 * @param {string} shotKey drill to measure; reps of other drills are ignored.
 * @returns {{consistency: number, spread: number, reps: number, label: string}|null}
 *   null when there aren't enough reps of this drill to say anything.
 */
export const repConsistency = (history, shotKey) => {
  if (!history || !shotKey) return null;
  const scores = history
    .filter((item) => item && item.key === shotKey && Number.isFinite(item.score))
    .slice(0, WINDOW)
    .map((item) => item.score);

  if (scores.length < MIN_REPS_FOR_CONSISTENCY) return null;

  const spread = standardDeviation(scores);
  const consistency = Math.round(
    Math.max(0, Math.min(100, 100 - (spread / SPREAD_AT_ZERO) * 100)),
  );

  let label = 'Erratic';
  if (consistency >= 85) label = 'Grooved';
  else if (consistency >= 70) label = 'Repeatable';
  else if (consistency >= 50) label = 'Variable';

  return { consistency, spread: Math.round(spread * 10) / 10, reps: scores.length, label };
};
