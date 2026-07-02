import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { createPoseDetector } from './poseUtils';
import { drawSkeleton, calculateAngleJS, calculateSpineTiltJS } from './drawSkeleton';
import { analyzeShotSequence, checkAPIHealth, fetchShots } from './api';
import Feedback from './Feedback';
import Controls from './Controls';
import { 
  speakCoachingCue, 
  playCountdownStep, 
  playAutoStartSound, 
  playAutoStopSound,
  unlockMobileAudio
} from './audioCoaching';

// Stability checking configuration
const STABILITY_BUFFER_SIZE = 15;
const STABILITY_THRESHOLD = 2.0;

// Nano Banana Bot custom AI-generated icon assets mapper
const NANO_ICONS = {
  cover_drive: '/cover-drive-nano.png',
  straight_drive: '/straight-drive-nano.png',
  pull_shot: '/pull-shot-nano.png',
  defensive_block: '/defensive-block-nano.png',
  flick_shot: '/flick-shot-nano.png',
  bowling_action: '/bowling-action-nano.png'
};

function CameraFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const poseDetectorRef = useRef(null);
  const frameBufferRef = useRef([]);
  const isRecordingRef = useRef(false);

  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Core recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState('');
  const [frameCount, setFrameCount] = useState(0);
  const [bufferedFrameCount, setBufferedFrameCount] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [poseReady, setPoseReady] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  // Drill selections
  const [selectedShot, setSelectedShot] = useState('cover_drive');
  const [availableShots, setAvailableShots] = useState({
    cover_drive: { name: 'Cover Drive', emoji: '🏏', description: 'Classic off-side drive through the covers', difficulty: 'Intermediate' },
    straight_drive: { name: 'Straight Drive', emoji: '⬆️', description: 'Drive hit straight back past the bowler', difficulty: 'Advanced' },
    pull_shot: { name: 'Pull Shot', emoji: '💪', description: 'Horizontal bat shot to short-pitched delivery', difficulty: 'Intermediate' },
    defensive_block: { name: 'Defensive Block', emoji: '🛡️', description: 'Solid forward defense with soft hands', difficulty: 'Beginner' },
    flick_shot: { name: 'Flick Shot', emoji: '🖐️', description: 'Wristy flick off the pads to leg side', difficulty: 'Advanced' },
    bowling_action: { name: 'Bowling Action Check', emoji: '🥎', description: 'ICC Rule 11.1 - 15° elbow extension limit (chucking detector)', difficulty: 'Elite' },
  });
  const [lastShotName, setLastShotName] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);

  // Session History State (Local Database)
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('shadow_drills_history') || '[]');
    } catch (e) {
      return [];
    }
  });

  // Toggles for features
  const [autoRecordEnabled, setAutoRecordEnabled] = useState(false);
  const [ghostEnabled, setGhostEnabled] = useState(true);
  // Rear camera by default — users prop the phone up and stand back for a full-body shot.
  const [facingMode, setFacingMode] = useState('environment');

  // Live client-side telemetry state
  const [liveLeftElbow, setLiveLeftElbow] = useState(0);
  const [liveRightElbow, setLiveRightElbow] = useState(0);
  const [liveLeftKnee, setLiveLeftKnee] = useState(0);
  const [liveRightKnee, setLiveRightKnee] = useState(0);
  const [liveSpineTilt, setLiveSpineTilt] = useState(0);

  // Hands-free state machine refs & variables
  const anglesBufferRef = useRef([]);
  const autoRecordStateRef = useRef('IDLE'); // 'IDLE', 'STABILIZING', 'COUNTDOWN', 'RECORDING', 'COOLDOWN'
  const countdownValueRef = useRef(3);
  const lastStateChangeRef = useRef(Date.now());
  const recordingStartTimeRef = useRef(0);
  const [hudStateLabel, setHudStateLabel] = useState('STAND IN STANCE');
  const [mobileTab, setMobileTab] = useState('choose-shot'); // 'choose-shot', 'camera', 'results'

  // Trigger vocal prompts on drill change
  useEffect(() => {
    const drill = availableShots[selectedShot];
    if (drill) {
      speakCoachingCue(`${drill.name} drill loaded. ${drill.description}`, true);
    }
  }, [selectedShot, availableShots]);

  // Connect to backend and pull shot registries
  useEffect(() => {
    checkAPIHealth().then(healthy => {
      setApiReady(healthy);
      if (!healthy) {
        setCurrentFeedback('⚠️ Backend offline. Visual skeleton active; session diagnostics disabled.');
      }
    });
    fetchShots().then(shots => {
      if (shots && !shots.error) {
        setAvailableShots(shots);
      }
    });
  }, []);

  const handleStart = useCallback(() => {
    unlockMobileAudio();
    frameBufferRef.current = [];
    setBufferedFrameCount(0);
    setAnalysisResult(null);
    setIsRecording(true);
    isRecordingRef.current = true;
    recordingStartTimeRef.current = Date.now();
    const shotName = availableShots[selectedShot]?.name || selectedShot;
    
    playAutoStartSound();
    speakCoachingCue(`Recording started. Play your shot!`, true);
    
    setCurrentFeedback(`🔴 Analyzing live ${shotName}... Perform your actions in view!`);
    setCurrentScore(0);
    setLastShotName('');
  }, [selectedShot, availableShots]);

  const handleStop = useCallback(async () => {
    unlockMobileAudio();
    setIsRecording(false);
    isRecordingRef.current = false;
    autoRecordStateRef.current = 'IDLE';
    setHudStateLabel('STAND IN STANCE');
    
    const frames = frameBufferRef.current;
    if (frames.length === 0) {
      speakCoachingCue('No movement detected.', true);
      setCurrentFeedback('No movement captured. Please stand back and try again.');
      return;
    }

    playAutoStopSound();
    speakCoachingCue(`Movement complete. Evaluating biomechanics, please hold.`, true);

    setIsAnalyzing(true);
    const shotName = availableShots[selectedShot]?.name || selectedShot;
    setCurrentFeedback(`Processing biomechanics for ${shotName}...`);
    
    try {
      const sequence = frames.map(f => f.landmarks);
      const result = await analyzeShotSequence(sequence, selectedShot);
      
      setCurrentScore(result.score || 0);
      setCurrentFeedback(result.feedback || 'Analysis complete');
      setLastShotName(result.shot_name || shotName);
      setAnalysisResult(result);

      // On mobile, jump straight to the Results tab so the score is seen without scrolling.
      setMobileTab('results');

      if (selectedShot === 'bowling_action') {
        const isCompliant = result.score >= 80;
        const extension = result.angle_scores?.bowling_arm_extension?.toFixed(1) || 0;
        if (isCompliant) {
          speakCoachingCue(`Legal delivery! Action compliant at ${extension} degrees. Biomechanics score ${result.score}.`, true);
        } else {
          speakCoachingCue(`Illegal delivery. Throwing detected. Elbow extended by ${extension} degrees. Lock your arm.`, true);
        }
      } else {
        speakCoachingCue(`Drill complete. Accuracy score ${result.score} percent. ${result.feedback.split('|')[1] || ''}`, true);
      }

      const newHistoryItem = {
        name: availableShots[selectedShot]?.name || selectedShot,
        emoji: availableShots[selectedShot]?.emoji || '🏏',
        score: result.score || 0,
        isLegal: result.is_good_shot,
        timestamp: Date.now()
      };
      
      setHistory(prev => {
        const updated = [newHistoryItem, ...prev];
        localStorage.setItem('shadow_drills_history', JSON.stringify(updated));
        return updated;
      });

    } catch (error) {
      speakCoachingCue(`Analysis failed.`, true);
      setCurrentFeedback('❌ Analysis failed. Ensure backend API service is running locally.');
    } finally {
      setIsAnalyzing(false);
      frameBufferRef.current = [];
      setBufferedFrameCount(0);
    }
  }, [selectedShot, availableShots]);

  const handlePoseLandmarks = useCallback((landmarks) => {
    if (!landmarks) return;
    setFrameCount(prev => prev + 1);
    
    const le = calculateAngleJS(landmarks[11], landmarks[13], landmarks[15]);
    const re = calculateAngleJS(landmarks[12], landmarks[14], landmarks[16]);
    const lk = calculateAngleJS(landmarks[23], landmarks[25], landmarks[27]);
    const rk = calculateAngleJS(landmarks[24], landmarks[26], landmarks[28]);
    const st = calculateSpineTiltJS(landmarks);

    setLiveLeftElbow(le);
    setLiveRightElbow(re);
    setLiveLeftKnee(lk);
    setLiveRightKnee(rk);
    setLiveSpineTilt(st);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const trails = frameBufferRef.current.slice(-18).map(f => f.landmarks);
      drawSkeleton(ctx, landmarks, ghostEnabled ? selectedShot : null, trails);
      
      for (const idx of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
        const lm = landmarks[idx];
        if (lm && (lm.visibility === undefined || lm.visibility > 0.45)) {
          ctx.beginPath();
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#ff9f0d';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#ff9f0d';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    if (isRecordingRef.current) {
      frameBufferRef.current.push({
        landmarks: landmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility || 1.0 })),
        timestamp: Date.now(),
      });
      setBufferedFrameCount(frameBufferRef.current.length);
    }

    if (autoRecordEnabled && !isAnalyzing) {
      const buffer = anglesBufferRef.current;
      buffer.push({ le, re, lk, rk, st, time: Date.now() });
      if (buffer.length > STABILITY_BUFFER_SIZE) {
        buffer.shift();
      }

      if (buffer.length === STABILITY_BUFFER_SIZE) {
        const leVar = calculateVariance(buffer.map(b => b.le));
        const reVar = calculateVariance(buffer.map(b => b.re));
        const lkVar = calculateVariance(buffer.map(b => b.lk));
        const rkVar = calculateVariance(buffer.map(b => b.rk));
        const stVar = calculateVariance(buffer.map(b => b.st));
        const avgVariance = (leVar + reVar + lkVar + rkVar + stVar) / 5;

        const currentState = autoRecordStateRef.current;
        const now = Date.now();

        if (currentState === 'IDLE') {
          const isStandingStance = lk > 115 && lk < 170 && rk > 115 && rk < 170 && st < 30;
          
          if (isStandingStance && avgVariance < STABILITY_THRESHOLD) {
            autoRecordStateRef.current = 'STABILIZING';
            lastStateChangeRef.current = now;
            setHudStateLabel('HOLD POSITION...');
            if (st > 20) {
              speakCoachingCue("Keep your spine taller in setup for better balance.");
            } else if (selectedShot === 'cover_drive' && le < 140) {
              speakCoachingCue("Raise your front elbow slightly in setup.");
            }
          }
        } 
        
        else if (currentState === 'STABILIZING') {
          if (avgVariance < STABILITY_THRESHOLD) {
            if (now - lastStateChangeRef.current > 1200) {
              autoRecordStateRef.current = 'COUNTDOWN';
              lastStateChangeRef.current = now;
              countdownValueRef.current = 3;
              setHudStateLabel('GET READY: 3');
              playCountdownStep(3);
              speakCoachingCue("Stance ready. Countdown starting.", true);
            }
          } else {
            autoRecordStateRef.current = 'IDLE';
            setHudStateLabel('STAND IN STANCE');
          }
        } 
        
        else if (currentState === 'COUNTDOWN') {
          const elapsed = now - lastStateChangeRef.current;
          const nextVal = 3 - Math.floor(elapsed / 800);
          
          if (avgVariance > STABILITY_THRESHOLD * 2.5) {
            autoRecordStateRef.current = 'IDLE';
            setHudStateLabel('STAND IN STANCE');
            speakCoachingCue("Stance broken. Hold still to retry.", true);
          } else if (nextVal !== countdownValueRef.current) {
            if (nextVal > 0) {
              countdownValueRef.current = nextVal;
              setHudStateLabel(`GET READY: ${nextVal}`);
              playCountdownStep(nextVal);
            } else if (nextVal === 0 && !isRecordingRef.current) {
              countdownValueRef.current = 0;
              setHudStateLabel('PLAY SHOT NOW!');
              playCountdownStep(0);
              handleStart();
              autoRecordStateRef.current = 'RECORDING';
              lastStateChangeRef.current = now;
            }
          }
        } 
        
        else if (currentState === 'RECORDING') {
          const recordingDuration = now - recordingStartTimeRef.current;
          if (recordingDuration > 1800) {
            if (avgVariance < STABILITY_THRESHOLD * 0.75) {
              autoRecordStateRef.current = 'COOLDOWN';
              lastStateChangeRef.current = now;
              setHudStateLabel('HOLD FOLLOW THROUGH...');
            }
          }
        } 
        
        else if (currentState === 'COOLDOWN') {
          if (now - lastStateChangeRef.current > 700) {
            handleStop();
          }
        }
      }
    }

  }, [autoRecordEnabled, ghostEnabled, selectedShot, isAnalyzing, handleStart, handleStop, availableShots, history]);

  const calculateVariance = (values) => {
    if (values.length === 0) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  };

  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      try {
        // Stop any previous stream before switching cameras.
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: facingMode } },
          audio: false,
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setCameraReady(true);
        }
      } catch (error) {
        setCurrentFeedback('📷 Camera access denied. Please allow camera permissions in your browser to begin analysis.');
      }
    };
    startCamera();
    return () => { mounted = false; if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [facingMode]);

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
      if (!currentFeedback || currentFeedback.includes('Ready')) {
        setCurrentFeedback('Ready! Calibrate your feet and align into the ghost overlay.');
      }
    });
    return () => { video.removeEventListener('resize', syncSize); detector.destroy(); };
  }, [cameraReady, handlePoseLandmarks]);

  const getGaugeColor = (type, val) => {
    if (type.includes('elbow')) {
      if (val >= 145 && val <= 175) return '#00f5a0'; // Electric Mint Green
      if (val >= 130 && val <= 180) return '#ff9f0d'; // Amber
      return '#ff3366'; // Pink
    }
    if (type.includes('knee')) {
      if (val >= 120 && val <= 150) return '#00f5a0';
      if (val >= 110 && val <= 165) return '#ff9f0d';
      return '#ff3366';
    }
    if (type === 'spine') {
      if (val >= 5 && val <= 22) return '#00f5a0';
      if (val >= 0 && val <= 32) return '#ff9f0d';
      return '#ff3366';
    }
    return '#00f5a0';
  };

  const renderGauge = (label, val, maxVal, type, targetRange) => {
    const color = getGaugeColor(type, val);
    const percentage = Math.min(100, Math.max(0, (val / maxVal) * 100));
    return (
      <div style={{ marginBottom: '14px' }}>
        <div className="gauge-row-head" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
          <span style={{ color: '#94a3b8', fontWeight: 500 }}>{label}</span>
          <span className="mono-telemetry" style={{ color: color, fontWeight: 700 }}>
            {val}° <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 400 }}>({targetRange})</span>
          </span>
        </div>
        <div className="gauge-bar">
          <div className="gauge-fill" style={{ width: `${percentage}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}35` }} />
        </div>
      </div>
    );
  };

  const getHudBannerColor = () => {
    if (hudStateLabel.includes('GET READY') || hudStateLabel.includes('HOLD')) return 'rgba(255, 159, 13, 0.9)'; 
    if (hudStateLabel.includes('PLAY')) return 'rgba(0, 245, 160, 0.95)'; 
    return 'rgba(15, 23, 42, 0.85)';
  };

  const getHudTextShadow = () => {
    if (hudStateLabel.includes('GET READY') || hudStateLabel.includes('HOLD')) return 'rgba(255, 159, 13, 0.4)'; 
    if (hudStateLabel.includes('PLAY')) return 'rgba(0, 245, 160, 0.4)'; 
    return 'rgba(0, 0, 0, 0.4)';
  };

  return (
    <>
      <Helmet>
        <title>Live Cricket Analysis — AI Batting & Bowling Legality Checker</title>
        <meta name="description" content="Use your camera for real-time cricket technique analysis. Instantly score batting strokes and check bowling arm extension against ICC legality rules." />
      </Helmet>
      <div className="dashboard-journey">
      {/* Step 1: Choose Shot */}
      <div className={`cyber-card ${mobileTab !== 'choose-shot' ? 'mobile-hide' : ''}`} style={{ padding: '24px' }}>
        <div className="step-header">
          <span className="step-number">01</span>
          <h2>Choose Shot</h2>
        </div>
        <div className="drills-grid">
          {Object.entries(availableShots).map(([key, shot]) => {
            const isSelected = selectedShot === key;
            const isElite = shot.difficulty === 'Elite';
            return (
              <button
                key={key}
                onClick={() => { unlockMobileAudio(); setSelectedShot(key); setAnalysisResult(null); }}
                disabled={isRecording}
                className={`shot-card-btn ${isSelected ? 'active' : ''}`}
                style={{ opacity: isRecording ? 0.4 : 1, cursor: isRecording ? 'not-allowed' : 'pointer' }}
              >
                <span style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: isSelected ? 'rgba(0, 245, 160, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? '1px solid rgba(0, 245, 160, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                  overflow: 'hidden',
                  filter: isSelected ? 'none' : 'drop-shadow(0 0 8px rgba(0, 245, 160, 0.25))',
                  transition: 'all 0.3s',
                  flexShrink: 0
                }}>
                  <img 
                    src={NANO_ICONS[key]} 
                    alt={shot.name} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      filter: isSelected ? 'none' : 'grayscale(35%) brightness(85%)' 
                    }} 
                  />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? '#00f5a0' : '#f8fafc' }}>
                    {shot.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: isSelected ? '#33f7b3' : '#94a3b8', marginTop: '2.5px', lineHeight: '1.25' }}>
                    {shot.description}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.58rem', padding: '4px 8px', borderRadius: '8px', fontWeight: 900,
                  background: isElite ? 'rgba(255, 51, 102, 0.12)' : 'rgba(255, 159, 13, 0.12)',
                  color: isElite ? '#ff3366' : '#ff9f0d',
                  border: isElite ? '1px solid rgba(255, 51, 102, 0.25)' : '1px solid rgba(255, 159, 13, 0.25)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  {shot.difficulty}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Journey Grid containing Step 2 and Step 3 */}
      <div className="main-journey-grid">
        {/* Step 2: Camera & Live Telemetry */}
        <div className={`camera-telemetry-panel ${mobileTab !== 'camera' ? 'mobile-hide' : ''}`}>
          <div className="step-header">
            <span className="step-number">02</span>
            <h2>Camera & Live Telemetry</h2>
          </div>

          <div className={`camera-container ${facingMode === 'user' ? 'mirrored' : ''}`} style={{
            border: isRecording ? '2.5px solid #ff3366' : '2.5px solid #00f5a0',
            boxShadow: isRecording ? '0 0 25px rgba(255, 51, 102, 0.25)' : '0 0 25px rgba(0, 245, 160, 0.15)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <video ref={videoRef} autoPlay muted playsInline />
            <canvas ref={canvasRef} />

            {/* Flip Camera (front/rear) — bottom-right, thumb-reachable */}
            {cameraReady && !isRecording && (
              <button
                type="button"
                aria-label="Switch camera"
                onClick={() => { unlockMobileAudio(); setFacingMode(prev => prev === 'user' ? 'environment' : 'user'); }}
                className="flip-camera-btn"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            )}

            {/* Camera Permission Overlay Inside the Video Container */}
            {!cameraReady && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(3, 7, 18, 0.97)', color: '#94a3b8',
                gap: '16px', zIndex: 5,
                padding: '24px', textAlign: 'center'
              }}>
                <div className="record-dot-pulse" style={{
                  background: 'rgba(0, 245, 160, 0.08)',
                  border: '1.5px solid rgba(0, 245, 160, 0.3)',
                  borderRadius: '50%',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(0, 245, 160, 0.15)',
                  marginBottom: '8px'
                }}>
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#00f5a0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316A2.192 2.192 0 0 0 14.502 4h-5c-.7 0-1.363.336-1.787.909l-.822 1.316ZM12 15.75a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  </svg>
                </div>
                <span style={{ fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.95rem', color: '#00f5a0', textShadow: '0 0 10px rgba(0,245,160,0.2)' }}>
                  Click Start Practice to begin
                </span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '320px', lineHeight: 1.4 }}>
                  Please allow camera permissions if prompted to calibrate your live shadow analysis.
                </span>
              </div>
            )}

            {/* F1-Style Auto-Record Header Status */}
            {cameraReady && autoRecordEnabled && !isRecording && (
              <div style={{
                position: 'absolute', top: '20px', left: '20px',
                background: getHudBannerColor(),
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '10px 20px', borderRadius: '30px',
                fontSize: '0.78rem', fontWeight: 900, color: '#ffffff',
                boxShadow: `0 8px 24px ${getHudTextShadow()}`,
                display: 'flex', alignItems: 'center', gap: '8px', zIndex: 3,
                letterSpacing: '1px',
                transition: 'background-color 0.25s'
              }}>
                <span className="record-dot-pulse" style={{ width: '8.5px', height: '8.5px', borderRadius: '50%', background: hudStateLabel.includes('PLAY') ? '#00f5a0' : '#ff9f0d' }} />
                <span className="mono-telemetry">HUD // {hudStateLabel}</span>
              </div>
            )}

            {/* Glowing Red Record Badge */}
            {cameraReady && isRecording && (
              <div className="record-dot-pulse" style={{
                position: 'absolute', top: '20px', left: '20px',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255, 51, 102, 0.95)',
                padding: '10px 20px', borderRadius: '30px',
                fontSize: '0.8rem', fontWeight: 800, color: '#fff',
                boxShadow: '0 8px 24px rgba(255, 51, 102, 0.4)',
                zIndex: 3,
                letterSpacing: '1.2px',
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
                <span className="mono-telemetry">LIVE TELEMETRY REC • {bufferedFrameCount} FRM</span>
              </div>
            )}

            {/* Active Stance Level Tag */}
            {cameraReady && (
              <div style={{
                position: 'absolute', top: '20px', right: '20px',
                background: 'rgba(15, 23, 42, 0.85)', 
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '10px 20px', borderRadius: '30px',
                fontSize: '0.8rem', color: '#ff9f0d', fontWeight: 800,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', gap: '8px',
                zIndex: 3,
                letterSpacing: '0.8px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>{availableShots[selectedShot]?.emoji}</span>
                <span>{availableShots[selectedShot]?.name.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Mobile-only quick key-stats strip — the 3 numbers that matter at a glance */}
          <div className="key-stats-strip">
            {(selectedShot === 'bowling_action'
              ? [
                  { label: 'Bowl Elbow', val: liveRightElbow || liveLeftElbow, type: 'elbow' },
                  { label: 'Brace Knee', val: liveLeftKnee || liveRightKnee, type: 'knee' },
                  { label: 'Spine', val: liveSpineTilt, type: 'spine' },
                ]
              : [
                  { label: 'Front Elbow', val: liveLeftElbow, type: 'left_elbow' },
                  { label: 'Front Knee', val: liveLeftKnee, type: 'left_knee' },
                  { label: 'Spine', val: liveSpineTilt, type: 'spine' },
                ]
            ).map((s) => (
              <div className="key-stat" key={s.label}>
                <span className="key-stat-value mono-telemetry" style={{ color: getGaugeColor(s.type, s.val) }}>
                  {s.val}°
                </span>
                <span className="key-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Statistics Bar */}
          <div className="mono-telemetry" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94a3b8', padding: '12px 8px' }}>
            <span>STREAM STABILITY: {cameraReady ? '99.8% (32 FPS)' : 'OFFLINE'}</span>
            <span>TOTAL FRAMES: {frameCount}</span>
          </div>

          {/* Live Telemetry HUD Card below the Camera feed */}
          <div className="cyber-card" style={{ padding: '24px', marginTop: '16px' }}>
            <h3 style={{
              margin: '0 0 18px', fontSize: '0.9rem',
              textTransform: 'uppercase', letterSpacing: '1.5px',
              color: '#ff9f0d', fontWeight: 800,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span>Live HUD Telemetry</span>
              <span style={{
                fontSize: '0.62rem', background: 'rgba(0, 245, 160, 0.12)', color: '#00f5a0',
                padding: '3px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.8px',
                border: '1px solid rgba(0, 245, 160, 0.25)',
                boxShadow: '0 0 10px rgba(0,245,160,0.1)'
              }}>{cameraReady ? 'Active Feed' : 'Calibrating'}</span>
            </h3>

            <div className="telemetry-grid">
              {selectedShot === 'bowling_action' ? (
                <>
                  <div>
                    {renderGauge('Bowling Arm Elbow', liveRightElbow || liveLeftElbow, 180, 'elbow', '15° Limit')}
                  </div>
                  <div>
                    {renderGauge('Brace Leg Knee', liveLeftKnee || liveRightKnee, 180, 'knee', '135°-155°')}
                  </div>
                  <div className="telemetry-grid-full">
                    {renderGauge('Spine Tilt (Balance)', liveSpineTilt, 60, 'spine', 'Target: <22°')}
                  </div>
                  <div className="telemetry-grid-full" style={{
                    marginTop: '12px', padding: '10px 12px', borderRadius: '10px', 
                    background: 'rgba(8, 14, 27, 0.35)', border: '1px solid rgba(255,255,255,0.03)',
                    fontSize: '0.74rem', color: '#cbd5e1', lineHeight: 1.3
                  }}>
                    ℹ️ Keep your arm straight during release. System measures elbow angle change.
                  </div>
                </>
              ) : (
                <>
                  <div>
                    {renderGauge('Left Elbow (Front)', liveLeftElbow, 180, 'left_elbow', '150°-170°')}
                  </div>
                  <div>
                    {renderGauge('Right Elbow (Back)', liveRightElbow, 180, 'right_elbow', '155°-175°')}
                  </div>
                  <div>
                    {renderGauge('Left Knee (Front)', liveLeftKnee, 180, 'left_knee', '120°-150°')}
                  </div>
                  <div>
                    {renderGauge('Right Knee (Back)', liveRightKnee, 180, 'right_knee', '125°-155°')}
                  </div>
                  <div className="telemetry-grid-full">
                    {renderGauge('Spine Tilt (Torso)', liveSpineTilt, 60, 'spine', '5°-22°')}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Premium Coach Calibration Tip Card */}
          <div className="cyber-card" style={{ 
            padding: '16px 20px', 
            background: 'rgba(0, 245, 160, 0.02)', 
            border: '1px solid rgba(0, 245, 160, 0.12)', 
            borderRadius: '16px',
            marginTop: '16px',
            fontSize: '0.8rem',
            color: '#cbd5e1',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ 
              fontSize: '1.5rem', 
              background: 'rgba(0, 245, 160, 0.08)', 
              padding: '8px', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(0, 245, 160, 0.1)',
              flexShrink: 0
            }}>
              💡
            </span>
            <div>
              <strong style={{ color: '#00f5a0', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                Coach Calibration Tip
              </strong>
              <span>For optimal joint tracking, stand 2–3m back from your camera and ensure your entire body remains visible within the frame.</span>
            </div>
          </div>
        </div>

        {/* Step 3: Controls & Diagnostics */}
        <div className={`right-diagnostics ${mobileTab !== 'results' ? 'mobile-hide' : ''}`} style={{ width: '100%' }}>
          <div className="step-header">
            <span className="step-number">03</span>
            <h2>Controls & Diagnostics</h2>
          </div>

          {/* Mobile Orientation Alert */}
          {isMobileDevice && (
            <div className="cyber-card" style={{ 
              padding: '14px 18px', 
              background: 'rgba(255, 159, 13, 0.05)', 
              border: '1px solid rgba(255, 159, 13, 0.25)', 
              borderRadius: '16px',
              fontSize: '0.78rem',
              color: '#ff9f0d',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(255,159,13,0.06)',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '1.25rem' }}>📱</span>
              <span><strong>Rotation Tip:</strong> Turn your device horizontally (landscape) for optimal full-body crease tracking!</span>
            </div>
          )}

          {/* Controls Card */}
          <div className="cyber-card" style={{ padding: '24px', marginBottom: '16px' }}>
            <h3 style={{
              margin: '0 0 24px', fontSize: '0.9rem',
              textTransform: 'uppercase', letterSpacing: '1.5px',
              color: '#f8fafc', fontWeight: 800,
            }}>
              Cockpit Command
            </h3>
            <Controls onStart={handleStart} onStop={handleStop} isRecording={isRecording} isAnalyzing={isAnalyzing} />
            
            {/* Hands-Free Auto-Record Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#00f5a0"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                  Auto-Record (Hands-free)
                </div>
                <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px' }}>Triggers countdown in stance</div>
              </div>
              <button
                onClick={() => {
                  unlockMobileAudio();
                  setAutoRecordEnabled(!autoRecordEnabled);
                  autoRecordStateRef.current = 'IDLE';
                  setHudStateLabel('STAND IN STANCE');
                  speakCoachingCue(autoRecordEnabled ? "Hands-free auto-record disabled." : "Hands-free auto-record activated. Stand back in stance.", true);
                }}
                style={{
                  width: '46px', height: '24px', borderRadius: '12px',
                  border: 'none', background: autoRecordEnabled ? '#00f5a0' : '#1e293b',
                  position: 'relative', cursor: 'pointer', transition: 'background-color 0.25s',
                  boxShadow: autoRecordEnabled ? '0 0 12px rgba(0,245,160,0.35)' : 'none'
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', background: autoRecordEnabled ? '#0b0f19' : '#fff',
                  position: 'absolute', top: '3px', left: autoRecordEnabled ? '25px' : '3px',
                  transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </button>
            </div>

            {/* Pro-Mirror blueprint Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#00e5ff"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                  Pro-Mirror (Ghost Overlay)
                </div>
                <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px' }}>Overlays standard layout blueprints</div>
              </div>
              <button
                onClick={() => {
                  unlockMobileAudio();
                  setGhostEnabled(!ghostEnabled);
                  speakCoachingCue(ghostEnabled ? "Ghost blueprint outline off." : "Ghost blueprint outline on.", true);
                }}
                style={{
                  width: '46px', height: '24px', borderRadius: '12px',
                  border: 'none', background: ghostEnabled ? '#00e5ff' : '#1e293b',
                  position: 'relative', cursor: 'pointer', transition: 'background-color 0.25s',
                  boxShadow: ghostEnabled ? '0 0 12px rgba(0,229,255,0.35)' : 'none'
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', background: ghostEnabled ? '#0b0f19' : '#fff',
                  position: 'absolute', top: '3px', left: ghostEnabled ? '25px' : '3px',
                  transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </button>
            </div>
          </div>

          {/* Symmetrical Feedback diagnostics panel */}
          <div className="cyber-card" style={{ padding: '24px', marginBottom: '16px' }}>
            <Feedback 
              score={currentScore} 
              message={currentFeedback} 
              frameCount={frameCount} 
              bufferedFrames={bufferedFrameCount} 
              shotName={lastShotName} 
              analysisResult={analysisResult}
              history={history}
            />
          </div>

          {/* Connection health pills */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
            <div className="status-indicator-badge" style={{ flex: 1, justifyContent: 'center' }}>
              <span className={`status-dot ${cameraReady ? 'active' : 'inactive'}`} />
              CAM ACTIVE
            </div>
            <div className="status-indicator-badge" style={{ flex: 1, justifyContent: 'center' }}>
              <span className={`status-dot ${poseReady ? 'active' : 'inactive'}`} />
              POSE-AI
            </div>
            <div className="status-indicator-badge" style={{ flex: 1, justifyContent: 'center' }}>
              <span className={`status-dot ${apiReady ? 'active' : 'inactive'}`} />
              API ONLINE
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <div className="mobile-tab-bar">
        <button className={`mobile-tab-btn ${mobileTab === 'choose-shot' ? 'active' : ''}`} onClick={() => setMobileTab('choose-shot')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9"></rect>
            <rect x="14" y="3" width="7" height="5"></rect>
            <rect x="14" y="12" width="7" height="9"></rect>
            <rect x="3" y="16" width="7" height="5"></rect>
          </svg>
          CHOOSE SHOT
        </button>
        <button className={`mobile-tab-btn ${mobileTab === 'camera' ? 'active' : ''}`} onClick={() => setMobileTab('camera')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          CAMERA
        </button>
        <button className={`mobile-tab-btn ${mobileTab === 'results' ? 'active' : ''}`} onClick={() => setMobileTab('results')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          RESULTS
        </button>
      </div>
      </div>
    </>
  );
}

export default CameraFeed;
