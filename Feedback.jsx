import React from 'react';

function Feedback({ score, message, frameCount = 0, bufferedFrames = 0 }) {
  const scorePercentage = Math.min(100, Math.max(0, score || 0));
  const scoreColor =
    scorePercentage >= 70 ? '#4CAF50' : scorePercentage >= 40 ? '#ff9800' : '#f44336';

  const feedbackStyle = {
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: '#f5f5f5',
    border: `2px solid ${scoreColor}`,
  };

  const scoreStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: scoreColor,
    margin: '8px 0',
  };

  const messageStyle = {
    fontSize: '14px',
    color: '#333',
    margin: '8px 0',
    lineHeight: '1.5',
  };

  const infoStyle = {
    fontSize: '12px',
    color: '#999',
    margin: '8px 0',
  };

  return (
    <div style={feedbackStyle}>
      <div style={scoreStyle}>{scorePercentage}%</div>
      <div style={messageStyle}>{message || 'Ready to analyze'}</div>
      <div style={infoStyle}>
        Frames: {frameCount} | Buffered: {bufferedFrames}
      </div>
    </div>
  );
}

export default Feedback;
