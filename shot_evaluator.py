"""
Shot evaluation engine using DTW and biomechanical feedback.

This module orchestrates the comparison of user's shot against ideal models,
generating scores and contextual feedback.
"""

import numpy as np
from angle_utils import extract_shot_angles, calculate_distance
from geo import (
    get_ideal_angle_sequence,
    get_angle_threshold,
    get_feedback_for_angle,
    get_position_feedback,
)


def evaluate_frame(landmarks, frame_index=0):
    """
    Evaluate a single frame of pose data.
    
    Args:
        landmarks: List of 33 MediaPipe landmarks
        frame_index: Position in the shot sequence for context
    
    Returns:
        Dict: Angle measurements and initial feedback
    """
    angles = extract_shot_angles(landmarks)
    return angles


def generate_feedback_list(angles):
    """
    Generate list of feedback strings based on angle deviations.
    
    Args:
        angles: Dict of angle measurements
    
    Returns:
        List: List of feedback strings
    """
    feedback_list = []
    
    for angle_name, angle_value in angles.items():
        if angle_name == "head_alignment":
            continue
        
        fb = get_feedback_for_angle(angle_name, angle_value)
        if fb:
            feedback_list.append(fb)
    
    return feedback_list


def calculate_shot_score(angles, ideal_angles=None):
    """
    Calculate a score based on how close angles are to ideal.
    
    Uses a weighted sum approach: each angle deviation contributes
    to the overall score penalty.
    
    Args:
        angles: Dict of user's measured angles
        ideal_angles: Dict of ideal angles (uses first frame if None)
    
    Returns:
        Float: Score from 0-100
    """
    if ideal_angles is None:
        ideal_seq = get_ideal_angle_sequence()
        ideal_angles = ideal_seq[0]
    
    angle_keys = ["left_elbow", "right_elbow", "left_knee", "right_knee"]
    deviations = []
    
    for key in angle_keys:
        user_val = angles.get(key, 0)
        ideal_val = ideal_angles.get(key, 0)
        deviation = abs(user_val - ideal_val)
        deviations.append(deviation)
    
    # Average deviation, scaled to 0-100 score
    # Assume 30 degrees deviation = 0 score, 0 degrees = 100 score
    avg_deviation = np.mean(deviations)
    score = max(0, 100 - (avg_deviation / 30 * 100))
    
    return float(score)


def calculate_sequence_score(angle_sequence):
    """
    Calculate score for an entire shot sequence using DTW distance.
    
    Args:
        angle_sequence: List of angle dicts over time
    
    Returns:
        Dict: Score, feedback, and per-angle analysis
    """
    if not angle_sequence:
        return {
            "score": 0,
            "feedback": "No data captured",
            "matches": 0,
        }
    
    ideal_seq = get_ideal_angle_sequence()
    angle_keys = ["left_elbow", "right_elbow", "left_knee", "right_knee"]
    
    # Extract individual angle sequences
    user_sequences = {}
    ideal_sequences = {}
    
    for key in angle_keys:
        user_sequences[key] = [f.get(key, 0) for f in angle_sequence]
        ideal_sequences[key] = [f.get(key, 0) for f in ideal_seq]
    
    # Pad user sequence if shorter than ideal
    max_length = max(len(angle_sequence), len(ideal_seq))
    for key in angle_keys:
        if len(user_sequences[key]) < max_length:
            user_sequences[key].extend([user_sequences[key][-1]] * (max_length - len(user_sequences[key])))
        if len(ideal_sequences[key]) < max_length:
            ideal_sequences[key].extend([ideal_sequences[key][-1]] * (max_length - len(ideal_sequences[key])))
    
    # Calculate DTW-based scores for each angle
    angle_scores = {}
    total_score = 0
    
    try:
        from fastdtw import fastdtw
        from scipy.spatial.distance import euclidean
        
        for key in angle_keys:
            user_arr = np.array(user_sequences[key], dtype=np.float32).reshape(-1, 1)
            ideal_arr = np.array(ideal_sequences[key], dtype=np.float32).reshape(-1, 1)
            
            distance, _ = fastdtw(user_arr, ideal_arr, dist=euclidean)
            # Convert distance to score (0-100)
            angle_scores[key] = max(0, 100 - min(100, distance))
            total_score += angle_scores[key]
        
        score = total_score / len(angle_keys)
    except ImportError:
        # Fallback if fastdtw not available: use simple deviation
        total_deviation = 0
        for key in angle_keys:
            deviations = [abs(u - i) for u, i in zip(user_sequences[key], ideal_sequences[key])]
            avg_dev = np.mean(deviations)
            angle_scores[key] = max(0, 100 - (avg_dev / 30 * 100))
            total_score += angle_scores[key]
        
        score = total_score / len(angle_keys)
    
    # Generate comprehensive feedback
    feedback_list = []
    
    # Check final position angles
    if angle_sequence:
        final_angles = angle_sequence[-1]
        for key in angle_keys:
            fb = get_feedback_for_angle(key, final_angles.get(key, 0))
            if fb:
                feedback_list.append(fb)
    
    # Add position feedback
    pos_feedback = get_position_feedback(len(angle_sequence))
    if pos_feedback:
        feedback_list.append(pos_feedback)
    
    # Ensure we have some feedback
    if not feedback_list:
        feedback_list.append("Good shot technique!")
    
    return {
        "score": int(round(score)),
        "feedback": " | ".join(feedback_list[:3]),  # Limit to 3 feedback items
        "angle_scores": angle_scores,
        "is_good_shot": score >= 70,
    }


def evaluate_shot(current_angles, accumulated_sequence=None):
    """
    Main entry point for shot evaluation.
    
    Can evaluate either a single frame or a full sequence.
    
    Args:
        current_angles: Dict of angles for current frame
        accumulated_sequence: Optional list of angle dicts from full shot
    
    Returns:
        Dict: Score, feedback, and analysis
    """
    if accumulated_sequence:
        return calculate_sequence_score(accumulated_sequence)
    else:
        # Single frame evaluation
        score = calculate_shot_score(current_angles)
        feedback_list = generate_feedback_list(current_angles)
        feedback = " | ".join(feedback_list) if feedback_list else "Frame captured"
        
        return {
            "score": int(round(score)),
            "feedback": feedback,
            "angles": current_angles,
        }
