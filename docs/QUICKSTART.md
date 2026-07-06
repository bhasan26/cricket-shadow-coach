# Quick Start Guide

Get the Cricket Batting Coach running in 5 minutes!

## Prerequisites

- Python 3.9+
- Node.js 16+
- Modern web browser with webcam support
- Git

## Step-by-Step Setup

### 1. Backend Setup (Terminal 1)

```bash
# Navigate to backend
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
python main.py
```

Expected output:
```
INFO:     Application startup complete
Uvicorn running on http://0.0.0.0:8000
```

### 2. Frontend Setup (Terminal 2)

```bash
# Navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```

Expected output:
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### 3. Access the Application

1. Open your browser to `http://localhost:5173`
2. Grant camera permission when prompted
3. You should see:
   - Live video feed from your webcam
   - Green skeleton overlay on top
   - "Start Recording" button

## First Test

1. **Start Recording**: Click "Start Recording" button
2. **Perform a Shot**: Simulate a cricket cover drive motion in front of the camera
3. **Stop & Analyze**: Click "Stop & Analyze" button
4. **View Results**: Score and feedback appear below the video

## Workflow

```
1. Click "Start Recording"
   ↓
2. Perform cricket shot (1-3 seconds)
   ↓
3. Click "Stop & Analyze"
   ↓
4. View score (0-100) and feedback tips
   ↓
5. Repeat for improvement
```

## Score Interpretation

- **80-100**: Excellent technique
- **60-79**: Good with minor adjustments needed
- **40-59**: Needs improvement in key areas
- **0-39**: Focus on fundamentals

## Feedback Examples

- "Raise your front elbow higher"
- "Bend your front knee more"
- "Keep your back elbow up"
- "Head steady, eyes on the ball"

## Troubleshooting

### "API Error: 0"
Backend not running. Check Terminal 1 that FastAPI is started.

### "Cannot access camera"
1. Check camera permissions in browser
2. Close other apps using camera
3. Try a different browser

### Skeleton not visible
1. Improve lighting
2. Wear contrasting clothing
3. Move closer to camera (1-3 meters)
4. Check that MediaPipe is loaded (check browser console)

### Slow performance
1. Reduce browser tabs
2. Close unnecessary apps
3. Lower video resolution (edit CameraFeed.jsx)

## API Health Check

Test backend is running:
```bash
curl http://localhost:8000/health
```

Should return:
```json
{"status":"ok","service":"Cricket Batting Coach API"}
```

## Next Steps

1. **Improve Your Technique**: Use feedback to refine your motion
2. **Explore Code**: Check `backend/` and `frontend/src/` for implementation details
3. **Extend Features**: Add new shot types, angles, or feedback rules
4. **Build Mobile**: Deploy to production with proper hosting

## File Organization Quick Reference

```
Backend (Python):
- main.py: API server
- angle_utils.py: Math functions
- geo.py: Ideal models
- shot_evaluator.py: Scoring logic

Frontend (React):
- CameraFeed.jsx: Main UI
- usePoseAnalysis.js: Core logic hook
- api.js: Backend communication
- poseUtils.js: MediaPipe setup
```

## Common Modifications

### Change buffer size (frames kept in memory)
Edit `CameraFeed.jsx`, usePoseAnalysis call:
```javascript
bufferSize: 120  // 4 seconds at 30fps
```

### Adjust ideal angles
Edit `geo.py`, `IDEAL_COVER_DRIVE` array:
```python
"left_elbow": 165,  # Change target angle
```

### Change score calculation
Edit `shot_evaluator.py`, `calculate_shot_score()` function

## Performance Tips

- Ensure good lighting (preferably natural light)
- Position yourself 1-3 meters from camera
- Wear contrasting colors (dark clothes)
- Use a stable camera setup
- Close unnecessary browser tabs

## Support Resources

- **Backend API Docs**: `http://localhost:8000/docs`
- **MediaPipe Docs**: https://developers.google.com/mediapipe
- **React Docs**: https://react.dev

---

Enjoy your cricket coaching! 🏏
