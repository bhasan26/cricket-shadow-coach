# Technical Architecture

## System Overview

The Cricket Shadow Batting Coach is a real-time computer vision application that analyzes cricket batting technique using pose estimation and biomechanical analysis.

## Measurement & Scoring Pipeline (accuracy work, 2026-07)

How a recorded drill becomes a score, and where each accuracy decision lives:

### 1. Landmarks: 3D world coordinates for math, 2D screen for drawing

MediaPipe Pose emits both `poseLandmarks` (normalized image space) and
`poseWorldLandmarks` (metric 3D, meters, hip-origin). The skeleton overlay
draws from screen space; **all joint-angle math uses world landmarks**, which
removes 20–60° of perspective/foreshortening error. Legacy clients that send
only 2D landmarks still work: each frame is tagged `is_world`, and the bowling
check applies a documented 20° foreshortening leniency to 2D-only sequences
(none for 3D).

Phase/window detection positions (`wrist_y`, `elbow_y`, `shoulder_y`) are
deliberately screen-space — "wrist above shoulder" is a camera-relative notion
(see comment in `api/angle_utils.py`).

### 2. Filtering

- **Client** (`src/filters.js`): One Euro filter per landmark per axis on
  world landmarks (`minCutoff=1.0`, `beta=0.007`), warmed on every frame,
  reset after tracking gaps > 500 ms.
- **Server** (`api/angle_utils.smooth_sequence`): Savitzky-Golay (window 7,
  polyorder 2) over each angle channel — defense-in-depth for old clients.
  `None` (untracked joint, visibility < 0.5) is preserved, never interpolated.

### 3. Reference data (`api/references/`)

Recorded references — real takes captured with `api/tools/capture_reference.py`
and averaged with `api/tools/build_reference.py` (DTW-aligned mean + per-frame
std) — are loaded by `geo.py` at import and take priority over the hardcoded
fallback sequences. Scoring against a recorded reference uses the per-frame
std as a tolerance band: within 1 std = full marks, scaling to 0 at 3 std
(`dtw_utils.tolerance_score`). DTW scores are normalized by warping-path
length so recording duration doesn't affect the score.

### 4. Phase-aware scoring

`shot_evaluator.segment_phases` splits the front-elbow angle series into
stance → backswing (flexing) → impact (peak extension ± window) →
follow-through, rule-based. Each phase is scored against the matching segment
of the reference and returned as `backswing_phase` / `impact_phase` /
`follow_through_phase` in `angle_scores`.

### 5. Bowling legality (indicative only)

Elbow extension is measured **only inside the ICC-style window**: from the
frame the bowling upper arm passes horizontal to the release frame (wrist
apex). Verdicts report an *estimated* extension against the 15° guideline —
30 fps webcam analysis is never an official assessment (lab testing is 250 fps
3D capture). A `confidence: low` flag fires when the window has < 5 frames,
could not be isolated, or tracking quality < 60%; the UI grays the score.

### 6. Planned ML layer (`api/train_landmark_classifier.py`)

A small 1D temporal CNN over normalized landmark sequences (48×99 input,
< 2 MB as ONNX) for shot verification and a bowling second opinion, to run
in-browser via `onnxruntime-web`. Training requires per-class video clips;
methodology (70/15/15 split by video, early stopping, confusion matrix, ONNX
parity check) is enforced by the script. Ship gate: ≥ 80% test accuracy.

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Environment                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              React Application                       │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  CameraFeed.jsx (Main Container)               │ │   │
│  │  │  ├─ Video Element (HTMLMediaElement)           │ │   │
│  │  │  ├─ Canvas Element (Skeleton Rendering)        │ │   │
│  │  │  ├─ Controls Component                         │ │   │
│  │  │  └─ Feedback Component                         │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │         ▲                            │                 │   │
│  │         │ pose landmarks            │ JSON POST       │   │
│  │         │ from MediaPipe            │ requests        │   │
│  │         │                            ▼                 │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  usePoseAnalysis Hook                           │ │   │
│  │  │  ├─ MediaPipe Pose Detector                     │ │   │
│  │  │  ├─ Frame Buffering (60 frames)                 │ │   │
│  │  │  ├─ Canvas Drawing (drawSkeleton.js)           │ │   │
│  │  │  └─ API Communication (api.js)                  │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  │  └──────────────────────────────────────────────────┐ │   │
│  │    poseUtils.js                                      │ │   │
│  │    └─ MediaPipe @mediapipe/pose initialization       │ │   │
│  │                                                        │ │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/JSON
                            │ Port 8000
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Python FastAPI Backend                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  main.py (FastAPI Application)                       │   │
│  │  ├─ POST /analyze-frame                             │   │
│  │  ├─ POST /analyze-shot                              │   │
│  │  ├─ POST /batch-analyze                             │   │
│  │  ├─ GET /ideal-model                                │   │
│  │  └─ GET /health                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│         ▲                                    │                │
│         │ angle dicts                       │ results        │
│         │                                   ▼                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  shot_evaluator.py (Evaluation Engine)              │   │
│  │  ├─ evaluate_frame()                                │   │
│  │  ├─ evaluate_shot()                                 │   │
│  │  ├─ calculate_sequence_score()                      │   │
│  │  └─ generate_feedback_list()                        │   │
│  └──────────────────────────────────────────────────────┘   │
│         ▲                          ▲          │                │
│         │ landmarks               │ ideal    │ scores         │
│         │                         │ data     │ feedback       │
│  ┌──────┴────────────┐   ┌───────┴──────┐   │                │
│  │ angle_utils.py    │   │  geo.py      │   │                │
│  ├─ calculate_angle()│   ├─ IDEAL_*     │   │                │
│  ├─ *_elbow_angle()  │   ├─ *THRESHOLDS│   │                │
│  ├─ *_knee_angle()   │   └─ *_feedback()   │                │
│  └─ extract_angles() │                      │                │
│         ▲                                    │                │
│         │ DTW comparison                    │                │
│  ┌──────┴──────────────────────────────────┘                │
│  │ dtw_utils.py                                             │
│  │ ├─ calculate_dtw_distance()                             │
│  │ ├─ compare_angle_sequences()                            │
│  │ └─ generate_score_from_dtw()                            │
│  └──────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Single Frame Analysis

```
User performing shot
    ▼
Webcam → Video Element
    ▼
MediaPipe Pose Detection
    ▼
33 3D Landmarks (x, y, z, visibility)
    ▼
usePoseAnalysis Hook
    ▼
Filter & Prepare Data
    ▼
POST /analyze-frame
    ▼
Backend:
  1. Extract angles (angle_utils.py)
  2. Calculate shot score (shot_evaluator.py)
  3. Generate feedback (geo.py)
    ▼
Return: {score, feedback, angles}
    ▼
Display on UI
```

### Sequence Analysis (Full Shot)

```
Start Recording
    ▼
Accumulate Frames (30-60 per shot)
    ▼
Stop Recording
    ▼
POST /analyze-shot with full sequence
    ▼
Backend:
  1. Extract angles for each frame
  2. Pad sequence if needed
  3. Compare against ideal model using DTW
  4. Calculate per-angle scores
  5. Generate contextual feedback
    ▼
Return: {score, feedback, is_good_shot, angle_scores}
    ▼
Display comprehensive results
```

## Key Algorithms

### 1. Angle Calculation

**Algorithm**: Dot Product Formula

```
Input: Three 3D points (A, B, C)
    - B is the vertex angle

Calculation:
  u = A - B
  v = C - B
  cos(θ) = (u · v) / (||u|| × ||v||)
  θ = arccos(cos(θ)) in degrees

Output: Angle in degrees [0°, 180°]
```

**Usage**: Calculate angles at joints:
- Elbow: Shoulder → Elbow → Wrist
- Knee: Hip → Knee → Ankle

### 2. Dynamic Time Warping (DTW)

**Algorithm**: Recursive DTW Matrix

```
Input: Two sequences of angles
  user_seq = [u₁, u₂, ..., uₘ]
  ideal_seq = [i₁, i₂, ..., iₙ]

Matrix Computation:
  dtw[i][j] = cost(i, j) + min(
    dtw[i-1][j],      // insertion
    dtw[i][j-1],      // deletion
    dtw[i-1][j-1]     // substitution
  )

where cost[i][j] = |uᵢ - iⱼ|

Time Complexity: O(m × n)
Space Complexity: O(m × n)

Output: dtw[m][n] - minimum distance between sequences
```

**Why DTW?**
- Accounts for execution speed variations
- Handles sequences of different lengths
- Robust to temporal distortions
- Perfect for human motion analysis

### 3. Score Calculation

**Per-Frame Score**:
```
deviation = |user_angle - ideal_angle|
score = max(0, 100 - (deviation / max_deviation × 100))
where max_deviation = 30°
```

**Sequence Score**:
```
For each angle (left_elbow, right_elbow, left_knee, right_knee):
  dtw_distance = calculate_dtw_distance(user_seq, ideal_seq)
  angle_score = max(0, 100 - min(100, dtw_distance))

overall_score = average(all_angle_scores)
```

### 4. Feedback Generation

**Rule-Based Feedback**:
```
For each angle:
  if user_angle < ideal_angle - 10°:
    → feedback_low (e.g., "Raise your elbow")
  elif user_angle > ideal_angle + 10°:
    → feedback_high (e.g., "Lower your elbow")
  else:
    → no feedback for this angle

Combine up to 3 most relevant feedback items
```

## MediaPipe Integration

### Pose Estimation Model

**Model Configuration**:
```javascript
{
  modelComplexity: 1,           // 0=lite, 1=full
  smoothLandmarks: true,        // Temporal smoothing
  enableSegmentation: false,    // Not needed for this app
  staticImageMode: false,       // Video mode
}
```

**Output**: 33 Body Landmarks

```
Upper Body (0-10):
  0: Nose
  1-2: Eyes
  3-4: Ears
  5-8: Mouth/Face
  9-10: Shoulders (base)

Arms (11-16):
  11: Left Shoulder
  12: Right Shoulder
  13: Left Elbow
  14: Right Elbow
  15: Left Wrist
  16: Right Wrist

Torso/Hips (17-24):
  17: Pelvis (center)
  18-19: Left Hip
  20-21: Right Hip
  22-24: Spine points

Legs (23-32):
  23: Left Hip
  24: Right Hip
  25: Left Knee
  26: Right Knee
  27: Left Ankle
  28: Right Ankle
```

**Landmark Format**:
```javascript
{
  x: float (0-1, normalized to image width),
  y: float (0-1, normalized to image height),
  z: float (relative depth),
  visibility: float (0-1, confidence score)
}
```

## Performance Characteristics

### Frontend Performance

| Metric | Value |
|--------|-------|
| Frame Rate | 30 FPS |
| Frame Processing | ~33ms per frame |
| Canvas Draw | ~5ms |
| API Request | ~100-200ms |
| Memory Usage | ~100MB |

### Backend Performance

| Metric | Value |
|--------|-------|
| Single Frame Analysis | ~50ms |
| Sequence Analysis (30 frames) | ~500ms |
| DTW Calculation | O(m×n) = ~30ms for 30×10 |
| Memory per Request | ~5-10MB |

### Network Performance

| Metric | Value |
|--------|-------|
| Payload Size | ~5-15 KB per frame |
| Bandwidth | ~150-450 KB/s at 30fps |
| Network Latency | ~10-50ms local |
| CORS Overhead | Minimal |

## Scalability Considerations

### Current Limitations

1. **Real-time Analysis**: Backend ~50ms, UI ~33ms = total ~100ms latency
2. **Buffer Size**: 60 frames = 2 seconds at 30fps
3. **DTW Complexity**: O(m×n) grows quadratically
4. **Memory**: Accumulating landmarks requires linear memory

### Optimization Opportunities

1. **Parallel Processing**: Analyze multiple frames concurrently
2. **Frame Skipping**: Process every Nth frame for lower latency
3. **DTW Pruning**: Use Sakoe-Chiba band for faster DTW
4. **Model Quantization**: Reduce MediaPipe model size
5. **WebGL**: Offload canvas rendering to GPU

## Security Considerations

- **No Video Storage**: Videos only processed in memory
- **Client-Side Processing**: MediaPipe runs locally
- **CORS Enabled**: Only allows configured origins
- **No Authentication**: Should be added for production
- **No PII**: Only processes skeletal coordinates

## Error Handling

### Frontend Errors

```javascript
try {
  // Camera access
  // API calls
} catch (error) {
  console.error('Specific error:', error)
  onError(error)  // Callback to parent
  display "User-friendly error message"
}
```

### Backend Errors

```python
try:
  # Extract angles
  # Evaluate shot
except Exception as e:
  print(f"Error: {e}")
  return {"score": 0, "feedback": f"Error: {e}"}
```

## Testing Strategy

### Unit Tests (Backend)

```python
def test_angle_calculation():
    # Test calculate_angle with known values
    
def test_score_calculation():
    # Test score generation
    
def test_dtw_distance():
    # Test DTW algorithm
```

### Integration Tests (Full Stack)

```
1. Video capture test
2. Single frame analysis
3. Sequence analysis
4. API error handling
5. CORS validation
```

### Performance Tests

```
- Frame processing latency
- Memory usage under load
- API throughput
- Browser FPS consistency
```

## Future Architecture Improvements

1. **Multi-Model Support**: Support multiple shot types
2. **Cloud Deployment**: Scale to multiple users
3. **ML Pipeline**: Add LSTM for temporal prediction
4. **Mobile Support**: React Native version
5. **Analytics Dashboard**: Track user progress
6. **WebRTC**: Peer-to-peer analysis
7. **Microservices**: Separate analysis engines
8. **Database**: Store user sessions and scores

---

This architecture is designed for clarity, real-time performance, and ease of extension.
