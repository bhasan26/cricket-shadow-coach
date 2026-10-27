import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { filterPractices, MAX_SAVED_PRACTICES, readCompletedPractices } from '../practiceArchive';
import { downloadPracticeSummary, summarizeSet } from '../practiceSession';
import './ProgressDashboard.css';

const score = value => value.toFixed(1);
const changeText = value => `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
const cameraName = mode => mode === 'user' ? 'Front camera' : 'Rear camera';
const handName = session => session.isRightHanded ? 'Right-handed' : 'Left-handed';
function dateLabel(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function PracticeTrend({ sessions }) {
  const recent = sessions.slice(0, 10).reverse();
  const x = i => recent.length === 1 ? 300 : 52 + i * 520 / (recent.length - 1);
  const y = value => 190 - value * 1.5;
  const points = key => recent.map((session, i) => `${x(i)},${y(summarizeSet(session[key]).average)}`).join(' ');
  return (
    <section className="progress-card" aria-labelledby="trend-title">
      <h2 id="trend-title">Your recent sets</h2>
      <p>Last {recent.length} matching {recent.length === 1 ? 'practice' : 'practices'}, in completion order. Use the same camera setup when comparing scores.</p>
      <div className="progress-legend"><span>○ First five</span><span>● Second five</span></div>
      <svg className="progress-chart" viewBox="0 0 610 225" role="img" aria-labelledby="trend-chart-title" aria-describedby="trend-chart-description">
        <title id="trend-chart-title">Average reference match by practice</title>
        <desc id="trend-chart-description">Reference match from zero to 100. The dashed line shows the first five attempts and the solid line shows the second five. Exact scores appear in the session table below.</desc>
        {[0, 25, 50, 75, 100].map(value => (
          <g key={value}><line x1="52" x2="572" y1={y(value)} y2={y(value)} className="progress-grid-line" /><text x="40" y={y(value) + 4} textAnchor="end">{value}</text></g>
        ))}
        <polyline points={points('baseline')} className="progress-line first" />
        <polyline points={points('repeat')} className="progress-line second" />
        {recent.map((session, i) => (
          <g key={session.id}>
            <circle cx={x(i)} cy={y(summarizeSet(session.baseline).average)} r="4" className="progress-point first" />
            <circle cx={x(i)} cy={y(summarizeSet(session.repeat).average)} r="4" className="progress-point second" />
            <text x={x(i)} y="214" textAnchor="middle">{i + 1}</text>
          </g>
        ))}
      </svg>
      <p className="progress-note">These are reference-match scores, not a percentage of playing ability. Tracking and scoring updates can affect comparisons.</p>
    </section>
  );
}

export default function ProgressDashboard() {
  const [practices, setPractices] = useState(readCompletedPractices);
  const [hand, setHand] = useState('all');
  const [camera, setCamera] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const detailsRef = useRef(null);

  useEffect(() => {
    const refresh = () => setPractices(readCompletedPractices());
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const filtered = filterPractices(practices, hand, camera);
  const selected = filtered.find(session => session.id === selectedId) || filtered[0];
  const latest = filtered[0];
  const first = selected && summarizeSet(selected.baseline);
  const second = selected && summarizeSet(selected.repeat);
  const latestSecond = latest && summarizeSet(latest.repeat);

  return (
    <div className="progress-page">
      <Helmet>
        <title>Your Practice Progress — Cricket Shadow Coach</title>
        <meta name="description" content="Review completed cover-drive practices and compare your saved sets on this device." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <header className="progress-page-heading">
        <div><p className="progress-eyebrow">Cover-drive practice</p><h1>Your practice progress</h1><p>Keep a record of the work you put in, one completed practice at a time.</p></div>
        <Link className="progress-button primary" to="/live">Go to practice</Link>
      </header>
      <p className="progress-note">The latest {MAX_SAVED_PRACTICES} completed practices stay in this browser. Clearing browser data removes them; download summaries you want to keep.</p>

      {!practices.length ? (
        <section className="progress-card progress-empty">
          <h2>No completed practices yet</h2>
          <p>Finish both five-attempt sets in guided cover-drive practice to save your first comparison. Any unfinished practice is still available on the practice page.</p>
          <Link className="progress-button primary" to="/live">Start or resume guided practice</Link>
        </section>
      ) : (
        <>
          <div className="progress-filters">
            <label>Batting hand<select value={hand} onChange={event => { setHand(event.target.value); setSelectedId(null); }}><option value="all">All hands</option><option value="right">Right-handed</option><option value="left">Left-handed</option></select></label>
            <label>Camera selection<select value={camera} onChange={event => { setCamera(event.target.value); setSelectedId(null); }}><option value="all">All cameras</option><option value="environment">Rear camera</option><option value="user">Front camera</option></select></label>
            <p role="status">{filtered.length} matching {filtered.length === 1 ? 'practice' : 'practices'}</p>
          </div>
          {!filtered.length ? <section className="progress-card"><h2>No practices match these filters</h2><p>Choose another hand or camera to view your saved sessions.</p></section> : (
            <>
              <dl className="progress-stat-grid">
                <div className="progress-card"><dt>Completed practices</dt><dd>{filtered.length}</dd></div>
                <div className="progress-card"><dt>Counted strokes</dt><dd>{filtered.length * 10}</dd></div>
                <div className="progress-card"><dt>Latest second-set average</dt><dd>{score(latestSecond.average)}<small> / 100</small></dd></div>
              </dl>
              <PracticeTrend sessions={filtered} />
              <section className="progress-card" aria-labelledby="saved-practices-title">
                <h2 id="saved-practices-title">Completed practices</h2>
                <div className="progress-table-scroll">
                  <table className="progress-table">
                    <caption>Saved cover-drive practices, newest first. Changes are score points.</caption>
                    <thead><tr><th scope="col">Completed</th><th scope="col">First five</th><th scope="col">Second five</th><th scope="col">Change</th><th scope="col">Setup</th><th scope="col">Details</th></tr></thead>
                    <tbody>{filtered.map(session => {
                      const before = summarizeSet(session.baseline).average;
                      const after = summarizeSet(session.repeat).average;
                      return (
                        <tr key={session.id} className={session.id === selected.id ? 'selected' : ''}>
                          <th scope="row">{dateLabel(session.completedAt)}</th><td>{score(before)}</td><td>{score(after)}</td><td>{changeText(after - before)}</td>
                          <td>{handName(session)}<br />{cameraName(session.facingMode)}</td>
                          <td><button type="button" className="progress-button" aria-pressed={session.id === selected.id} onClick={() => {
                            setSelectedId(session.id);
                            detailsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
                          }}>View session</button></td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              </section>
              <section ref={detailsRef} className="progress-card progress-details" aria-labelledby="session-details-title">
                <p className="progress-eyebrow">{dateLabel(selected.completedAt)} · {handName(selected)} · {cameraName(selected.facingMode)}</p>
                <h2 id="session-details-title">Practice details</h2>
                <p className="progress-focus">{selected.focus.cue}</p>
                <div className="progress-table-scroll"><table className="progress-table">
                  <caption>Both sets from this practice</caption>
                  <thead><tr><th scope="col">Measure</th><th scope="col">First five</th><th scope="col">Second five</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">Average match / 100</th><td>{score(first.average)}</td><td>{score(second.average)}</td></tr>
                    <tr><th scope="row">Score spread (points)</th><td>{score(first.spread)}</td><td>{score(second.spread)}</td></tr>
                    <tr><th scope="row">Counted attempts</th><td>{first.count}</td><td>{second.count}</td></tr>
                  </tbody>
                </table></div>
                <p className="progress-note">Lower spread means the scores were more consistent. A score change alone does not establish improved technique.</p>
                <button type="button" className="progress-button primary" onClick={() => downloadPracticeSummary(selected)}>Download this practice</button>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
