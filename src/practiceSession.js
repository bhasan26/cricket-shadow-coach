import { standardDeviation } from './consistency';

export const PRACTICE_STORAGE_KEY = 'shadow_cover_drive_practice_v1';
export const REPS_PER_SET = 5;
const JOINT_KEYS = ['left_elbow', 'right_elbow', 'left_knee', 'right_knee'];
const PHASES = {
  backswing_phase: { label: 'Backswing', cue: 'Make your backswing smooth and unhurried.' },
  impact_phase: { label: 'Through the shot', cue: 'Bring the bat through in one smooth motion.' },
  follow_through_phase: { label: 'Follow-through', cue: 'Finish balanced and hold your follow-through briefly.' },
};
const validScore = value => Number.isFinite(value) && value >= 0 && value <= 100;
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

export const isRecordingStage = session => session?.stage === 'baseline' || session?.stage === 'repeat';

export function summarizeSet(reps) {
  if (!reps.length) return null;
  const scores = reps.map(rep => rep.score);
  return { average: mean(scores), spread: standardDeviation(scores), count: reps.length };
}

export function choosePracticeFocus(reps) {
  // Compare phases only when all five strokes have a measurement. Otherwise
  // missing segmentation can make a phase look artificially strong or weak.
  const measured = Object.entries(PHASES).flatMap(([key, focus]) => {
    const scores = reps.map(rep => rep.phases[key]);
    return scores.every(validScore) ? [{ key, ...focus, average: mean(scores) }] : [];
  });
  if (measured.length < 2) {
    return {
      key: 'rhythm', label: 'Smooth rhythm', cue: 'Make one smooth stroke and finish balanced.',
      reason: 'The phases were not clear enough to choose a specific focus. Use a steady rhythm for the next five.',
    };
  }
  const weakest = measured.reduce((lowest, focus) => focus.average < lowest.average ? focus : lowest);
  return { ...weakest, reason: `${weakest.label} had the lowest average reference match among the phases measured in all five attempts.` };
}

export function practiceRejection(result) {
  if (result?.shot_type !== 'cover_drive') return 'This practice is for the cover drive. Record another cover drive.';
  if (!validScore(result.score) || !validScore(result.tracking_quality) || result.tracking_quality < 60 || result.confidence === 'low') {
    return 'Tracking was uncertain. Keep your full body visible and try this attempt again.';
  }
  if (result.shot_match?.confident && result.shot_match.best !== 'cover_drive') {
    return 'That movement resembled a different stroke. Try another cover drive; this attempt has not been counted.';
  }
  if (!JOINT_KEYS.every(key => validScore(result.angle_scores?.[key]))) {
    return 'A full stroke could not be compared. Record one complete cover drive; this attempt has not been counted.';
  }
  return '';
}

export function practiceReducer(session, action) {
  switch (action.type) {
    case 'start':
      return {
        version: 1, id: action.id, startedAt: action.now, stage: 'baseline',
        isRightHanded: action.isRightHanded, facingMode: action.facingMode,
        baseline: [], repeat: [], focus: null, notice: '',
      };
    case 'end':
      return null;
    case 'beginRepeat':
      return session?.stage === 'review' ? { ...session, stage: 'repeat', notice: '' } : session;
    case 'result': {
      if (!isRecordingStage(session) || action.attempt.practiceId !== session.id || action.attempt.practiceStage !== session.stage) return session;
      if ([...session.baseline, ...session.repeat].some(rep => rep.id === action.attempt.id)) return session;
      const rejection = practiceRejection(action.result);
      if (rejection) return { ...session, notice: rejection };
      const phases = Object.fromEntries(Object.keys(PHASES)
        .filter(key => validScore(action.result.angle_scores[key]))
        .map(key => [key, action.result.angle_scores[key]]));
      const rep = {
        id: action.attempt.id, score: action.result.score,
        trackingQuality: action.result.tracking_quality, phases, timestamp: action.now,
      };
      const reps = [...session[session.stage], rep];
      const next = { ...session, [session.stage]: reps, notice: '' };
      if (reps.length === REPS_PER_SET) {
        if (session.stage === 'baseline') {
          next.stage = 'review';
          next.focus = choosePracticeFocus(reps);
        } else {
          next.stage = 'complete';
          next.completedAt = action.now;
        }
      }
      return next;
    }
    default:
      return session;
  }
}

export function parsePracticeSession(value) {
  try {
    if (!value || value.version !== 1 || typeof value.id !== 'string' || !Number.isFinite(value.startedAt)
        || typeof value.isRightHanded !== 'boolean' || !['user', 'environment'].includes(value.facingMode)) return null;
    const validRep = rep => rep && typeof rep.id === 'string' && validScore(rep.score)
      && validScore(rep.trackingQuality) && rep.trackingQuality >= 60 && Number.isFinite(rep.timestamp)
      && rep.phases && Object.entries(rep.phases).every(([key, score]) => key in PHASES && validScore(score));
    if (![value.baseline, value.repeat].every(reps => Array.isArray(reps) && reps.length <= REPS_PER_SET && reps.every(validRep))) return null;
    const ids = [...value.baseline, ...value.repeat].map(rep => rep.id);
    if (new Set(ids).size !== ids.length) return null;
    const validStage = (value.stage === 'baseline' && value.baseline.length < REPS_PER_SET && !value.repeat.length)
      || (value.stage === 'review' && value.baseline.length === REPS_PER_SET && !value.repeat.length)
      || (value.stage === 'repeat' && value.baseline.length === REPS_PER_SET && value.repeat.length < REPS_PER_SET)
      || (value.stage === 'complete' && value.baseline.length === REPS_PER_SET && value.repeat.length === REPS_PER_SET);
    if (!validStage) return null;
    // Restore only session summaries, never camera frames or persisted cue text.
    const cleanReps = reps => reps.map(rep => ({
      id: rep.id, score: rep.score, trackingQuality: rep.trackingQuality,
      phases: Object.fromEntries(Object.entries(rep.phases)), timestamp: rep.timestamp,
    }));
    return {
      version: 1, id: value.id, startedAt: value.startedAt, stage: value.stage,
      isRightHanded: value.isRightHanded, facingMode: value.facingMode,
      baseline: cleanReps(value.baseline), repeat: cleanReps(value.repeat),
      completedAt: Number.isFinite(value.completedAt) ? value.completedAt : undefined,
      focus: value.baseline.length === REPS_PER_SET ? choosePracticeFocus(value.baseline) : null,
      notice: value.stage === 'complete' ? '' : 'Practice restored. Use the same camera position and distance before continuing.',
    };
  } catch {
    return null;
  }
}

export function loadPracticeSession() {
  try {
    return parsePracticeSession(JSON.parse(localStorage.getItem(PRACTICE_STORAGE_KEY) || 'null'));
  } catch {
    return null;
  }
}

export function getPracticeSummary(session) {
  const set = reps => ({
    ...summarizeSet(reps),
    attempts: reps.map(rep => ({
      score: rep.score, trackingQuality: rep.trackingQuality,
      phaseMatches: { ...rep.phases }, timestamp: rep.timestamp,
    })),
  });
  return {
    formatVersion: 1, practiceId: session.id, shotType: 'cover_drive',
    startedAt: session.startedAt, completedAt: session.completedAt,
    setup: { isRightHanded: session.isRightHanded, selectedCamera: session.facingMode },
    focus: session.focus ? { label: session.focus.label, cue: session.focus.cue } : null,
    firstSet: set(session.baseline), secondSet: set(session.repeat),
  };
}

export function downloadPracticeSummary(session) {
  const blob = new Blob([JSON.stringify(getPracticeSummary(session), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cover-drive-practice.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
