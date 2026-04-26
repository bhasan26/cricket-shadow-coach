import numpy as np
from typing import List, Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import local modules
from angle_utils import extract_shot_angles
from shot_evaluator import evaluate_frame, evaluate_shot


app = FastAPI(
    title="Cricket Batting Coach API",
    description="Real-time pose analysis for cricket shot evaluation",
    version="1.0.0"
)

# Configure CORS — allow local dev + production Vercel domains
import os

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",") if os.environ.get("ALLOWED_ORIGINS") else []
ALLOWED_ORIGINS += [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
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


class FramePayload(BaseModel):
    poseLandmarks: List[Dict]


class ShotSequencePayload(BaseModel):
    shot_sequence: List[List[Dict]]
    shot_type: str = "cover_drive"


class FrameAnalysisResponse(BaseModel):
    score: int
    feedback: str
    angles: Dict = {}


class ShotAnalysisResponse(BaseModel):
    score: int
    feedback: str
    is_good_shot: bool
    shot_type: str = "cover_drive"
    shot_name: str = "Cover Drive"
    angle_scores: Dict = {}


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "Cricket Batting Coach API"}


@app.post("/api/analyze-frame", response_model=FrameAnalysisResponse)
async def analyze_frame(payload: FramePayload):
    """
    Analyze a single frame of pose data.
    
    Extracts joint angles and generates immediate feedback.
    
    Args:
        payload: FramePayload containing list of pose landmarks
    
    Returns:
        FrameAnalysisResponse with score and feedback
    """
    try:
        # Extract angles from landmarks
        angles = extract_shot_angles(payload.poseLandmarks)
        
        # Evaluate the frame
        result = evaluate_frame(angles)
        
        return FrameAnalysisResponse(
            score=result.get("score", 0),
            feedback=result.get("feedback", "Frame captured"),
            angles=angles,
        )
    except Exception as e:
        print(f"Error in analyze_frame: {e}")
        return FrameAnalysisResponse(
            score=0,
            feedback=f"Error: {str(e)}",
            angles={},
        )


@app.post("/api/analyze-shot", response_model=ShotAnalysisResponse)
async def analyze_shot_sequence(payload: ShotSequencePayload):
    """
    Analyze a complete shot sequence using DTW comparison.
    
    Compares user's sequence against the selected ideal shot model.
    
    Args:
        payload: ShotSequencePayload containing pose landmarks and shot_type
    
    Returns:
        ShotAnalysisResponse with overall score and comprehensive feedback
    """
    try:
        if not payload.shot_sequence:
            return ShotAnalysisResponse(
                score=0,
                feedback="No frames in sequence",
                is_good_shot=False,
            )
        
        # Extract angles for each frame
        angle_sequence = []
        for landmarks in payload.shot_sequence:
            angles = extract_shot_angles(landmarks)
            angle_sequence.append(angles)
        
        # Evaluate the complete sequence against selected shot type
        result = evaluate_shot(None, angle_sequence, shot_type=payload.shot_type)
        
        return ShotAnalysisResponse(
            score=result.get("score", 0),
            feedback=result.get("feedback", "Shot analyzed"),
            is_good_shot=result.get("is_good_shot", False),
            shot_type=result.get("shot_type", payload.shot_type),
            shot_name=result.get("shot_name", "Cover Drive"),
            angle_scores=result.get("angle_scores", {}),
        )
    except Exception as e:
        print(f"Error in analyze_shot: {e}")
        return ShotAnalysisResponse(
            score=0,
            feedback=f"Error: {str(e)}",
            is_good_shot=False,
        )


@app.post("/api/batch-analyze")
async def batch_analyze(payloads: List[FramePayload]):
    """
    Analyze multiple frames in batch.
    
    Useful for processing accumulated frames at once.
    
    Args:
        payloads: List of FramePayload objects
    
    Returns:
        List of analysis results
    """
    results = []
    try:
        for payload in payloads:
            angles = extract_shot_angles(payload.poseLandmarks)
            result = evaluate_frame(angles)
            results.append({
                "score": result.get("score", 0),
                "feedback": result.get("feedback", ""),
                "angles": angles,
            })
    except Exception as e:
        print(f"Error in batch_analyze: {e}")
    
    return results


@app.get("/api/shots")
async def list_shots():
    """
    List all available shot types.
    
    Returns:
        Dict of shot types with name, description, and difficulty
    """
    try:
        from geo import get_shot_list
        return get_shot_list()
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/ideal-model")
async def get_ideal_model(shot_type: str = "cover_drive"):
    """
    Get the ideal model reference data for a specific shot.
    
    Args:
        shot_type: Shot type key (default: cover_drive)
    
    Returns:
        Dict containing ideal angle sequence and thresholds
    """
    try:
        from geo import get_ideal_angle_sequence, ANGLE_THRESHOLDS
        
        return {
            "shot_type": shot_type,
            "ideal_sequence": get_ideal_angle_sequence(shot_type),
            "thresholds": ANGLE_THRESHOLDS,
        }
    except Exception as e:
        print(f"Error in get_ideal_model: {e}")
        return {
            "error": str(e),
        }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
    )

