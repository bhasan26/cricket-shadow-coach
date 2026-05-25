import React from 'react';

function Controls({ onStart, onStop, isRecording, isAnalyzing }) {
  const btnBase = {
    padding: '13px 24px',
    fontSize: '0.9rem',
    fontWeight: 700,
    border: 'none',
    borderRadius: '12px',
    cursor: isAnalyzing ? 'not-allowed' : 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    width: '100%',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    textTransform: 'uppercase'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button
        type="button"
        onClick={onStart}
        disabled={isAnalyzing}
        className={isRecording ? 'btn-warning' : 'btn-primary'}
        style={{
          ...btnBase,
          opacity: isAnalyzing ? 0.5 : 1,
        }}
      >
        {isRecording ? (
          <>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'live-record-glow 1s infinite' }} />
            ⏺ Recording Live...
          </>
        ) : (
          <>
            <span style={{ fontSize: '1rem' }}>▶</span>
            Start Practice
          </>
        )}
      </button>
      
      <button
        type="button"
        onClick={onStop}
        disabled={isAnalyzing || !isRecording}
        className="btn-danger"
        style={{
          ...btnBase,
          opacity: (!isRecording || isAnalyzing) ? 0.35 : 1,
          cursor: (!isRecording || isAnalyzing) ? 'not-allowed' : 'pointer',
        }}
      >
        <span>⏹</span>
        Stop & Analyze Action
      </button>
    </div>
  );
}

export default Controls;
