# Developer Reference Card

Quick reference for developers working with the Cricket Batting Coach codebase.

## 📁 File Quick Reference

### Backend Files (Python)

| File | Purpose | Key Functions |
|------|---------|----------------|
| `main.py` | FastAPI server | POST /analyze-frame, POST /analyze-shot |
| `angle_utils.py` | Math functions | calculate_angle(), extract_shot_angles() |
| `geo.py` | Data models | IDEAL_COVER_DRIVE, ANGLE_THRESHOLDS |
| `dtw_utils.py` | Time warping | calculate_dtw_distance() |
| `shot_evaluator.py` | Evaluation | evaluate_shot(), calculate_sequence_score() |

### Frontend Files (JavaScript)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `CameraFeed.jsx` | Main UI | Default component |
| `usePoseAnalysis.js` | Core hook | usePoseAnalysis() |
| `api.js` | Backend client | analyzeFrame(), analyzeShotSequence() |
| `poseUtils.js` | MediaPipe | createPoseDetector() |
| `drawSkeleton.js` | Canvas drawing | drawSkeleton() |

## 🔗 Common Code Patterns

### Adding a New Angle (Backend)

```python
# 1. Add function in angle_utils.py
def get_ankle_angle(landmarks):
    """Calculate ankle angle (knee-ankle-toe)"""
    knee = (landmarks[25]["x"], landmarks[25]["y"], landmarks[25]["z"])
    ankle = (landmarks[27]["x"], landmarks[27]["y"], landmarks[27]["z"])
    toe = (landmarks[31]["x"], landmarks[31]["y"], landmarks[31]["z"])
    return calculate_angle(knee, ankle, toe)

# 2. Add to extract_shot_angles in angle_utils.py
"ankle_angle": get_ankle_angle(landmarks),

# 3. Add threshold in geo.py
"ankle_angle": {
    "ideal": 90,
    "feedback_low": "Extend your ankle",
    "feedback_high": "Don't over-extend"
}
```

### Adding a New Shot Type (Backend)

```python
# In geo.py, create new model
IDEAL_DEFENSE_SHOT = [
    {
        "frame": 0,
        "left_elbow": 160,
        "right_elbow": 150,
        ...
    },
    ...
]

# Create getter function
def get_ideal_defense_sequence():
    return IDEAL_DEFENSE_SHOT
```

### API Error Handling (Frontend)

```javascript
// In api.js
try {
    const response = await fetch(`${API_BASE_URL}/analyze-frame`, {...})
    
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
    }
    
    return await response.json()
} catch (error) {
    console.error('Analysis failed:', error)
    throw error
}
```

### Component State Management (Frontend)

```javascript
// In CameraFeed.jsx
const [feedbackVisible, setFeedbackVisible] = useState(true)

// Using hook
const poseAnalysis = usePoseAnalysis(
    videoRef.current,
    canvasRef.current,
    {
        onScoreUpdate: (score) => setCurrentScore(score),
        onError: (error) => console.error(error)
    }
)
```

## 🔧 Common Tasks

### Modify Feedback Message

```python
# File: geo.py

ANGLE_THRESHOLDS = {
    "left_elbow": {
        ...
        "feedback_low": "NEW MESSAGE HERE",  # Change this
        ...
    }
}
```

### Change Recording Buffer Size

```javascript
// File: CameraFeed.jsx

const poseAnalysis = usePoseAnalysis(
    videoRef.current,
    canvasRef.current,
    {
        bufferSize: 120,  // Change from 60 to 120 (4 seconds)
        ...
    }
)
```

### Adjust Score Thresholds

```python
# File: shot_evaluator.py

def calculate_shot_score(angles, ideal_angles=None):
    ...
    avg_deviation = np.mean(deviations)
    score = max(0, 100 - (avg_deviation / 30 * 100))  # Adjust denominator
    ...
```

### Add Console Logging (Frontend)

```javascript
// In usePoseAnalysis.js
const handlePoseLandmarks = useCallback(
    async (landmarks) => {
        console.log('Landmarks received:', landmarks.length)
        console.log('Angles:', angles)
        ...
    }
)
```

### Add Backend Logging

```python
# In main.py
@app.post("/analyze-frame")
async def analyze_frame(payload: FramePayload):
    print(f"Analyzing frame with {len(payload.poseLandmarks)} landmarks")
    angles = extract_shot_angles(payload.poseLandmarks)
    print(f"Extracted angles: {angles}")
    ...
```

## 📊 Data Structures

### Landmark Object

```javascript
{
    x: 0.5,           // 0-1 (normalized width)
    y: 0.3,           // 0-1 (normalized height)  
    z: -0.2,          // Depth (positive = towards camera)
    visibility: 0.95  // 0-1 (confidence)
}
```

### Angles Object

```python
{
    "left_elbow": 150,      # degrees
    "right_elbow": 165,     # degrees
    "left_knee": 140,       # degrees
    "right_knee": 135,      # degrees
    "head_alignment": 0.5   # normalized
}
```

### Analysis Response

```json
{
    "score": 75,                    # 0-100
    "feedback": "Raise your elbow", # string
    "angles": {...},               # see Angles Object
    "is_good_shot": true          # boolean (score >= 70)
}
```

## 🚀 Performance Optimization Tips

### Frontend Optimization

```javascript
// Skip frames to improve performance
const poseAnalysis = usePoseAnalysis(
    videoRef.current,
    canvasRef.current,
    {
        frameInterval: 3,  // Analyze every 3rd frame instead of 2nd
        ...
    }
)
```

### Backend Optimization

```python
# In shot_evaluator.py - reduce sequence length
def calculate_sequence_score(angle_sequence):
    if len(angle_sequence) > 100:
        # Sample every Nth frame
        angle_sequence = angle_sequence[::2]
    ...
```

## 🐛 Debugging Tips

### Browser Console (Frontend)

```javascript
// In DevTools Console
// Check pose detector status
console.log(poseDetectorRef.current)

// Check frame buffer
console.log(frameBufferRef.current.length)

// Check canvas context
console.log(canvasContextRef.current)
```

### Python Debug (Backend)

```python
# In main.py
import json

@app.post("/analyze-frame")
async def analyze_frame(payload: FramePayload):
    print("Raw payload:", json.dumps(payload.dict(), indent=2))
    angles = extract_shot_angles(payload.poseLandmarks)
    print("Calculated angles:", angles)
    ...
```

### Network Debugging

```javascript
// Chrome DevTools → Network tab
// Check:
// 1. Request URL and method
// 2. Request headers
// 3. Response status (200 = OK)
// 4. Response time
// 5. Payload size
```

## 🔌 API Endpoints Quick Guide

```bash
# Test health
curl http://localhost:8000/health

# Analyze single frame (requires 33 landmarks)
curl -X POST http://localhost:8000/analyze-frame \
  -H "Content-Type: application/json" \
  -d '{"poseLandmarks": [...]}'

# Analyze sequence
curl -X POST http://localhost:8000/analyze-shot \
  -H "Content-Type: application/json" \
  -d '{"shot_sequence": [[...], [...]]}'

# Get ideal model
curl http://localhost:8000/ideal-model

# Interactive docs
open http://localhost:8000/docs
```

## 📦 Dependency Versions

### Required Python Packages
```
fastapi==0.100.0
uvicorn==0.23.1
numpy==1.25.1
pydantic==2.0.3
scipy==1.11.1
```

### Required Node Packages
```
react@18.x
@mediapipe/pose@0.5.x
vite@4.x
```

## 🔄 Build & Deploy Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py

# Frontend - Development
cd frontend
npm install
npm run dev

# Frontend - Production Build
npm run build
npm run preview
```

## 📝 Code Style Guidelines

### Python
- Follow PEP 8
- Type hints on all functions
- Docstring on all functions
- 4-space indentation

### JavaScript
- Use Arrow functions
- Const/Let, no Var
- JSDoc comments
- 2-space indentation

## 🧪 Testing Checklist

Before committing:
- [ ] Backend starts without errors
- [ ] Frontend builds without errors
- [ ] API /health endpoint responds
- [ ] Can record a shot and get score
- [ ] No console errors
- [ ] No console warnings

## 📚 Key Algorithm References

### Angle Calculation Formula
```
cos(θ) = (u · v) / (||u|| ||v||)
θ = arccos(cos(θ))

where:
u = point_a - vertex
v = point_c - vertex
||u|| = magnitude of u
```

### DTW Distance
```
dtw[i][j] = cost(i,j) + min(
    dtw[i-1][j],      # insertion
    dtw[i][j-1],      # deletion
    dtw[i-1][j-1]     # match
)
```

## 🎯 Next Features to Add

1. **Video Upload**: Analyze saved videos
2. **Multiple Shots**: Support drive, pull, defense
3. **Progress Tracking**: Store scores over time
4. **Replay**: Show frame-by-frame analysis
5. **Multi-user**: Compare users
6. **Mobile**: React Native version
7. **AR Overlay**: Show ideal motion overlay

---

**Print this page for quick reference!** 📄
