import React, { useState } from 'react';

function Feedback({ score, message, frameCount = 0, bufferedFrames = 0, shotName = '', analysisResult = null, history = [] }) {
  const [showHistory, setShowHistory] = useState(false);
  const scorePercentage = Math.min(100, Math.max(0, score || 0));

  const getScoreColor = (s) => {
    if (s >= 80) return '#10b981'; // Green
    if (s >= 60) return '#34d399'; // Emerald
    if (s >= 40) return '#f59e0b'; // Amber Gold
    return '#f43f5e'; // Ruby Red
  };

  const scoreColor = getScoreColor(scorePercentage);

  const getScoreLabel = (s) => {
    if (s >= 80) return 'ELITE PERFORMANCE';
    if (s >= 60) return 'GOOD FORM';
    if (s >= 40) return 'MARGINAL';
    if (s > 0) return 'UNDER ANALYSIS';
    return '—';
  };

  const hasDetails = analysisResult && analysisResult.angle_scores && Object.keys(analysisResult.angle_scores).length > 0;
  const isBowling = analysisResult && analysisResult.shot_type === 'bowling_action';

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
        margin: '0 0 18px', fontSize: '0.75rem',
        textTransform: 'uppercase', letterSpacing: '1.5px',
        color: '#94a3b8', fontWeight: 800,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>Telemetry Diagnostics</span>
        {shotName && (
          <span style={{ 
            textTransform: 'uppercase', 
            fontSize: '0.72rem', 
            color: scoreColor, 
            fontWeight: 900, 
            letterSpacing: '1px',
            background: `${scoreColor}12`,
            padding: '3px 10px',
            borderRadius: '20px',
            border: `1px solid ${scoreColor}30`
          }}>
            {shotName}
          </span>
        )}
      </h3>

      {/* High-Fidelity Score Ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '22px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', width: '88px', height: '88px', filter: `drop-shadow(0 0 10px ${scoreColor}20)` }}>
          <svg width="88" height="88" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6.5" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={scoreColor} strokeWidth="6.5" strokeLinecap="round"
              strokeDasharray={`${(scorePercentage / 100) * 213.6} 213.6`}
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.1, 0.8, 0.2, 1), stroke 0.3s' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.7rem', fontWeight: 900, color: scoreColor,
            fontFamily: "'Outfit', sans-serif",
            textShadow: `0 0 12px ${scoreColor}40`,
          }}>
            {scorePercentage}
          </div>
        </div>
        <div>
          <div style={{ 
            fontSize: '1rem', fontWeight: 900, color: scoreColor, marginBottom: '3px',
            letterSpacing: '1.5px', textShadow: `0 0 8px ${scoreColor}15`
          }}>
            {getScoreLabel(scorePercentage)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Biomechanical Rating Index
          </div>
        </div>
      </div>

      {/* Core Feedback Message Box */}
      <div style={{
        fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6,
        padding: '16px', background: 'rgba(15, 23, 42, 0.45)', borderRadius: '14px',
        borderLeft: `4px solid ${scoreColor}`, minHeight: '44px', marginBottom: '18px',
        border: '1px solid rgba(255,255,255,0.03)',
        borderLeftColor: scoreColor,
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
      }}>
        {message || 'Ready for shadow practice. Align your feet in the footprints and let the AI guide you.'}
      </div>

      {/* HIGH-FIDELITY DETAILED REPORT CARD */}
      {hasDetails && !showHistory && (
        <div style={{
          marginTop: '18px', padding: '18px', borderRadius: '14px',
          background: 'rgba(11, 15, 25, 0.5)', border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
        }}>
          {isBowling ? (
            <div>
              <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: '14px', fontWeight: 800 }}>
                ICC Regulation Audit
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Elbow Extension:</span>
                  <span style={{ fontWeight: 900, color: scorePercentage >= 80 ? '#10b981' : '#f43f5e', fontSize: '0.95rem' }}>
                    {analysisResult.angle_scores.bowling_arm_extension?.toFixed(1)}°
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>ICC Limit Threshold:</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 700 }}>≤ 15.0°</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Elbow Bend Range:</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                    {analysisResult.angle_scores.min_elbow_angle?.toFixed(1)}° to {analysisResult.angle_scores.max_elbow_angle?.toFixed(1)}°
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Body Lean (Spine):</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                    {analysisResult.angle_scores.spine_tilt?.toFixed(1)}°
                  </span>
                </div>
              </div>
              
              <div style={{
                marginTop: '16px', padding: '12px', borderRadius: '10px',
                background: scorePercentage >= 80 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                border: scorePercentage >= 80 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(244, 63, 94, 0.2)',
                textAlign: 'center', fontSize: '0.78rem', fontWeight: 900,
                color: scorePercentage >= 80 ? '#10b981' : '#f43f5e', letterSpacing: '1px', textTransform: 'uppercase',
                boxShadow: scorePercentage >= 80 ? '0 0 15px rgba(16,185,129,0.05)' : '0 0 15px rgba(244,63,94,0.05)'
              }}>
                {scorePercentage >= 80 ? '✓ ICC COMPLIANT ACTION' : '✗ NON-COMPLIANT (ILLEGAL)'}
              </div>
            </div>
          ) : (
            <div>
              <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: '14px', fontWeight: 800 }}>
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
                        <span style={{ color: jointColor, fontWeight: 800 }}>{jointScore}%</span>
                      </div>
                      <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${jointScore}%`, backgroundColor: jointColor, borderRadius: '3px' }} />
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
          marginTop: '18px', padding: '18px', borderRadius: '14px',
          background: 'rgba(11, 15, 25, 0.5)', border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
        }}>
          <h4 style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#f59e0b', marginBottom: '14px', fontWeight: 800 }}>
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
                borderBottom: '1px solid rgba(255,255,255,0.05)' 
              }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.3)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc' }}>{totalDrills}</div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>Drills</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.3)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>{avgScore}%</div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>Avg Rating</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.3)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b' }}>{complianceRate}%</div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>Compliance</div>
                </div>
              </div>
              
              {/* Leaderboard List */}
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
                        borderRadius: '10px', 
                        border: '1px solid rgba(255,255,255,0.03)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                        <span style={{ fontSize: '1.2rem' }}>{item.emoji}</span>
                        <span>{item.name}</span>
                      </span>
                      <span style={{ color: itemColor, fontWeight: 800, letterSpacing: '0.5px' }}>
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
            marginTop: '14px', width: '100%', padding: '10px 14px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            color: '#f8fafc', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
            transition: 'all 0.25s', textTransform: 'uppercase', letterSpacing: '1px'
          }}
          onMouseOver={(e) => { 
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseOut={(e) => { 
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
          }}
        >
          {showHistory ? '◀ Back to Active Diagnostics' : '📊 Show Session History Logs'}
        </button>
      )}
    </div>
  );
}

export default Feedback;
