import React from 'react';

function Feedback({ score, message, frameCount = 0, bufferedFrames = 0, shotName = '' }) {
  const scorePercentage = Math.min(100, Math.max(0, score || 0));

  const getScoreColor = (s) => {
    if (s >= 80) return '#3a5a3c';
    if (s >= 60) return '#5a7d3a';
    if (s >= 40) return '#b8860b';
    return '#c0392b';
  };

  const scoreColor = getScoreColor(scorePercentage);

  const getScoreLabel = (s) => {
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Good';
    if (s >= 40) return 'Fair';
    if (s > 0) return 'Needs Work';
    return '—';
  };

  return (
    <div>
      <h3 style={{
        margin: '0 0 14px', fontSize: '0.7rem',
        textTransform: 'uppercase', letterSpacing: '2px',
        color: '#8a7e6b', fontWeight: 600,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>Analysis</span>
        {shotName && (
          <span style={{ textTransform: 'none', fontSize: '0.8rem', color: '#3a5a3c', fontWeight: 600, letterSpacing: '0' }}>
            {shotName}
          </span>
        )}
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#e5ddd0" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={scoreColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(scorePercentage / 100) * 213.6} 213.6`}
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.3s' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', fontWeight: 700, color: scoreColor,
            fontFamily: "'Playfair Display', Georgia, serif",
          }}>
            {scorePercentage}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: scoreColor, marginBottom: '4px' }}>
            {getScoreLabel(scorePercentage)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8a7e6b' }}>Score out of 100</div>
        </div>
      </div>

      <div style={{
        fontSize: '0.88rem', color: '#4a4a4a', lineHeight: 1.6,
        padding: '14px', background: '#faf8f4', borderRadius: '8px',
        borderLeft: `3px solid ${scoreColor}`, minHeight: '40px',
      }}>
        {message || 'Ready to analyze your cricket shot'}
      </div>
    </div>
  );
}

export default Feedback;
