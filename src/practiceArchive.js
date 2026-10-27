import { loadPracticeSession, parsePracticeSession } from './practiceSession';

export const PRACTICE_ARCHIVE_KEY = 'shadow_practice_archive_v1';
export const MAX_SAVED_PRACTICES = 50;

function normalize(practices) {
  const unique = new Map();
  for (const value of practices) {
    const session = parsePracticeSession(value);
    if (session?.stage === 'complete' && Number.isFinite(session.completedAt)) unique.set(session.id, session);
  }
  return [...unique.values()]
    .sort((a, b) => b.completedAt - a.completedAt || a.id.localeCompare(b.id))
    .slice(0, MAX_SAVED_PRACTICES);
}

export function readCompletedPractices() {
  let archived = [];
  try {
    const value = JSON.parse(localStorage.getItem(PRACTICE_ARCHIVE_KEY) || '[]');
    if (Array.isArray(value)) archived = value;
  } catch { /* older current-session data may still be readable */ }
  const current = loadPracticeSession();
  // Include completed practices made before the archive existed. Reading does
  // not write storage or mutate progress during a React render.
  return normalize(current?.stage === 'complete' ? [...archived, current] : archived);
}

export function archiveCompletedPractice(session) {
  if (session?.stage !== 'complete') return true;
  try {
    const practices = normalize([...readCompletedPractices(), session]);
    localStorage.setItem(PRACTICE_ARCHIVE_KEY, JSON.stringify(practices));
    return true;
  } catch {
    return false;
  }
}

export function filterPractices(practices, hand, camera) {
  return practices.filter(session => (hand === 'all' || session.isRightHanded === (hand === 'right'))
    && (camera === 'all' || session.facingMode === camera));
}
