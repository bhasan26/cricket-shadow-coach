import logging
import os
import sys
import uuid
from typing import Annotated, Literal

from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, FiniteFloat, field_validator, model_validator

# Add current directory to path so Vercel can find local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import local modules
from angle_utils import extract_shot_angles
from contact import contact_availability, submit_contact
from shot_evaluator import SCORING_VERSION, evaluate_frame, evaluate_shot

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

app.get("/api/contact/status")(contact_availability)
app.post("/api/contact", status_code=202)(submit_contact)


# Request/Response models
class Landmark(BaseModel):
    # Image landmarks can legitimately lie outside the frame, and world
    # landmarks use metres. Require finite coordinates rather than clamping.
    x: FiniteFloat
    y: FiniteFloat
    z: FiniteFloat
    visibility: float = Field(default=1.0, ge=0.0, le=1.0, allow_inf_nan=False)


def _validate_frame(frame: list[Landmark]) -> list[Landmark]:
    if len(frame) != POSE_LANDMARK_COUNT:
        raise ValueError(f"Each frame must contain exactly {POSE_LANDMARK_COUNT} landmarks (got {len(frame)})")
    return frame


class FramePayload(BaseModel):
    poseLandmarks: list[Landmark]
    image_width: int | None = Field(default=None, gt=0, le=16384)
    image_height: int | None = Field(default=None, gt=0, le=16384)

    @model_validator(mode="after")
    def check_dimensions(self):
        if (self.image_width is None) != (self.image_height is None):
            raise ValueError("Supply both image_width and image_height")
        return self

    @field_validator("poseLandmarks")
    @classmethod
    def check_frame(cls, v):
        return _validate_frame(v)


class ShotSequencePayload(BaseModel):
    shot_sequence: list[list[Landmark]] = Field(max_length=MAX_SEQUENCE_FRAMES)
    shot_type: Literal[
        "cover_drive", "straight_drive", "pull_shot", "defensive_block",
        "flick_shot", "bowling_action",
    ] = "cover_drive"
    is_right_handed: bool = True
    # Optional MediaPipe world landmarks (metric 3D). When present, backend angles
    # are computed from these instead of the 2D image projection.
    world_landmarks: list[list[Landmark]] | None = Field(default=None, max_length=MAX_SEQUENCE_FRAMES)
    image_width: int | None = Field(default=None, gt=0, le=16384)
    image_height: int | None = Field(default=None, gt=0, le=16384)
    frame_timestamps_ms: list[FiniteFloat] | None = Field(default=None, max_length=MAX_SEQUENCE_FRAMES)

    @field_validator("shot_sequence", "world_landmarks")
    @classmethod
    def check_sequence(cls, v):
        if v is None:
            return v
        for frame in v:
            _validate_frame(frame)
        return v

    @model_validator(mode="after")
    def check_alignment(self):
        if self.world_landmarks is not None and len(self.world_landmarks) != len(self.shot_sequence):
            raise ValueError("World landmarks must have one frame per shot-sequence frame")
        if (self.image_width is None) != (self.image_height is None):
            raise ValueError("Supply both image_width and image_height")
        if self.frame_timestamps_ms is not None:
            if len(self.frame_timestamps_ms) != len(self.shot_sequence):
                raise ValueError("Timestamps must align with shot-sequence frames")
            if any(b <= a for a, b in zip(self.frame_timestamps_ms, self.frame_timestamps_ms[1:])):
                raise ValueError("Frame timestamps must be strictly increasing")
        return self


class FrameAnalysisResponse(BaseModel):
    score: int
    feedback: str
    angles: dict = {}


class ShotAnalysisResponse(BaseModel):
    score: int
    feedback: str
    is_good_shot: bool
    scoring_version: str = SCORING_VERSION
    shot_type: str = "cover_drive"
    shot_name: str = "Cover Drive"
    angle_scores: dict = {}
    tracking_quality: float = 100.0
    disclaimer: str = ""
    camera_angle_warning: str = ""
    # "normal" | "low" — low when the bowling measurement window was too short
    # or joints were poorly tracked. Empty for batting drills.
    confidence: str = ""
    # Which recorded reference the motion actually resembled:
    # {"best", "best_name", "margin", "confident", "matches_selection"}.
    # Absent for bowling actions, which have no reference to match against.
    shot_match: dict | None = None
    # Degrees of body-build/camera offset removed before grading technique.
    build_calibration: float = 0.0


def _frame_to_dicts(frame: list[Landmark]) -> list[dict]:
    """Existing angle utilities expect landmark dicts, not pydantic models."""
    return [lm.model_dump() for lm in frame]


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "Cricket Batting Coach API"}


@app.post("/api/analyze-frame", response_model=FrameAnalysisResponse)
def analyze_frame(payload: FramePayload):
    """Analyze a single frame of pose data."""
    try:
        angles = extract_shot_angles(_frame_to_dicts(payload.poseLandmarks),
                                     image_width=payload.image_width, image_height=payload.image_height)
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
def analyze_shot_sequence(payload: ShotSequencePayload):
    """Analyze a complete shot sequence using DTW comparison."""
    if not payload.shot_sequence:
        return ShotAnalysisResponse(
            score=0,
            feedback="No frames in sequence",
            is_good_shot=False,
        )
    try:
        world = payload.world_landmarks
        angle_sequence = []
        for i, frame in enumerate(payload.shot_sequence):
            wl = None
            if world and i < len(world) and len(world[i]) == POSE_LANDMARK_COUNT:
                wl = _frame_to_dicts(world[i])
            angles = extract_shot_angles(_frame_to_dicts(frame), world_landmarks=wl,
                                         image_width=payload.image_width, image_height=payload.image_height)
            if payload.frame_timestamps_ms is not None:
                angles["timestamp_ms"] = payload.frame_timestamps_ms[i]
            angle_sequence.append(angles)

        result = evaluate_shot(
            None, angle_sequence,
            shot_type=payload.shot_type,
            is_right_handed=payload.is_right_handed,
        )
        return ShotAnalysisResponse(
            score=result.get("score", 0),
            feedback=result.get("feedback", "Shot analyzed"),
            is_good_shot=result.get("is_good_shot", False),
            shot_type=result.get("shot_type", payload.shot_type),
            shot_name=result.get("shot_name", "Cover Drive"),
            angle_scores=result.get("angle_scores", {}),
            tracking_quality=result.get("tracking_quality", 100.0),
            disclaimer=result.get("disclaimer", ""),
            camera_angle_warning=result.get("camera_angle_warning", ""),
            confidence=result.get("confidence", ""),
            shot_match=result.get("shot_match"),
            build_calibration=result.get("build_calibration", 0.0),
        )
    except Exception:
        logger.exception("analyze_shot failed")
        raise HTTPException(status_code=500, detail="Analysis failed")


@app.post("/api/batch-analyze")
def batch_analyze(payloads: Annotated[list[FramePayload], Body(max_length=MAX_SEQUENCE_FRAMES)]):
    """Analyze multiple frames in batch."""
    try:
        results = []
        for payload in payloads:
            angles = extract_shot_angles(_frame_to_dicts(payload.poseLandmarks),
                                         image_width=payload.image_width, image_height=payload.image_height)
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
async def track_ball(video: UploadFile = File(...)):  # noqa: B008 — FastAPI dependency-injection idiom
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
        with open(temp_path, "wb") as buffer:  # noqa: ASYNC230 — bounded chunked write, gated endpoint
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
        from geo import ANGLE_THRESHOLDS, get_ideal_angle_sequence
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
