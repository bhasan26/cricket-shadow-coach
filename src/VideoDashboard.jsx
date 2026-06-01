import React, { useState, useRef, useEffect } from 'react';

function VideoDashboard() {
  const [userVideo, setUserVideo] = useState(null);
  const [proVideo, setProVideo] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isABLooping, setIsABLooping] = useState(false);
  const [loopA, setLoopA] = useState(0);
  const [loopB, setLoopB] = useState(0);

  const userVideoRef = useRef(null);
  const proVideoRef = useRef(null);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUserVideo(url);
    }
  };

  const handleProVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProVideo(url);
    }
  };

  const handleSpeedChange = (e) => {
    const speed = parseFloat(e.target.value);
    setPlaybackRate(speed);
    if (userVideoRef.current) userVideoRef.current.playbackRate = speed;
    if (proVideoRef.current) proVideoRef.current.playbackRate = speed;
  };

  const setLoopPointA = () => {
    if (userVideoRef.current) {
      setLoopA(userVideoRef.current.currentTime);
      // Auto-enable if B is also set and > A
      if (loopB > userVideoRef.current.currentTime) setIsABLooping(true);
    }
  };

  const setLoopPointB = () => {
    if (userVideoRef.current) {
      setLoopB(userVideoRef.current.currentTime);
      if (userVideoRef.current.currentTime > loopA) setIsABLooping(true);
    }
  };

  useEffect(() => {
    if (!isABLooping) return;
    const interval = setInterval(() => {
      if (userVideoRef.current && loopB > loopA) {
        if (userVideoRef.current.currentTime >= loopB) {
          userVideoRef.current.currentTime = loopA;
          if (proVideoRef.current) proVideoRef.current.currentTime = loopA;
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isABLooping, loopA, loopB]);

  const syncPlay = () => {
    if (proVideoRef.current && proVideoRef.current.src) proVideoRef.current.play();
  };

  const syncPause = () => {
    if (proVideoRef.current && proVideoRef.current.src) proVideoRef.current.pause();
  };

  const syncSeek = () => {
    if (userVideoRef.current && proVideoRef.current && proVideoRef.current.src) {
      proVideoRef.current.currentTime = userVideoRef.current.currentTime;
    }
  };

  return (
    <div className="cyber-card" style={{ padding: '30px', minHeight: '650px', background: 'rgba(15, 23, 42, 0.65)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h2 style={{ color: '#00f5a0', margin: 0, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.2rem', fontWeight: 900 }}>
          Advanced Video Dashboard
        </h2>
        <div style={{ background: 'rgba(0, 245, 160, 0.1)', border: '1px solid rgba(0, 245, 160, 0.3)', padding: '6px 16px', borderRadius: '20px', color: '#00f5a0', fontSize: '0.75rem', fontWeight: 800 }}>
          PRO SPLIT-SCREEN ANALYSIS
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '25px', marginBottom: '25px' }}>
        <div style={{ flex: 1, background: '#020617', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
          <h3 style={{ color: '#cbd5e1', marginBottom: '15px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <span style={{ color: '#ff9f0d', marginRight: '8px' }}>●</span> User Execution
          </h3>
          {!userVideo ? (
            <div style={{ 
              width: '100%', aspectRatio: '16/9', border: '2px dashed #334155', borderRadius: '12px', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.5)' 
            }}>
              <span style={{ fontSize: '2rem', marginBottom: '10px' }}>📁</span>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px' }}>Upload your session video</p>
              <input type="file" accept="video/*" onChange={handleVideoUpload} style={{ color: '#cbd5e1', fontSize: '0.8rem' }} />
            </div>
          ) : (
            <video 
              ref={userVideoRef} 
              src={userVideo} 
              controls 
              style={{ width: '100%', borderRadius: '10px', boxShadow: '0 8px 25px rgba(0,0,0,0.4)' }} 
              onPlay={syncPlay} 
              onPause={syncPause}
              onSeeked={syncSeek}
            />
          )}
        </div>
        
        <div style={{ flex: 1, background: '#020617', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
          <h3 style={{ color: '#cbd5e1', marginBottom: '15px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <span style={{ color: '#00f5a0', marginRight: '8px' }}>●</span> Pro Model Reference
          </h3>
          {!proVideo ? (
            <div style={{ 
              width: '100%', aspectRatio: '16/9', border: '2px dashed #334155', borderRadius: '12px', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.5)' 
            }}>
              <span style={{ fontSize: '2rem', marginBottom: '10px' }}>🏆</span>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px' }}>Upload pro reference video</p>
              <input type="file" accept="video/*" onChange={handleProVideoUpload} style={{ color: '#cbd5e1', fontSize: '0.8rem' }} />
            </div>
          ) : (
            <video 
              ref={proVideoRef} 
              src={proVideo} 
              style={{ width: '100%', borderRadius: '10px', boxShadow: '0 8px 25px rgba(0,0,0,0.4)' }} 
              muted
            />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '25px', alignItems: 'center', background: '#0b0f19', padding: '20px 25px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>
            Playback Engine
          </label>
          <select value={playbackRate} onChange={handleSpeedChange} style={{ 
            background: '#1e293b', color: '#00f5a0', padding: '10px 15px', borderRadius: '8px', 
            border: '1px solid #334155', fontWeight: 700, outline: 'none', cursor: 'pointer' 
          }}>
            <option value={0.25}>0.25x (Super Slow)</option>
            <option value={0.5}>0.50x (Half Speed)</option>
            <option value={0.75}>0.75x (Detail View)</option>
            <option value={1.0}>1.00x (Normal)</option>
          </select>
        </div>

        <div style={{ width: '1px', height: '50px', background: '#334155' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <label style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>
            A-B Looping Matrix
          </label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={setLoopPointA} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px' }}>
              SET A <span style={{ opacity: 0.6, marginLeft: '4px' }}>[{loopA.toFixed(1)}s]</span>
            </button>
            <button onClick={setLoopPointB} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px' }}>
              SET B <span style={{ opacity: 0.6, marginLeft: '4px' }}>[{loopB.toFixed(1)}s]</span>
            </button>
            <button 
              onClick={() => setIsABLooping(!isABLooping)} 
              className={isABLooping ? 'btn-warning' : 'btn-primary'} 
              style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', marginLeft: 'auto', minWidth: '130px' }}
            >
              {isABLooping ? '🔄 LOOPING ON' : '⭕ LOOP OFF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoDashboard;
