import { useState } from 'react';

function Feedback({ score, message, shotName = '', analysisResult = null, history = [] }) {
  const [showHistory, setShowHistory] = useState(false);
  const scorePercentage = Math.min(100, Math.max(0, score || 0));

  const getScoreColor = (s) => {
    if (s >= 80) return '#00f5a0'; // Electric Mint Green
    if (s >= 60) return '#00e5ff'; // Cyberpunk Blue
    if (s >= 40) return '#ff9f0d'; // Hyper-Neon Amber
    return '#ff3366'; // Neon Pink
  };

  const scoreColor = getScoreColor(scorePercentage);

  const getScoreLabel = (s) => {
    if (s >= 80) return 'ELITE PERFORMANCE';
    if (s >= 60) return 'GOOD FORM';
    if (s >= 40) return 'BORDERLINE';
    if (s > 0) return 'UNDER EVALUATION';
    return 'STANDBY';
  };

  const hasDetails = analysisResult && analysisResult.angle_scores && Object.keys(analysisResult.angle_scores).length > 0;
  const isBowling = analysisResult && analysisResult.shot_type === 'bowling_action';
  const [shareLabel, setShareLabel] = useState('Share');

  const handleShare = async () => {
    const drill = shotName || 'cricket shot';
    const text = `I scored ${scorePercentage}% on my ${drill} with Cricket Shadow Coach! 🏏`;
    const shareData = { title: 'Cricket Shadow Coach', text, url: 'https://cricketcoach.online' };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${shareData.url}`);
        setShareLabel('Copied!');
        setTimeout(() => setShareLabel('Share'), 2000);
      }
    } catch {
      /* user cancelled or share unavailable — ignore */
    }
  };

  const formatJointName = (name) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Calculate history aggregates
  const totalDrills = history.length;
  const avgScore = totalDrills > 0 ? Math.round(history.reduce((acc, h) => acc + h.score, 0) / totalDrills) : 0;
  const complianceRate = totalDrills > 0 ? Math.round((history.filter(h => h.isLegal || h.score >= 70).length / totalDrills) * 100) : 0;

  return (
    <div>
      <h3 style={{
        margin: '0 0 18px', fontSize: '0.9rem',
        textTransform: 'uppercase', letterSpacing: '2px',
        color: '#f8fafc', fontWeight: 800,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>Telemetry Diagnostics</span>
        {shotName && (
          <span style={{ 
            textTransform: 'uppercase', 
            fontSize: '0.7rem', 
            color: scoreColor, 
            fontWeight: 900, 
            letterSpacing: '1px',
            background: `${scoreColor}12`,
            padding: '4px 12px',
            borderRadius: '20px',
            border: `1px solid ${scoreColor}25`,
            boxShadow: `0 0 10px ${scoreColor}15`
          }}>
            {shotName}
          </span>
        )}
      </h3>

      {/* Cyberpunk Speedometer Gauge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '22px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', width: '92px', height: '92px', filter: `drop-shadow(0 0 12px ${scoreColor}25)` }}>
          <svg width="92" height="92" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6.5" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={scoreColor} strokeWidth="6.5" strokeLinecap="round"
              strokeDasharray={`${(scorePercentage / 100) * 213.6} 213.6`}
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.1, 0.8, 0.25, 1), stroke 0.3s' }}
            />
          </svg>
          <div className="mono-telemetry" style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', fontWeight: 900, color: scoreColor,
            textShadow: `0 0 12px ${scoreColor}40`,
          }}>
            {scorePercentage}
          </div>
        </div>
        <div>
          <div style={{ 
            fontSize: '1.05rem', fontWeight: 900, color: scoreColor, marginBottom: '4px',
            letterSpacing: '1.5px', textShadow: `0 0 8px ${scoreColor}15`
          }}>
            {getScoreLabel(scorePercentage)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Biomechanical Rating Index
          </div>
        </div>
      </div>

      {/* Cyberpunk feedback message board */}
      <div className="mono-telemetry" style={{
        fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6,
        padding: '16px', background: 'rgba(8, 14, 27, 0.5)', borderRadius: '16px',
        borderLeft: `4.5px solid ${scoreColor}`, minHeight: '44px', marginBottom: '18px',
        border: '1px solid rgba(255,255,255,0.03)',
        borderLeftColor: scoreColor,
        boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 400
      }}>
        {message || 'Ready for shadow practice. Calibrate your feet in the footprint blueprints and swing.'}
      </div>

      {/* Share result — appears once a drill has been analysed */}
      {hasDetails && (
        <button
          onClick={handleShare}
          style={{
            width: '100%', minHeight: '44px', padding: '12px 14px', borderRadius: '12px',
            background: 'rgba(0, 229, 255, 0.06)', border: '1px solid rgba(0, 229, 255, 0.25)',
            color: '#00e5ff', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {shareLabel}
        </button>
      )}

      {/* DETAILED DRILL ANALYSIS REPORT CARD */}
      {hasDetails && !showHistory && (
        <div style={{
          marginTop: '18px', padding: '20px', borderRadius: '16px',
          background: 'rgba(8, 14, 27, 0.45)', border: '1px solid rgba(255,255,255,0.04)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          {isBowling ? (
            <div>
              <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: '14px', fontWeight: 800 }}>
                ICC Regulation Audit
              </h4>
              
              <div className="mono-telemetry" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ color: '#64748b' }}>Elbow Extension:</span>
                  <span style={{ fontWeight: 900, color: scorePercentage >= 80 ? '#00f5a0' : '#ff3366', fontSize: '0.98rem' }}>
                    {analysisResult.angle_scores.bowling_arm_extension?.toFixed(1)}°
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ color: '#94a3b8' }}>ICC Regulation Limit:</span>
                  <span style={{ color: '#f8fafc', fontWeight: 700 }}>≤ 15.0°</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ color: '#94a3b8' }}>Elbow Bend Range:</span>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                    {analysisResult.angle_scores.min_elbow_angle?.toFixed(1)}° to {analysisResult.angle_scores.max_elbow_angle?.toFixed(1)}°
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>Body Lean (Spine):</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                    {analysisResult.angle_scores.spine_tilt?.toFixed(1)}°
                  </span>
                </div>
              </div>
              
              <div style={{
                marginTop: '16px', padding: '12px', borderRadius: '12px',
                background: scorePercentage >= 80 ? 'rgba(0, 245, 160, 0.08)' : 'rgba(255, 51, 102, 0.08)',
                border: scorePercentage >= 80 ? '1px solid rgba(0, 245, 160, 0.2)' : '1px solid rgba(255, 51, 102, 0.2)',
                textAlign: 'center', fontSize: '0.78rem', fontWeight: 900,
                color: scorePercentage >= 80 ? '#00f5a0' : '#ff3366', letterSpacing: '1.2px', textTransform: 'uppercase',
                boxShadow: scorePercentage >= 80 ? '0 0 15px rgba(0,245,160,0.08)' : '0 0 15px rgba(255,51,102,0.08)'
              }}>
                {scorePercentage >= 80 ? '✓ ICC COMPLIANT ACTION' : '✗ NON-COMPLIANT (ILLEGAL)'}
              </div>
            </div>
          ) : (
            <div>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#cbd5e1', marginBottom: '14px', fontWeight: 800 }}>
                Joint Accuracy Diagnostics
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(analysisResult.angle_scores).map(([joint, val]) => {
                  const jointScore = Math.round(val);
                  const jointColor = getScoreColor(jointScore);
                  return (
                    <div key={joint} style={{ fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{formatJointName(joint)}</span>
                        <span className="mono-telemetry" style={{ color: jointColor, fontWeight: 800 }}>{jointScore}%</span>
                      </div>
                      <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${jointScore}%`, backgroundColor: jointColor, borderRadius: '3px', boxShadow: `0 0 8px ${jointColor}30` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* COLLAPSIBLE SESSION HISTORY METRICS DRAWER */}
      {showHistory && (
        <div style={{
          marginTop: '18px', padding: '18px', borderRadius: '16px',
          background: 'rgba(8, 14, 27, 0.45)', border: '1px solid rgba(255,255,255,0.04)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#ff9f0d', marginBottom: '14px', fontWeight: 800 }}>
            Practice Session Analytics
          </h4>
          
          {totalDrills > 0 ? (
            <div>
              {/* Aggregates Dashboard Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr', 
                gap: '10px', 
                textAlign: 'center', 
                marginBottom: '18px', 
                paddingBottom: '14px', 
                borderBottom: '1px solid rgba(255,255,255,0.04)' 
              }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.35)', padding: '10px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div className="mono-telemetry" style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f8fafc' }}>{totalDrills}</div>
                  <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.5px' }}>Drills</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.35)', padding: '10px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div className="mono-telemetry" style={{ fontSize: '1.3rem', fontWeight: 900, color: '#00f5a0' }}>{avgScore}%</div>
                  <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.5px' }}>Avg Rating</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.35)', padding: '10px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div className="mono-telemetry" style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ff9f0d' }}>{complianceRate}%</div>
                  <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.5px' }}>Compliance</div>
                </div>
              </div>
              
              {/* Leaderboard list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                {history.map((item, idx) => {
                  const itemColor = getScoreColor(item.score);
                  return (
                    <div 
                      key={idx} 
                      className="glow-hover"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        fontSize: '0.8rem', 
                        padding: '10px 14px', 
                        background: 'rgba(15, 23, 42, 0.35)', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(255,255,255,0.02)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                        <span style={{ fontSize: '1.25rem' }}>{item.emoji}</span>
                        <span>{item.name}</span>
                      </span>
                      <span className="mono-telemetry" style={{ color: itemColor, fontWeight: 900, letterSpacing: '0.5px' }}>
                        {item.score}% {item.isLegal !== undefined && (item.isLegal ? '✓' : '✗')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', padding: '24px 0' }}>
              No practice logs logged. Stand back in stance to start.
            </div>
          )}
        </div>
      )}

      {/* Symmetrical Diagnostics Toggle Button */}
      {totalDrills > 0 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            marginTop: '14px', width: '100%', padding: '11px 14px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
            color: '#f8fafc', fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
            transition: 'all 0.25s', textTransform: 'uppercase', letterSpacing: '1px'
          }}
          onMouseOver={(e) => { 
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
          onMouseOut={(e) => { 
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
          }}
        >
          {showHistory ? '◀ Back to Active Diagnostics' : '📊 Show Session History Logs'}
        </button>
      )}
    </div>
  );
}

export default Feedback;
