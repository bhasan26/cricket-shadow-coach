import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPoseDetector } from './poseUtils';
import { drawSkeleton } from './drawSkeleton';
import { analyzeFrame, analyzeShotSequence, checkAPIHealth, fetchShots } from './api';
import Feedback from './Feedback';
import Controls from './Controls';

function CameraFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const poseDetectorRef = useRef(null);
  const frameBufferRef = useRef([]);
  const isRecordingRef = useRef(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState('');
  const [frameCount, setFrameCount] = useState(0);
  const [bufferedFrameCount, setBufferedFrameCount] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [poseReady, setPoseReady] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  const [selectedShot, setSelectedShot] = useState('cover_drive');
  const [availableShots, setAvailableShots] = useState({
    cover_drive: { name: 'Cover Drive', emoji: '🏏', description: 'Classic off-side drive through the covers', difficulty: 'Intermediate' },
    straight_drive: { name: 'Straight Drive', emoji: '⬆️', description: 'Drive past the bowler', difficulty: 'Advanced' },
    pull_shot: { name: 'Pull Shot', emoji: '💪', description: 'Horizontal bat shot', difficulty: 'Intermediate' },
    defensive_block: { name: 'Defensive Block', emoji: '🛡️', description: 'Forward defense', difficulty: 'Beginner' },
    flick_shot: { name: 'Flick Shot', emoji: '🖐️', description: 'Wristy flick to leg', difficulty: 'Advanced' },
  });
  const [lastShotName, setLastShotName] = useState('');

  useEffect(() => {
    checkAPIHealth().then(healthy => {
      setApiReady(healthy);
      if (!healthy) setCurrentFeedback('⚠️ Backend not connected.');
    });
    fetchShots().then(shots => {
      if (shots && !shots.error) setAvailableShots(shots);
    });
  }, []);

  const handlePoseLandmarks = useCallback((landmarks) => {
    if (!landmarks) return;
    setFrameCount(prev => prev + 1);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(58, 120, 58, 0.9)';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(58, 120, 58, 0.4)';
      ctx.shadowBlur = 6;
      drawSkeleton(ctx, landmarks);
      for (const lm of landmarks) {
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 169, 94, 0.95)';
        ctx.fill();
      }
    }
    if (isRecordingRef.current) {
      frameBufferRef.current.push({
        landmarks: landmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility || 1.0 })),
        timestamp: Date.now(),
      });
      setBufferedFrameCount(frameBufferRef.current.length);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setCameraReady(true);
        }
      } catch (error) {
        setCurrentFeedback('📷 Camera access denied. Please allow camera permissions.');
      }
    };
    startCamera();
    return () => { mounted = false; if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  useEffect(() => {
    if (!cameraReady || !videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const syncSize = () => { if (canvas && video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; } };
    syncSize();
    video.addEventListener('resize', syncSize);
    const detector = createPoseDetector(video, handlePoseLandmarks);
    poseDetectorRef.current = detector;
    detector.start().then(() => {
      setPoseReady(true);
      if (!currentFeedback) setCurrentFeedback('Ready! Select a shot and start recording.');
    });
    return () => { video.removeEventListener('resize', syncSize); detector.destroy(); };
  }, [cameraReady, handlePoseLandmarks]);

  const handleStart = useCallback(() => {
    frameBufferRef.current = [];
    setBufferedFrameCount(0);
    setIsRecording(true);
    isRecordingRef.current = true;
    const shotName = availableShots[selectedShot]?.name || selectedShot;
    setCurrentFeedback(`🔴 Recording ${shotName}... Perform your shot!`);
    setCurrentScore(0);
    setLastShotName('');
  }, [selectedShot, availableShots]);

  const handleStop = useCallback(async () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    const frames = frameBufferRef.current;
    if (frames.length === 0) { setCurrentFeedback('No frames captured.'); return; }
    setIsAnalyzing(true);
    const shotName = availableShots[selectedShot]?.name || selectedShot;
    setCurrentFeedback(`Analyzing ${frames.length} frames for ${shotName}...`);
    try {
      const sequence = frames.map(f => f.landmarks);
      const result = await analyzeShotSequence(sequence, selectedShot);
      setCurrentScore(result.score || 0);
      setCurrentFeedback(result.feedback || 'Analysis complete');
      setLastShotName(result.shot_name || shotName);
    } catch (error) {
      setCurrentFeedback('❌ Analysis failed. Is the backend running?');
    } finally {
      setIsAnalyzing(false);
      frameBufferRef.current = [];
      setBufferedFrameCount(0);
    }
  }, [selectedShot, availableShots]);

  const difficultyColor = (d) => {
    if (d === 'Beginner') return '#4a7c3f';
    if (d === 'Intermediate') return '#b8860b';
    return '#a0522d';
  };

  const statusDot = (ready) => (
    <span style={{
      display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
      background: ready ? '#4a7c3f' : '#c0392b', marginRight: '8px',
    }} />
  );

  const card = {
    background: '#fff',
    borderRadius: '14px',
    padding: '20px',
    border: '1px solid #e5ddd0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  };

  const sectionTitle = {
    margin: '0 0 14px',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    color: '#8a7e6b',
    fontWeight: 600,
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 360px',
      gap: '28px',
      alignItems: 'start',
    }}>
      {/* Video Area */}
      <div>
        <div style={{
          position: 'relative',
          borderRadius: '14px',
          overflow: 'hidden',
          background: '#1a1a1a',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          border: isRecording ? '3px solid #c0392b' : '3px solid #3a5a3c',
          transition: 'border-color 0.3s',
        }}>
          <video ref={videoRef} autoPlay muted playsInline style={{ display: 'block', width: '100%', height: 'auto' }} />
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
          {isRecording && (
            <div style={{
              position: 'absolute', top: '14px', left: '14px',
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(192,57,43,0.9)',
              padding: '6px 16px', borderRadius: '20px',
              fontSize: '13px', fontWeight: 600, color: '#fff',
              animation: 'pulse 1.5s infinite',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
              REC • {bufferedFrameCount} frames
            </div>
          )}
          <div style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'rgba(45,58,46,0.85)', backdropFilter: 'blur(8px)',
            padding: '6px 14px', borderRadius: '20px',
            fontSize: '13px', color: '#e8d48b', fontWeight: 600,
          }}>
            {availableShots[selectedShot]?.emoji} {availableShots[selectedShot]?.name}
          </div>
          {!cameraReady && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.8)', color: '#aaa', fontSize: '1.1rem',
            }}>
              📷 Initializing camera...
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#8a7e6b', padding: '10px 0' }}>
          Total Frames Processed: {frameCount}
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Shot Selector */}
        <div style={card}>
          <h3 style={sectionTitle}>Select Shot Type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.entries(availableShots).map(([key, shot]) => (
              <button
                key={key}
                onClick={() => setSelectedShot(key)}
                disabled={isRecording}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '10px',
                  border: selectedShot === key ? '2px solid #3a5a3c' : '2px solid #e5ddd0',
                  background: selectedShot === key
                    ? 'linear-gradient(135deg, rgba(58,90,60,0.08), rgba(90,125,58,0.05))'
                    : '#faf8f4',
                  color: '#2d3a2e',
                  cursor: isRecording ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left', fontSize: '0.88rem',
                  opacity: isRecording ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>{shot.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: selectedShot === key ? '#2d4a2e' : '#4a4a4a' }}>
                    {shot.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#8a7e6b', marginTop: '2px' }}>
                    {shot.description}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.62rem', padding: '3px 8px', borderRadius: '10px', fontWeight: 700,
                  background: `${difficultyColor(shot.difficulty)}18`,
                  color: difficultyColor(shot.difficulty),
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  {shot.difficulty}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div style={card}>
          <h3 style={sectionTitle}>System Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#4a4a4a' }}>
            <div>{statusDot(cameraReady)} Camera</div>
            <div>{statusDot(poseReady)} Pose Detection</div>
            <div>{statusDot(apiReady)} Backend API</div>
          </div>
        </div>

        {/* Controls */}
        <div style={card}>
          <h3 style={sectionTitle}>Controls</h3>
          <Controls onStart={handleStart} onStop={handleStop} isRecording={isRecording} isAnalyzing={isAnalyzing} />
        </div>

        {/* Feedback */}
        <div style={card}>
          <Feedback score={currentScore} message={currentFeedback} frameCount={frameCount} bufferedFrames={bufferedFrameCount} shotName={lastShotName} />
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#8a7e6b', padding: '8px' }}>
          Total Frames: {frameCount}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default CameraFeed;
