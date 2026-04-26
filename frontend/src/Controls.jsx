import React from 'react';

function Controls({ onStart, onStop, isRecording, isAnalyzing }) {
  const baseStyle = {
    padding: '12px 24px',
    fontSize: '0.9rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: '10px',
    cursor: isAnalyzing ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: isAnalyzing ? 0.5 : 1,
    width: '100%',
    letterSpacing: '0.3px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button
        type="button"
        onClick={onStart}
        disabled={isAnalyzing}
        style={{
          ...baseStyle,
          background: isRecording
            ? 'linear-gradient(135deg, #b8860b, #daa520)'
            : 'linear-gradient(135deg, #3a5a3c, #5a7d3a)',
          color: '#fff',
          boxShadow: isRecording
            ? '0 3px 12px rgba(184,134,11,0.3)'
            : '0 3px 12px rgba(58,90,60,0.3)',
        }}
      >
        {isRecording ? '⏺ Recording...' : '▶ Start Recording'}
      </button>
      <button
        type="button"
        onClick={onStop}
        disabled={isAnalyzing || !isRecording}
        style={{
          ...baseStyle,
          background: 'linear-gradient(135deg, #a0522d, #c0392b)',
          color: '#fff',
          boxShadow: '0 3px 12px rgba(192,57,43,0.2)',
          opacity: (!isRecording || isAnalyzing) ? 0.35 : 1,
          cursor: (!isRecording || isAnalyzing) ? 'not-allowed' : 'pointer',
        }}
      >
        ⏹ Stop & Analyze
      </button>
    </div>
  );
}

export default Controls;
