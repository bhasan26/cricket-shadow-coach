"""
Dynamic Time Warping utilities for comparing user motion against ideal models.

DTW is used to match two time series of different speeds while accounting
for natural variations in execution speed during cricket batting.
"""

from fastdtw import fastdtw
from scipy.spatial.distance import euclidean
import numpy as np


def calculate_dtw_distance(user_sequence, ideal_sequence):
    """
    Calculate Dynamic Time Warping distance between two angle sequences.
    
    DTW allows for temporal distortions - one sequence can be "faster"
    than the other, which is natural in human motion variations.
    
    Args:
        user_sequence: List of angles from user's shot
        ideal_sequence: List of angles from ideal model
    
    Returns:
        Tuple: (distance, normalized_distance 0-100)
    """
    if not user_sequence or not ideal_sequence:
        return float('inf'), 0.0

    # Convert to numpy arrays for distance calculation
    user_array = np.array(user_sequence, dtype=np.float32).reshape(-1, 1)
    ideal_array = np.array(ideal_sequence, dtype=np.float32).reshape(-1, 1)

    try:
        distance, path = fastdtw(user_array, ideal_array, dist=euclidean)
        return distance, dtw_score(distance, path)
    except Exception as e:
        print(f"DTW calculation error: {e}")
        return float('inf'), 0.0


# Calibration constant mapping average per-step DTW deviation (in degrees) to a
# score penalty. Tuned via api/eval so a clean rep lands ~80-95 (see run_eval.py).
DTW_SCORE_K = 4.0


def dtw_score(distance, path, k=DTW_SCORE_K):
    """
    Convert a raw DTW distance to a 0-100 score, normalized by the length of the
    warping path so longer recordings aren't penalized just for being longer.

    A raw distance grows with the number of matched steps; dividing by the path
    length yields the average per-step deviation (roughly in degrees for a single
    angle channel), which is comparable across recording durations.
    """
    steps = max(1, len(path))
    per_step = distance / steps
    return float(max(0.0, 100.0 - per_step * k))


def calculate_angle_deviation(user_value, ideal_value, tolerance=5.0):
    """
    Calculate absolute deviation between user and ideal angle at a point.
    
    Args:
        user_value: User's measured angle
        ideal_value: Ideal target angle
        tolerance: Acceptable deviation in degrees
    
    Returns:
        Tuple: (deviation, is_acceptable)
    """
    deviation = abs(user_value - ideal_value)
    is_acceptable = deviation <= tolerance
    return deviation, is_acceptable


def generate_score_from_dtw(dtw_distance, max_expected_distance=100):
    """
    Convert DTW distance to a percentage score (0-100).
    
    Args:
        dtw_distance: Raw DTW distance value
        max_expected_distance: Distance threshold for 0% score
    
    Returns:
        Float: Score from 0-100
    """
    if dtw_distance <= 0:
        return 100.0
    
    score = max(0, 100 - (dtw_distance / max_expected_distance * 100))
    return float(score)


def compare_angle_sequences(user_angles_sequence, ideal_angles_sequence):
    """
    Comprehensive comparison of user's shot against ideal model.
    
    Args:
        user_angles_sequence: List of dicts with angle measurements over time
        ideal_angles_sequence: List of dicts with ideal angle measurements
    
    Returns:
        Dict: Comparison results including score and per-angle deviations
    """
    results = {
        "dtw_distance": 0.0,
        "score": 0.0,
        "angle_deviations": {},
        "is_match": False,
    }
    
    if not user_angles_sequence or not ideal_angles_sequence:
        return results
    
    # Extract individual angle sequences
    angle_keys = ["left_elbow", "right_elbow", "left_knee", "right_knee"]
    
    comparison = {}
    for key in angle_keys:
        user_seq = [frame.get(key, 0) for frame in user_angles_sequence]
        ideal_seq = [frame.get(key, 0) for frame in ideal_angles_sequence]
        
        distance, score = calculate_dtw_distance(user_seq, ideal_seq)
        comparison[key] = {
            "distance": distance,
            "score": score,
        }
    
    # Average the scores
    avg_score = np.mean([comparison[k]["score"] for k in angle_keys])
    
    results["score"] = float(avg_score)
    results["angle_deviations"] = comparison
    results["is_match"] = avg_score >= 70.0  # 70% threshold for acceptable match
    
    return results
