export function completedPractice({ id = 'practice-1', completedAt = Date.UTC(2026, 9, 27, 12),
  isRightHanded = true, facingMode = 'environment', before = 60, after = 80 } = {}) {
  const reps = (set, score) => Array.from({ length: 5 }, (_, i) => ({
    id: `${id}-${set}-${i}`, score, trackingQuality: 95,
    phases: { backswing_phase: 45, impact_phase: 80, follow_through_phase: 90 }, timestamp: completedAt - 1000,
  }));
  return {
    version: 1, id, startedAt: completedAt - 60_000, completedAt, stage: 'complete',
    isRightHanded, facingMode, baseline: reps('baseline', before), repeat: reps('repeat', after),
    focus: null, notice: '',
  };
}
