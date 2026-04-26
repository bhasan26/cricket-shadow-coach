# Cricket Shadow Batting Coach

A real-time web application that uses computer vision and pose estimation to analyze cricket batting techniques and provide AI-powered feedback.

## Project Overview

This application combines:
- **React Frontend**: Real-time video capture and visualization
- **MediaPipe Pose**: 33-point skeletal body tracking
- **Python/FastAPI Backend**: Biomechanical analysis engine
- **Dynamic Time Warping**: Shot sequence comparison against ideal models

## Architecture

```
┌─────────────────────────────┐
│   React Frontend            │
│  - Webcam capture          │
│  - MediaPipe integration    │
│  - Real-time visualization  │
└──────────────┬──────────────┘
               │ JSON
               │ (pose landmarks)
               ▼
┌─────────────────────────────┐
│  FastAPI Backend            │
│  - Angle calculations       │
│  - DTW comparison           │
│  - Feedback generation      │
└─────────────────────────────┘
```

## Setup Instructions

### Backend Setup

#### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

#### 2. Run the Backend Server

```bash
python main.py
```

The API will be available at `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

### Frontend Setup

#### 1. Install Node Dependencies

```bash
cd frontend
npm install
```

Key dependencies:
- `@mediapipe/pose` - Pose estimation library
- `@mediapipe/camera_utils` - Camera handling utilities
- React Hooks for state management

#### 2. Run the Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173` (or as shown in terminal)

#### 3. Configure API URL (if needed)

Set the `REACT_APP_API_URL` environment variable:

```bash
export REACT_APP_API_URL=http://localhost:8000
npm run dev
```

## File Structure

```
PoseAnalysis/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── angle_utils.py       # Angle calculations
│   ├── geo.py               # Ideal models and thresholds
│   ├── dtw_utils.py         # Dynamic Time Warping
│   ├── shot_evaluator.py    # Shot evaluation logic
│   └── requirements.txt     # Python dependencies
│
└── frontend/
    └── src/
        ├── App.jsx          # Main app container
        ├── CameraFeed.jsx   # Video capture and canvas
        ├── Controls.jsx     # UI buttons
        ├── Feedback.jsx     # Score and tips display
        ├── api.js           # Backend API client
        ├── poseUtils.js     # MediaPipe setup
        ├── drawSkeleton.js  # Canvas drawing utility
        ├── usePoseAnalysis.js # Custom React hook
        └── main.jsx         # React entry point
```

## API Endpoints

### `/health` (GET)
Health check endpoint

```bash
curl http://localhost:8000/health
```

### `/analyze-frame` (POST)
Analyze a single frame

```bash
curl -X POST http://localhost:8000/analyze-frame \
  -H "Content-Type: application/json" \
  -d '{"poseLandmarks": [...]}'
```

**Response:**
```json
{
  "score": 75,
  "feedback": "Good technique",
  "angles": {
    "left_elbow": 162,
    "right_elbow": 165,
    ...
  }
}
```

### `/analyze-shot` (POST)
Analyze a complete shot sequence

```bash
curl -X POST http://localhost:8000/analyze-shot \
  -H "Content-Type: application/json" \
  -d '{"shot_sequence": [[...], [...]]}'
```

**Response:**
```json
{
  "score": 82,
  "feedback": "Excellent shot | Keep your head steady",
  "is_good_shot": true,
  "angle_scores": {
    "left_elbow": 85,
    "right_elbow": 90,
    ...
  }
}
```

### `/batch-analyze` (POST)
Analyze multiple frames efficiently

### `/ideal-model` (GET)
Get ideal model reference data

## MediaPipe Pose Indices

The system tracks 33 body landmarks:

**Key Indices Used:**
- 0: Nose
- 11: Left Shoulder
- 12: Right Shoulder
- 13: Left Elbow
- 14: Right Elbow
- 15: Left Wrist
- 16: Right Wrist
- 23: Left Hip
- 24: Right Hip
- 25: Left Knee
- 26: Right Knee
- 27: Left Ankle
- 28: Right Ankle

## Angle Calculations

### Joint Angles

The system calculates angles at specific joints:

1. **Left Elbow Angle**: Shoulder → Elbow → Wrist
2. **Right Elbow Angle**: Shoulder → Elbow → Wrist
3. **Left Knee Angle**: Hip → Knee → Ankle
4. **Right Knee Angle**: Hip → Knee → Ankle
5. **Head Alignment**: Nose Y-position relative to shoulder

### Formula

```
cos(θ) = (u · v) / (||u|| ||v||)

where u and v are vectors formed by three points
θ is converted to degrees
```

## Dynamic Time Warping (DTW)

DTW allows comparison of shot sequences with different execution speeds.

**Key Features:**
- Accounts for temporal variations in human motion
- Compares user's angle sequences against ideal models
- Generates a normalized score (0-100)

**Implementation:**
- Pure NumPy implementation (no external dependencies)
- Time complexity: O(m×n) where m, n are sequence lengths
- Optimal for real-time analysis

## Ideal Model (Cover Drive)

The ideal model contains 11 frames representing the complete cover drive motion:

1. **Setup** (Frame 0): Relaxed stance
2. **Backswing** (Frames 1-3): Loading and coiling
3. **Downswing** (Frames 4-6): Hip rotation and acceleration
4. **Contact** (Frame 7): Full extension
5. **Follow-through** (Frames 8-10): Bat over shoulder

Each frame contains:
- Ideal angles for all joints
- Position-specific feedback
- Phase description

## Feedback System

The system generates contextual feedback based on:

1. **Angle Deviations**: How far user's angles deviate from ideal
2. **Position Phase**: Which phase of the shot the user is in
3. **Deviation Thresholds**: 
   - ±10° deviation: Minor feedback
   - >±10° deviation: Significant feedback

## Performance Optimization

- **Frame Interval**: Analyze every 2nd frame for real-time performance
- **Buffer Size**: Keep 60 frames (2 seconds at 30fps) in memory
- **Batch Processing**: Analyze multiple frames efficiently
- **Canvas Rendering**: Offload to GPU when available

## Troubleshooting

### Backend Issues

**Import Error: fastdtw**
- The application uses a pure NumPy DTW implementation
- No external DTW library required
- Check requirements.txt is properly installed

**CORS Error**
- Backend CORS is configured for `localhost:3000`
- Update `main.py` if frontend runs on different port

### Frontend Issues

**MediaPipe Not Loading**
- Check browser console for CDN errors
- Ensure internet connection for external CDN
- Try clearing browser cache

**Webcam Permission Denied**
- Grant camera permissions when prompted
- Check browser settings for camera access
- Some browsers require HTTPS

**No Skeleton Drawing**
- Check if pose landmarks are being received
- Verify canvas element size matches video
- Check browser console for errors

## Development Tips

### Debugging

Enable console logging:
```javascript
// In CameraFeed.jsx
onScoreUpdate: (score) => console.log('Score:', score),
onFeedbackUpdate: (feedback) => console.log('Feedback:', feedback),
```

### Extending the System

#### Add New Angles
Edit `angle_utils.py`:
```python
def get_new_angle(landmarks):
    # Implement angle calculation
    return calculate_angle(point_a, point_b, point_c)
```

#### Modify Ideal Model
Edit `geo.py` - update `IDEAL_COVER_DRIVE` array

#### Add New Feedback
Edit `geo.py` - update `ANGLE_THRESHOLDS` dictionary

## Performance Metrics

- **Frame Processing**: ~30 fps (one frame per 33ms)
- **API Response Time**: ~100-200ms per frame
- **Memory Usage**: ~200MB (backend) + ~100MB (frontend)

## Future Enhancements

- [ ] Support for multiple cricket shots
- [ ] Video upload and batch analysis
- [ ] User progress tracking
- [ ] Mobile app support
- [ ] Real-time coaching notifications
- [ ] Advanced ML models (LSTM for sequence prediction)
- [ ] Multi-user comparison

## License

This project is created as part of a coding exercise.

## Support

For issues and questions, check:
- Backend logs: Terminal output from `python main.py`
- Frontend logs: Browser Developer Tools (F12)
- API docs: `http://localhost:8000/docs`
