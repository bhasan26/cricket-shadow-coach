import { useCallback, useRef, useState } from 'react';
import { isRecordingStage, loadPracticeSession, PRACTICE_STORAGE_KEY, practiceReducer } from './practiceSession';
import { archiveCompletedPractice } from './practiceArchive';

export default function usePracticeSession() {
  const [session, setSession] = useState(loadPracticeSession);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const sessionRef = useRef(session);

  const commit = useCallback(action => {
    const previous = sessionRef.current;
    const next = practiceReducer(previous, action);
    sessionRef.current = next;
    if (next !== previous) {
      setSession(next);
      // Preserve a completed comparison before a new practice replaces it.
      let saved = previous?.stage === 'complete' ? archiveCompletedPractice(previous) : true;
      try {
        if (next) localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(next));
        else localStorage.removeItem(PRACTICE_STORAGE_KEY);
      } catch {
        saved = false;
      }
      if (next?.stage === 'complete') saved = archiveCompletedPractice(next) && saved;
      setStorageAvailable(saved);
    }
    return next;
  }, []);

  const start = useCallback(settings => commit({ type: 'start', ...settings, id: crypto.randomUUID(), now: Date.now() }), [commit]);
  const end = useCallback(() => commit({ type: 'end' }), [commit]);
  const beginRepeat = useCallback(() => commit({ type: 'beginRepeat' }), [commit]);
  const canRecord = useCallback(() => !sessionRef.current || isRecordingStage(sessionRef.current), []);
  const getContext = useCallback(() => ({ practiceId: sessionRef.current?.id, practiceStage: sessionRef.current?.stage }), []);
  const recordResult = useCallback((result, attempt) => {
    const previous = sessionRef.current;
    if (!previous || attempt.practiceId !== previous.id) return null;
    const next = commit({ type: 'result', result, attempt, now: Date.now() });
    const count = value => value.baseline.length + value.repeat.length;
    return { session: next, accepted: count(next) > count(previous) };
  }, [commit]);

  return { session, storageAvailable, start, end, beginRepeat, canRecord, getContext, recordResult };
}
