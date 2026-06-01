import cv2
import numpy as np
from scipy.interpolate import PchipInterpolator
from ultralytics import YOLO
import os

class CricketBiomechanicalAnalyzer:
    def __init__(self, yolo_model_path: str = "yolov8n.pt"):
        # Initialize custom ball tracking YOLO network
        # For this application, we use yolov8n.pt as the default if a custom model is not provided.
        self.ball_detector = YOLO(yolo_model_path)
    
    def track_ball_trajectory_pchip(self, video_path: str) -> list:
        """
        Runs YOLO object detection to locate the ball, applying PCHIP interpolation.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
            
        cap = cv2.VideoCapture(video_path)
        frame_idx = 0
        raw_detections = []
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            # Run YOLO ball object detection
            results = self.ball_detector(frame, verbose=False)
            detected = False
            
            # results is a list of Results objects
            for box in results[0].boxes:
                # We assume class 0 is 'sports ball' or 'person' (if training custom model, ball=0)
                # In standard COCO yolov8n, class 32 is sports ball. Let's look for both 0 and 32 just in case.
                # The PDF blueprint uses cls == 0 (assuming a custom trained model).
                cls_id = int(box.cls)
                if (cls_id == 0 or cls_id == 32) and box.conf > 0.4:
                    xyxy = box.xyxy.cpu().numpy()[0]
                    center_x = (xyxy[0] + xyxy[2]) / 2.0
                    center_y = (xyxy[1] + xyxy[3]) / 2.0
                    raw_detections.append((frame_idx, center_x, center_y))
                    detected = True
                    break
                    
            if not detected:
                # Mark coordinate as missing for reconstruction
                raw_detections.append((frame_idx, None, None))
                
            frame_idx += 1
            
        cap.release()
        
        # Isolate valid frames and interpolate missing values
        detected_frames = [f for f, x, y in raw_detections if x is not None]
        detected_x = [x for f, x, y in raw_detections if x is not None]
        detected_y = [y for f, x, y in raw_detections if x is not None]
        
        # We need enough points to perform PCHIP interpolation
        if len(detected_frames) > 5:
            full_timeline = np.arange(frame_idx)
            # Apply PCHIP interpolation to reconstruct missing coordinates smoothly
            pchip_x = PchipInterpolator(detected_frames, detected_x)
            pchip_y = PchipInterpolator(detected_frames, detected_y)
            
            smoothed_trajectory = [
                (int(f), float(pchip_x(f)), float(pchip_y(f))) for f in full_timeline
            ]
            return smoothed_trajectory
            
        return [(f, x, y) for f, x, y in raw_detections]

