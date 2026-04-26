import React, { useEffect, useRef, useState } from 'react';
import { usePoseAnalysis } from './usePoseAnalysis';
import Feedback from './Feedback';
import Controls from './Controls';

function CameraFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [feedbackVisible, setFeedbackVisible] = useState(true);

  // Initialize pose analysis hook
  const poseAnalysis = usePoseAnalysis(
    videoRef.current,
    canvasRef.current,
    {
      frameInterval: 2, // Analyze every 2nd frame for performance
      bufferSize: 60, // Buffer up to 60 frames (2 seconds at 30fps)
      autoAnalyze: false, // Manual trigger via buttons
      onScoreUpdate: (score) => {
        console.log('Score updated:', score);
      },
      onFeedbackUpdate: (feedback) => {
        console.log('Feedback updated:', feedback);
      },
      onError: (error) => {
        console.error('Pose analysis error:', error);
      },
    }
  );

  // Initialize camera stream
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Unable to access camera:', error);
        poseAnalysis.onError?.(error);
      }
    };

    startCamera();

    return () => {
      mounted = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Sync canvas size with video
  useEffect(() => {
    const syncCanvasSize = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        return;
      }

      const { width, height } = video.getBoundingClientRect();

      if (!width || !height) {
        return;
      }

      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const video = videoRef.current;

    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    if (video) {
      video.addEventListener('loadedmetadata', syncCanvasSize);
      video.addEventListener('play', syncCanvasSize);
    }

    return () => {
      window.removeEventListener('resize', syncCanvasSize);

      if (video) {
        video.removeEventListener('loadedmetadata', syncCanvasSize);
        video.removeEventListener('play', syncCanvasSize);
      }
    };
  }, []);

  const handleStart = () => {
    poseAnalysis.startRecording();
  };

  const handleStop = async () => {
    await poseAnalysis.stopRecordingAndAnalyze();
  };

  const handleAnalyzeLatest = () => {
    poseAnalysis.analyzeLatestFrame();
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        />
      </div>

      <div style={{ padding: '16px', backgroundColor: '#f5f5f5' }}>
        <Controls
          onStart={handleStart}
          onStop={handleStop}
          isRecording={poseAnalysis.isRecording}
          isAnalyzing={poseAnalysis.isAnalyzing}
        />
      </div>

      {feedbackVisible && (
        <div style={{ padding: '16px', backgroundColor: '#fff' }}>
          <Feedback
            score={poseAnalysis.currentScore}
            message={poseAnalysis.currentFeedback}
            frameCount={poseAnalysis.frameCount}
            bufferedFrames={poseAnalysis.bufferedFrameCount}
          />
        </div>
      )}

      <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
        Frames: {poseAnalysis.frameCount} | Buffered: {poseAnalysis.bufferedFrameCount}
      </div>
    </div>
  );
}

export default CameraFeed;
