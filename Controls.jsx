import React from 'react';

function Controls({ onStart, onStop, isRecording, isAnalyzing }) {
  const buttonStyle = {
    padding: '10px 20px',
    margin: '0 8px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    opacity: isAnalyzing ? 0.6 : 1,
  };

  const startButtonStyle = {
    ...buttonStyle,
    backgroundColor: isRecording ? '#ff9800' : '#4CAF50',
    color: 'white',
  };

  const stopButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f44336',
    color: 'white',
  };

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      <button
        type="button"
        onClick={onStart}
        disabled={isAnalyzing}
        style={startButtonStyle}
      >
        {isRecording ? 'Recording...' : 'Start Recording'}
      </button>
      <button
        type="button"
        onClick={onStop}
        disabled={isAnalyzing || !isRecording}
        style={stopButtonStyle}
      >
        Stop & Analyze
      </button>
    </div>
  );
}

export default Controls;
