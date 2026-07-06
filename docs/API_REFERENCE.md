# API Reference

Complete documentation for the Cricket Batting Coach API endpoints.

## Base URL

```
http://localhost:8000
```

## Authentication

Currently no authentication required. For production, implement:
- JWT tokens
- API keys
- OAuth 2.0

## Response Format

All responses use JSON format.

### Success Response

```json
{
  "score": 75,
  "feedback": "Excellent technique",
  ...
}
```

### Error Response

```json
{
  "detail": "Error message",
  "status_code": 400
}
```

---

## Endpoints

### 1. Health Check

Check if the API is running and healthy.

**Request**
```
GET /health
```

**Response (200)**
```json
{
  "status": "ok",
  "service": "Cricket Batting Coach API"
}
```

**Example**
```bash
curl http://localhost:8000/health
```

---

### 2. Analyze Frame

Analyze a single frame of pose data.

**Request**
```
POST /analyze-frame
Content-Type: application/json
```

**Body**
```json
{
  "poseLandmarks": [
    {
      "x": 0.5,
      "y": 0.3,
      "z": -0.2,
      "visibility": 0.95
    },
    ...  // 33 landmarks total
  ]
}
```

**Response (200)**
```json
{
  "score": 75,
  "feedback": "Raise your front elbow higher",
  "angles": {
    "left_elbow": 150,
    "right_elbow": 165,
    "left_knee": 140,
    "right_knee": 135,
    "head_alignment": 0.5
  }
}
```

**Parameters**
- `poseLandmarks` (required): Array of 33 MediaPipe landmarks
  - Each landmark must have: `x`, `y`, `z`, `visibility`

**Error Responses**

```json
{
  "detail": "Invalid input",
  "status_code": 422
}
```

**Example**
```bash
curl -X POST http://localhost:8000/analyze-frame \
  -H "Content-Type: application/json" \
  -d '{
    "poseLandmarks": [
      {"x": 0.5, "y": 0.3, "z": -0.2, "visibility": 0.95},
      ...
    ]
  }'
```

---

### 3. Analyze Shot

Analyze a complete shot sequence using Dynamic Time Warping.

**Request**
```
POST /analyze-shot
Content-Type: application/json
```

**Body**
```json
{
  "shot_sequence": [
    [
      {"x": 0.5, "y": 0.3, "z": -0.2, "visibility": 0.95},
      ... // 33 landmarks
    ],
    [
      {"x": 0.51, "y": 0.31, "z": -0.21, "visibility": 0.94},
      ... // Frame 2
    ],
    ... // More frames
  ]
}
```

**Response (200)**
```json
{
  "score": 82,
  "feedback": "Excellent shot | Keep your head steady",
  "is_good_shot": true,
  "angle_scores": {
    "left_elbow": 85,
    "right_elbow": 90,
    "left_knee": 80,
    "right_knee": 78
  }
}
```

**Parameters**
- `shot_sequence` (required): Array of pose landmark arrays
  - Each frame is an array of 33 landmarks
  - Minimum 1 frame, recommended 30-60 frames (1-2 seconds)

**Response Fields**
- `score` (int): Overall score 0-100
- `feedback` (string): Comma-separated feedback messages
- `is_good_shot` (bool): True if score ≥ 70
- `angle_scores` (object): Individual scores for each angle

**Example**
```bash
curl -X POST http://localhost:8000/analyze-shot \
  -H "Content-Type: application/json" \
  -d '{
    "shot_sequence": [
      [{"x": 0.5, ...}, ...],
      [{"x": 0.51, ...}, ...],
      ...
    ]
  }'
```

---

### 4. Batch Analyze

Efficiently analyze multiple frames.

**Request**
```
POST /batch-analyze
Content-Type: application/json
```

**Body**
```json
[
  {
    "poseLandmarks": [
      {"x": 0.5, "y": 0.3, "z": -0.2, "visibility": 0.95},
      ... // 33 landmarks
    ]
  },
  {
    "poseLandmarks": [
      {"x": 0.51, "y": 0.31, "z": -0.21, "visibility": 0.94},
      ... // 33 landmarks
    ]
  },
  ... // More frames
]
```

**Response (200)**
```json
[
  {
    "score": 75,
    "feedback": "Good technique",
    "angles": {...}
  },
  {
    "score": 78,
    "feedback": "Keep your elbow up",
    "angles": {...}
  },
  ...
]
```

**Parameters**
- Array of FramePayload objects

**Example**
```bash
curl -X POST http://localhost:8000/batch-analyze \
  -H "Content-Type: application/json" \
  -d '[
    {"poseLandmarks": [...]},
    {"poseLandmarks": [...]}
  ]'
```

---

### 5. Get Ideal Model

Retrieve the ideal model reference data for debugging and visualization.

**Request**
```
GET /ideal-model
```

**Response (200)**
```json
{
  "ideal_sequence": [
    {
      "frame": 0,
      "left_elbow": 145,
      "right_elbow": 165,
      "left_knee": 145,
      "right_knee": 135,
      "head_alignment": 2.5,
      "description": "Setup position - relaxed stance"
    },
    ...
  ],
  "thresholds": {
    "left_elbow": {
      "ideal": 160,
      "min_acceptable": 150,
      "max_acceptable": 170,
      "feedback_low": "Raise your front elbow higher",
      "feedback_high": "Don't over-extend your front elbow"
    },
    ...
  }
}
```

**Response Fields**
- `ideal_sequence`: List of ideal angle frames
- `thresholds`: Angle thresholds and feedback rules

**Example**
```bash
curl http://localhost:8000/ideal-model
```

---

## Data Models

### Landmark

Represents a single body point from MediaPipe.

```json
{
  "x": 0.5,           // 0-1, normalized to image width
  "y": 0.3,           // 0-1, normalized to image height
  "z": -0.2,          // Relative depth
  "visibility": 0.95  // 0-1, confidence score
}
```

**MediaPipe Landmark Indices (0-32)**

| Index | Name | Index | Name |
|-------|------|-------|------|
| 0 | Nose | 17 | Pelvis |
| 1 | Left Eye Inner | 18 | Left Hip |
| 2 | Left Eye | 19 | Left Hip (extra) |
| 3 | Left Eye Outer | 20 | Right Hip |
| 4 | Right Eye Inner | 21 | Right Hip (extra) |
| 5 | Right Eye | 22 | Spine |
| 6 | Right Eye Outer | 23 | Left Hip |
| 7 | Left Ear | 24 | Right Hip |
| 8 | Right Ear | 25 | Left Knee |
| 9 | Mouth Left | 26 | Right Knee |
| 10 | Mouth Right | 27 | Left Ankle |
| 11 | Left Shoulder | 28 | Right Ankle |
| 12 | Right Shoulder | 29 | Left Heel |
| 13 | Left Elbow | 30 | Right Heel |
| 14 | Right Elbow | 31 | Left Foot Index |
| 15 | Left Wrist | 32 | Right Foot Index |
| 16 | Right Wrist |

### FramePayload

Request body for single frame analysis.

```json
{
  "poseLandmarks": [Landmark, ...]  // 33 landmarks
}
```

### FrameAnalysisResponse

Response from `/analyze-frame`.

```json
{
  "score": 75,              // 0-100
  "feedback": "string",     // Feedback message
  "angles": {
    "left_elbow": 150,
    "right_elbow": 165,
    "left_knee": 140,
    "right_knee": 135,
    "head_alignment": 0.5
  }
}
```

### ShotSequencePayload

Request body for shot sequence analysis.

```json
{
  "shot_sequence": [
    [Landmark, ...],  // Frame 1 (33 landmarks)
    [Landmark, ...],  // Frame 2
    ...
  ]
}
```

### ShotAnalysisResponse

Response from `/analyze-shot`.

```json
{
  "score": 82,                      // 0-100
  "feedback": "string",             // Combined feedback
  "is_good_shot": true,            // Score ≥ 70
  "angle_scores": {
    "left_elbow": 85,
    "right_elbow": 90,
    "left_knee": 80,
    "right_knee": 78
  }
}
```

---

## Error Codes

| Code | Message | Cause |
|------|---------|-------|
| 200 | OK | Success |
| 400 | Bad Request | Invalid input format |
| 422 | Validation Error | Missing or invalid fields |
| 500 | Internal Server Error | Backend error |
| 503 | Service Unavailable | Server overloaded |

---

## Rate Limiting

Currently no rate limiting. For production, implement:
- 100 requests/minute per IP
- 1000 frames/minute per user

---

## Timeout

API request timeout: 30 seconds

---

## CORS Headers

Allowed origins:
```
http://localhost:3000
http://127.0.0.1:3000
```

Add more origins in `main.py`:
```python
allow_origins=["http://yourdomain.com"]
```

---

## Examples

### JavaScript/React Example

```javascript
// Single frame analysis
async function analyzeFrame(landmarks) {
  const response = await fetch('http://localhost:8000/analyze-frame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ poseLandmarks: landmarks })
  });
  return await response.json();
}

// Shot sequence analysis
async function analyzeShotSequence(frames) {
  const response = await fetch('http://localhost:8000/analyze-shot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shot_sequence: frames })
  });
  return await response.json();
}
```

### Python Example

```python
import requests

# Single frame
response = requests.post(
    'http://localhost:8000/analyze-frame',
    json={'poseLandmarks': landmarks}
)
result = response.json()
print(f"Score: {result['score']}")
print(f"Feedback: {result['feedback']}")

# Shot sequence
response = requests.post(
    'http://localhost:8000/analyze-shot',
    json={'shot_sequence': frames}
)
result = response.json()
print(f"Overall Score: {result['score']}")
```

### cURL Examples

```bash
# Health check
curl http://localhost:8000/health

# Single frame (create test.json first)
curl -X POST http://localhost:8000/analyze-frame \
  -H "Content-Type: application/json" \
  -d @test.json

# Get ideal model
curl http://localhost:8000/ideal-model | python -m json.tool
```

---

## API Documentation UI

Access interactive API docs:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Monitoring

Health check script:

```bash
#!/bin/bash
while true; do
  curl -s http://localhost:8000/health | jq .
  sleep 5
done
```

---

## Performance Tips

1. **Batch Operations**: Use `/batch-analyze` for multiple frames
2. **Frame Skipping**: Analyze every 2nd frame for performance
3. **Connection Pooling**: Reuse HTTP connections
4. **Compression**: Enable gzip if needed

---

## Version History

- **v1.0.0** (current): Initial release
- Features: Single frame, shot sequence, batch analysis

---

For questions or issues, check:
- Interactive docs: `http://localhost:8000/docs`
- Code comments in `main.py`
- README.md for setup help
