/**
 * Custom React Hook: usePoseAnalysis
 * 
 * Integrates MediaPipe pose detection, canvas drawing, frame buffering,
 * and API communication into a single reusable hook for pose analysis.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPoseDetector } from './poseUtils';
import { drawSkeleton } from './drawSkeleton';
import { analyzeFrame, analyzeShotSequence } from './api';

/**
 * Custom hook for complete pose analysis workflow
 * 
 * @param {HTMLVideoElement} videoElement - Video element for pose detection
 * @param {HTMLCanvasElement} canvasElement - Canvas element for drawing
 * @param {Object} options - Configuration options
 * @returns {Object} Analysis state and control methods
 */
export function usePoseAnalysis(videoElement, canvasElement, options = {}) {
  const {
    frameInterval = 1, // Analyze every Nth frame
    bufferSize = 30, // Frames to buffer for sequence analysis
    autoAnalyze = false, // Auto-analyze frames
    onScoreUpdate = () => {},
    onFeedbackUpdate = () => {},
    onError = () => {},
  } = options;

  // State management
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);

  // Refs for pose detection and buffering
  const poseDetectorRef = useRef(null);
  const frameBufferRef = useRef([]);
  const canvasContextRef = useRef(null);
  const lastAnalyzedFrameRef = useRef(0);
  const poseCallbackRef = useRef(null);

  /**
   * Handle pose landmarks from MediaPipe
   */
  const handlePoseLandmarks = useCallback(
    async (landmarks) => {
      if (!landmarks) return;

      // Increment frame counter
      const newFrameCount = frameCount + 1;
      setFrameCount(newFrameCount);

      // Draw skeleton on canvas
      if (canvasContextRef.current && canvasElement) {
        canvasContextRef.current.clearRect(
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
        canvasContextRef.current.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        canvasContextRef.current.lineWidth = 2;
        drawSkeleton(canvasContextRef.current, landmarks);
      }

      // Buffer frame if recording
      if (isRecording) {
        frameBufferRef.current.push({
          landmarks: landmarks,
          timestamp: Date.now(),
        });

        // Keep buffer at specified size
        if (frameBufferRef.current.length > bufferSize) {
          frameBufferRef.current.shift();
        }
      }

      // Analyze frame if interval has passed
      if (
        autoAnalyze &&
        newFrameCount - lastAnalyzedFrameRef.current >= frameInterval &&
        !isAnalyzing
      ) {
        lastAnalyzedFrameRef.current = newFrameCount;
        analyzeCurrentFrame(landmarks);
      }
    },
    [frameCount, isRecording, bufferSize, frameInterval, autoAnalyze, isAnalyzing, canvasElement]
  );

  /**
   * Initialize MediaPipe pose detector
   */
  useEffect(() => {
    if (!videoElement) return;

    try {
      poseDetectorRef.current = createPoseDetector(
        videoElement,
        handlePoseLandmarks
      );
      poseDetectorRef.current.start();

      if (canvasElement) {
        canvasContextRef.current = canvasElement.getContext('2d');
      }
    } catch (error) {
      console.error('Failed to initialize pose detector:', error);
      onError(error);
    }

    return () => {
      if (poseDetectorRef.current) {
        poseDetectorRef.current.destroy();
      }
    };
  }, [videoElement, canvasElement, handlePoseLandmarks, onError]);

  /**
   * Analyze current frame using backend API
   */
  const analyzeCurrentFrame = useCallback(
    async (landmarks) => {
      setIsAnalyzing(true);
      try {
        const result = await analyzeFrame(landmarks);
        setCurrentScore(result.score || 0);
        setCurrentFeedback(result.feedback || '');
        onScoreUpdate(result.score);
        onFeedbackUpdate(result.feedback);
      } catch (error) {
        console.error('Frame analysis error:', error);
        onError(error);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [onScoreUpdate, onFeedbackUpdate, onError]
  );

  /**
   * Start recording frames for sequence analysis
   */
  const startRecording = useCallback(() => {
    frameBufferRef.current = [];
    setIsRecording(true);
    setFrameCount(0);
  }, []);

  /**
   * Stop recording and analyze the complete sequence
   */
  const stopRecordingAndAnalyze = useCallback(async () => {
    setIsRecording(false);

    if (frameBufferRef.current.length === 0) {
      setCurrentFeedback('No frames captured');
      return;
    }

    setIsAnalyzing(true);
    try {
      const sequence = frameBufferRef.current.map((frame) => frame.landmarks);
      const result = await analyzeShotSequence(sequence);
      setCurrentScore(result.score || 0);
      setCurrentFeedback(result.feedback || 'Analysis complete');
      onScoreUpdate(result.score);
      onFeedbackUpdate(result.feedback);
    } catch (error) {
      console.error('Sequence analysis error:', error);
      onError(error);
    } finally {
      setIsAnalyzing(false);
      frameBufferRef.current = [];
    }
  }, [onScoreUpdate, onFeedbackUpdate, onError]);

  /**
   * Manually trigger frame analysis
   */
  const analyzeLatestFrame = useCallback(async () => {
    if (frameBufferRef.current.length > 0) {
      const lastFrame =
        frameBufferRef.current[frameBufferRef.current.length - 1];
      analyzeCurrentFrame(lastFrame.landmarks);
    }
  }, [analyzeCurrentFrame]);

  /**
   * Get buffered frame data
   */
  const getBufferedFrames = useCallback(() => {
    return frameBufferRef.current.map((frame) => frame.landmarks);
  }, []);

  /**
   * Clear buffer
   */
  const clearBuffer = useCallback(() => {
    frameBufferRef.current = [];
  }, []);

  return {
    // State
    isAnalyzing,
    currentScore,
    currentFeedback,
    isRecording,
    frameCount,
    bufferedFrameCount: frameBufferRef.current.length,

    // Methods
    startRecording,
    stopRecordingAndAnalyze,
    analyzeLatestFrame,
    analyzeCurrentFrame,
    getBufferedFrames,
    clearBuffer,
    stopPoseDetection: () => poseDetectorRef.current?.stop(),
    startPoseDetection: () => poseDetectorRef.current?.start(),
  };
}
