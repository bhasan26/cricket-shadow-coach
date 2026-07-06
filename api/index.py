import logging
import os
import sys
import uuid
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

# Add current directory to path so Vercel can find local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import local modules
from angle_utils import extract_shot_angles
from shot_evaluator import evaluate_frame, evaluate_shot

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cricket-coach")

# Number of landmarks MediaPipe Pose emits per frame.
POSE_LANDMARK_COUNT = 33
# Guard rails on request size so a malformed/malicious payload can't exhaust memory.
MAX_SEQUENCE_FRAMES = 600
# Ball tracking pulls in opencv + ultralytics, which are only available in the
# container (Render/Fly) image, not Vercel serverless. Gate it behind a flag.
ENABLE_BALL_TRACKING = os.environ.get("ENABLE_BALL_TRACKING", "").lower() in ("1", "true", "yes")
MAX_VIDEO_BYTES = 50 * 1024 * 1024  # 50 MB


app = FastAPI(
    title="Cricket Batting Coach API",
    description="Real-time pose analysis for cricket shot evaluation",
    version="1.1.0"
)

# Configure CORS — allow local dev + production domains (Vercel + custom domain).
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",") if os.environ.get("ALLOWED_ORIGINS") else []
ALLOWED_ORIGINS += [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://www.cricketcoach.online",
    "https://cricketcoach.online",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class Landmark(BaseModel):
    x: float
    y: float
    z: float
    visibility: float = 1.0


def _validate_frame(frame: List[Landmark]) -> List[Landmark]:
    if len(frame) != POSE_LANDMARK_COUNT:
        raise ValueError(f"Each frame must contain exactly {POSE_LANDMARK_COUNT} landmarks (got {len(frame)})")
    return frame


class FramePayload(BaseModel):
    poseLandmarks: List[Landmark]

    @field_validator("poseLandmarks")
    @classmethod
    def check_frame(cls, v):
        return _validate_frame(v)


class ShotSequencePayload(BaseModel):
    shot_sequence: List[List[Landmark]]
    shot_type: str = "cover_drive"

    @field_validator("shot_sequence")
    @classmethod
    def check_sequence(cls, v):
        if len(v) > MAX_SEQUENCE_FRAMES:
            raise ValueError(f"Sequence too long: {len(v)} frames (max {MAX_SEQUENCE_FRAMES})")
        for frame in v:
            _validate_frame(frame)
        return v


class FrameAnalysisResponse(BaseModel):
    score: int
    feedback: str
    angles: dict = {}


class ShotAnalysisResponse(BaseModel):
    score: int
    feedback: str
    is_good_shot: bool
    shot_type: str = "cover_drive"
    shot_name: str = "Cover Drive"
    angle_scores: dict = {}


def _frame_to_dicts(frame: List[Landmark]) -> List[dict]:
    """Existing angle utilities expect landmark dicts, not pydantic models."""
    return [lm.model_dump() for lm in frame]


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "Cricket Batting Coach API"}


@app.post("/api/analyze-frame", response_model=FrameAnalysisResponse)
async def analyze_frame(payload: FramePayload):
    """Analyze a single frame of pose data."""
    try:
        angles = extract_shot_angles(_frame_to_dicts(payload.poseLandmarks))
        result = evaluate_frame(angles)
        return FrameAnalysisResponse(
            score=result.get("score", 0),
            feedback=result.get("feedback", "Frame captured"),
            angles=angles,
        )
    except Exception:
        logger.exception("analyze_frame failed")
        raise HTTPException(status_code=500, detail="Analysis failed")


@app.post("/api/analyze-shot", response_model=ShotAnalysisResponse)
async def analyze_shot_sequence(payload: ShotSequencePayload):
    """Analyze a complete shot sequence using DTW comparison."""
    if not payload.shot_sequence:
        return ShotAnalysisResponse(
            score=0,
            feedback="No frames in sequence",
            is_good_shot=False,
        )
    try:
        angle_sequence = [
            extract_shot_angles(_frame_to_dicts(frame))
            for frame in payload.shot_sequence
        ]
        result = evaluate_shot(None, angle_sequence, shot_type=payload.shot_type)
        return ShotAnalysisResponse(
            score=result.get("score", 0),
            feedback=result.get("feedback", "Shot analyzed"),
            is_good_shot=result.get("is_good_shot", False),
            shot_type=result.get("shot_type", payload.shot_type),
            shot_name=result.get("shot_name", "Cover Drive"),
            angle_scores=result.get("angle_scores", {}),
        )
    except Exception:
        logger.exception("analyze_shot failed")
        raise HTTPException(status_code=500, detail="Analysis failed")


@app.post("/api/batch-analyze")
async def batch_analyze(payloads: List[FramePayload]):
    """Analyze multiple frames in batch."""
    try:
        results = []
        for payload in payloads:
            angles = extract_shot_angles(_frame_to_dicts(payload.poseLandmarks))
            result = evaluate_frame(angles)
            results.append({
                "score": result.get("score", 0),
                "feedback": result.get("feedback", ""),
                "angles": angles,
            })
        return results
    except Exception:
        logger.exception("batch_analyze failed")
        raise HTTPException(status_code=500, detail="Analysis failed")


@app.get("/api/shots")
async def list_shots():
    """List all available shot types."""
    try:
        from geo import get_shot_list
        return get_shot_list()
    except Exception:
        logger.exception("list_shots failed")
        raise HTTPException(status_code=500, detail="Could not load shot list")


@app.post("/api/track-ball")
async def track_ball(video: UploadFile = File(...)):
    """
    Process an uploaded video to track the ball trajectory using YOLO + PCHIP.

    Only available when ENABLE_BALL_TRACKING is set (container deployments); the
    serverless deployment omits the heavy CV dependencies and returns 501.
    """
    if not ENABLE_BALL_TRACKING:
        raise HTTPException(
            status_code=501,
            detail="Ball tracking is not available on this deployment.",
        )

    # Validate content type before touching disk.
    if not (video.content_type or "").startswith("video/"):
        raise HTTPException(status_code=415, detail="Uploaded file must be a video.")

    # Never trust the client-supplied filename — use a random temp path.
    temp_path = f"/tmp/{uuid.uuid4()}.mp4"
    try:
        size = 0
        with open(temp_path, "wb") as buffer:
            while True:
                chunk = await video.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_VIDEO_BYTES:
                    raise HTTPException(status_code=413, detail="Video exceeds 50 MB limit.")
                buffer.write(chunk)

        from ball_tracker import CricketBiomechanicalAnalyzer
        analyzer = CricketBiomechanicalAnalyzer()
        trajectory = analyzer.track_ball_trajectory_pchip(temp_path)
        return {"status": "success", "trajectory": trajectory}
    except HTTPException:
        raise
    except Exception:
        logger.exception("track_ball failed")
        raise HTTPException(status_code=500, detail="Ball tracking failed")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/api/ideal-model")
async def get_ideal_model(shot_type: str = "cover_drive"):
    """Get the ideal model reference data for a specific shot."""
    try:
        from geo import get_ideal_angle_sequence, ANGLE_THRESHOLDS
        return {
            "shot_type": shot_type,
            "ideal_sequence": get_ideal_angle_sequence(shot_type),
            "thresholds": ANGLE_THRESHOLDS,
        }
    except Exception:
        logger.exception("get_ideal_model failed")
        raise HTTPException(status_code=500, detail="Could not load ideal model")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
