
function Controls({ onStart, onStop, isRecording, isAnalyzing, isRightHanded = true, onToggleHandedness }) {
  const btnBase = {
    padding: '14px 24px',
    fontSize: '0.88rem',
    fontWeight: 800,
    border: 'none',
    borderRadius: '14px',
    cursor: isAnalyzing ? 'not-allowed' : 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    width: '100%',
    letterSpacing: '0.8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    textTransform: 'uppercase'
  };

  const handBtn = (active) => ({
    flex: 1,
    padding: '10px',
    fontSize: '0.8rem',
    fontWeight: 800,
    borderRadius: '10px',
    cursor: isRecording ? 'not-allowed' : 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    border: active ? '1px solid rgba(0, 245, 160, 0.4)' : '1px solid rgba(255,255,255,0.08)',
    background: active ? 'rgba(0, 245, 160, 0.15)' : 'transparent',
    color: active ? '#00f5a0' : '#94a3b8',
    transition: 'all 0.2s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Batting handedness — mirrors the ideal model so left-handers score fairly */}
      {onToggleHandedness && (
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Batting Hand
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" disabled={isRecording} onClick={() => onToggleHandedness(true)} style={handBtn(isRightHanded)}>
              Right-Handed
            </button>
            <button type="button" disabled={isRecording} onClick={() => onToggleHandedness(false)} style={handBtn(!isRightHanded)}>
              Left-Handed
            </button>
          </div>
        </div>
      )}
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
            <span style={{ 
              display: 'inline-block', 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: '#0b0f19', 
              boxShadow: '0 0 10px #0b0f19',
              animation: 'live-record-glow 1s infinite' 
            }} />
            ⏺ Recording Live...
          </>
        ) : (
          <>
            <span style={{ fontSize: '1rem', marginTop: '-2px' }}>▶</span>
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
