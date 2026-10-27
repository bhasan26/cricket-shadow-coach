import { downloadPracticeSummary, isRecordingStage, REPS_PER_SET, summarizeSet } from '../practiceSession';
import './PracticeSessionPanel.css';

function SetMetrics({ reps, label }) {
  const summary = summarizeSet(reps);
  return (
    <div className="practice-set-metrics">
      <span>{label}</span>
      <strong>{summary.average.toFixed(1)}<small> / 100 average match</small></strong>
      <span>{summary.spread.toFixed(1)} points of score spread</span>
    </div>
  );
}

export default function PracticeSessionPanel({ session, storageAvailable, isRecording, isAnalyzing, isReady, canRetry, errorMessage,
  onStart, onEnd, onBeginRepeat, onRecord, onStop, onRetry, onCancel }) {
  const busy = isRecording || isAnalyzing;
  if (!session) {
    return (
      <section className="practice-session cyber-card" aria-labelledby="practice-title">
        <div className="practice-intro">
          <div>
            <p className="practice-eyebrow">Guided practice · Cover drive</p>
            <h2 id="practice-title">Five strokes. One focus. Five more.</h2>
            <p>Find a rhythm, practice one cue, then compare both sets. Choose your batting hand before you start.</p>
          </div>
          <button type="button" className="btn-primary" disabled={busy} onClick={onStart}>Start cover-drive practice</button>
        </div>
      </section>
    );
  }

  const stageLabels = { baseline: 'First set', review: 'Your practice focus', repeat: 'Second set', complete: 'Your set comparison' };
  const recordingStage = isRecordingStage(session);
  const reps = session.stage === 'baseline' ? session.baseline : session.repeat;
  const first = summarizeSet(session.baseline);
  const second = summarizeSet(session.repeat);
  const change = first && second ? second.average - first.average : null;

  return (
    <section className="practice-session cyber-card" aria-labelledby="practice-title">
      <div className="practice-heading">
        <div>
          <p className="practice-eyebrow">Cover drive · {session.isRightHanded ? 'Right-handed' : 'Left-handed'}</p>
          <h2 id="practice-title">{stageLabels[session.stage]}</h2>
        </div>
        <button type="button" className="practice-text-button" disabled={busy} onClick={onEnd}>Return to free practice</button>
      </div>
      <ol className="practice-steps" aria-label="Practice stages">
        <li aria-current={session.stage === 'baseline' ? 'step' : undefined}>1 · First five</li>
        <li aria-current={session.stage === 'review' ? 'step' : undefined}>2 · One focus</li>
        <li aria-current={session.stage === 'repeat' ? 'step' : undefined}>3 · Next five</li>
        <li aria-current={session.stage === 'complete' ? 'step' : undefined}>4 · Compare</li>
      </ol>

      {recordingStage && (
        <>
          {session.stage === 'repeat' && <p className="practice-cue">{session.focus.cue}</p>}
          <p className="practice-progress-label" role="status">{reps.length} of {REPS_PER_SET} usable attempts in your {session.stage === 'baseline' ? 'first' : 'second'} set</p>
          <progress value={reps.length} max={REPS_PER_SET} aria-label={`${stageLabels[session.stage]} progress`} />
          <ol className="practice-reps" aria-label={`${stageLabels[session.stage]} attempts`}>
            {Array.from({ length: REPS_PER_SET }, (_, index) => (
              <li key={index} className={reps[index] ? 'recorded' : ''}>
                <span>Rep {index + 1}</span><strong>{reps[index] ? `${Math.round(reps[index].score)}/100` : '—'}</strong>
              </li>
            ))}
          </ol>
          {session.notice && <p className="practice-notice" role="status">{session.notice}</p>}
          {canRetry && <p className="practice-notice" role="status">{errorMessage}</p>}
          <div className="practice-actions">
            {isRecording ? (
              <button type="button" className="btn-danger" onClick={onStop}>Finish this attempt</button>
            ) : canRetry ? (
              <button type="button" className="btn-primary" disabled={isAnalyzing} onClick={onRetry}>Retry saved attempt</button>
            ) : (
              <button type="button" className="btn-primary" disabled={!isReady || isAnalyzing} onClick={onRecord}>
                {isAnalyzing ? 'Comparing attempt…' : !isReady ? 'Waiting for movement tracking…' : `Record attempt ${reps.length + 1}`}
              </button>
            )}
            {canRetry && !isAnalyzing && (
              <button type="button" className="practice-text-button" disabled={!isReady} onClick={onRecord}>Record a new attempt</button>
            )}
            {isAnalyzing && <button type="button" className="practice-text-button" onClick={onCancel}>Cancel current analysis</button>}
          </div>
          <p className="practice-footnote">Keep the same camera position and distance for both sets. Uncertain tracking and incomplete strokes do not count.</p>
        </>
      )}

      {session.stage === 'review' && (
        <div className="practice-review">
          <SetMetrics reps={session.baseline} label="First five" />
          <div>
            <p className="practice-eyebrow">One focus · {session.focus.label}</p>
            <p className="practice-cue">{session.focus.cue}</p>
            <p>{session.focus.reason}</p>
            <button type="button" className="btn-primary" disabled={busy} onClick={onBeginRepeat}>Start second set</button>
          </div>
        </div>
      )}

      {session.stage === 'complete' && (
        <>
          <p className="practice-cue" role="status">{Math.abs(change) < 0.05 ? 'Both sets had the same average match.' : `Average match ${change > 0 ? 'rose' : 'fell'} by ${Math.abs(change).toFixed(1)} points.`}</p>
          <div className="practice-comparison">
            <SetMetrics reps={session.baseline} label="First five" />
            <SetMetrics reps={session.repeat} label="Second five" />
          </div>
          <p>Your focus: {session.focus.cue}</p>
          <p className="practice-footnote">Lower score spread means the scores were more consistent. These short sets compare reference matches; tracking variation can also change the result.</p>
          <div className="practice-actions">
            <button type="button" className="btn-primary" disabled={busy} onClick={onStart}>Practice another ten</button>
            <button type="button" className="practice-text-button" onClick={() => downloadPracticeSummary(session)}>Download practice summary</button>
            <Link className="practice-text-button" to="/progress">View practice progress</Link>
          </div>
        </>
      )}
      <p className="practice-footnote">{storageAvailable
        ? 'Set summaries are saved in this browser. Keep your setup the same if you resume later.'
        : 'Browser storage is unavailable. Keep this page open to finish your practice.'}</p>
    </section>
  );
}
import { Link } from 'react-router-dom';
