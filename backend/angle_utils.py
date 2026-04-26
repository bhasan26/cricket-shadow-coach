"""
Angle calculation utilities for cricket biomechanics analysis.

This module contains functions to calculate angles between three points
in 3D space using NumPy. It focuses on critical joint angles for evaluating
cricket batting technique, particularly the cover drive shot.
"""

import numpy as np


def calculate_angle(point_a, point_b, point_c):
    """
    Calculate the angle at point_b formed by points a, b, and c in 3D space.
    
    Uses the dot product formula: cos(θ) = (u·v) / (||u|| ||v||)
    where u = a - b and v = c - b are vectors formed by the three points.
    
    Args:
        point_a: Tuple or array of (x, y, z) coordinates for point A
        point_b: Tuple or array of (x, y, z) coordinates for point B (vertex)
        point_c: Tuple or array of (x, y, z) coordinates for point C
    
    Returns:
        Float: Angle in degrees (0-180)
    """
    a = np.array(point_a, dtype=np.float32)
    b = np.array(point_b, dtype=np.float32)
    c = np.array(point_c, dtype=np.float32)
    
    # Create vectors from b to a and b to c
    ba = a - b
    bc = c - b
    
    # Calculate magnitudes
    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)
    
    # Avoid division by zero
    if norm_ba == 0 or norm_bc == 0:
        return 0.0
    
    # Calculate cosine of angle and clip to valid range
    cosine = np.dot(ba, bc) / (norm_ba * norm_bc)
    cosine = np.clip(cosine, -1.0, 1.0)
    
    # Convert to degrees
    angle_rad = np.arccos(cosine)
    angle_deg = float(np.degrees(angle_rad))
    
    return angle_deg


def get_left_elbow_angle(landmarks):
    """
    Calculate the left elbow angle (shoulder-elbow-wrist).
    
    MediaPipe indices: 11=left_shoulder, 13=left_elbow, 15=left_wrist
    
    Args:
        landmarks: List of landmark dicts or tuples with x, y, z
    
    Returns:
        Float: Angle in degrees
    """
    try:
        vis = [landmarks[i].get("visibility", 1.0) for i in [11, 13, 15]]
        if sum(vis) / 3 < 0.4 or min(vis) < 0.1:
            return 0.0
            
        shoulder = (landmarks[11]["x"], landmarks[11]["y"], landmarks[11]["z"])
        elbow = (landmarks[13]["x"], landmarks[13]["y"], landmarks[13]["z"])
        wrist = (landmarks[15]["x"], landmarks[15]["y"], landmarks[15]["z"])
        return calculate_angle(shoulder, elbow, wrist)
    except (KeyError, IndexError, TypeError):
        return 0.0


def get_right_elbow_angle(landmarks):
    """
    Calculate the right elbow angle (shoulder-elbow-wrist).
    
    MediaPipe indices: 12=right_shoulder, 14=right_elbow, 16=right_wrist
    
    Args:
        landmarks: List of landmark dicts or tuples with x, y, z
    
    Returns:
        Float: Angle in degrees
    """
    try:
        vis = [landmarks[i].get("visibility", 1.0) for i in [12, 14, 16]]
        if sum(vis) / 3 < 0.4 or min(vis) < 0.1:
            return 0.0
            
        shoulder = (landmarks[12]["x"], landmarks[12]["y"], landmarks[12]["z"])
        elbow = (landmarks[14]["x"], landmarks[14]["y"], landmarks[14]["z"])
        wrist = (landmarks[16]["x"], landmarks[16]["y"], landmarks[16]["z"])
        return calculate_angle(shoulder, elbow, wrist)
    except (KeyError, IndexError, TypeError):
        return 0.0


def get_left_knee_angle(landmarks):
    """
    Calculate the left knee angle (hip-knee-ankle).
    
    MediaPipe indices: 23=left_hip, 25=left_knee, 27=left_ankle
    
    Args:
        landmarks: List of landmark dicts or tuples with x, y, z
    
    Returns:
        Float: Angle in degrees
    """
    try:
        vis = [landmarks[i].get("visibility", 1.0) for i in [23, 25, 27]]
        if sum(vis) / 3 < 0.4 or min(vis) < 0.1:
            return 0.0
            
        hip = (landmarks[23]["x"], landmarks[23]["y"], landmarks[23]["z"])
        knee = (landmarks[25]["x"], landmarks[25]["y"], landmarks[25]["z"])
        ankle = (landmarks[27]["x"], landmarks[27]["y"], landmarks[27]["z"])
        return calculate_angle(hip, knee, ankle)
    except (KeyError, IndexError, TypeError):
        return 0.0


def get_right_knee_angle(landmarks):
    """
    Calculate the right knee angle (hip-knee-ankle).
    
    MediaPipe indices: 24=right_hip, 26=right_knee, 28=right_ankle
    
    Args:
        landmarks: List of landmark dicts or tuples with x, y, z
    
    Returns:
        Float: Angle in degrees
    """
    try:
        vis = [landmarks[i].get("visibility", 1.0) for i in [24, 26, 28]]
        if sum(vis) / 3 < 0.4 or min(vis) < 0.1:
            return 0.0
            
        hip = (landmarks[24]["x"], landmarks[24]["y"], landmarks[24]["z"])
        knee = (landmarks[26]["x"], landmarks[26]["y"], landmarks[26]["z"])
        ankle = (landmarks[28]["x"], landmarks[28]["y"], landmarks[28]["z"])
        return calculate_angle(hip, knee, ankle)
    except (KeyError, IndexError, TypeError):
        return 0.0


def get_head_alignment(landmarks):
    """
    Calculate head alignment relative to the front foot.
    Uses nose and left shoulder as proxy for head orientation.
    
    MediaPipe indices: 0=nose, 11=left_shoulder
    
    Args:
        landmarks: List of landmark dicts or tuples with x, y, z
    
    Returns:
        Float: Y-axis difference (positive = head over front side)
    """
    try:
        nose_y = landmarks[0]["y"]
        shoulder_y = landmarks[11]["y"]
        return float(nose_y - shoulder_y)
    except (KeyError, IndexError, TypeError):
        return 0.0


def extract_shot_angles(landmarks):
    """
    Extract all critical angles for shot evaluation.
    
    Args:
        landmarks: List of 33 landmark dicts from MediaPipe Pose
    
    Returns:
        Dict: Dictionary of angle measurements
    """
    return {
        "left_elbow": get_left_elbow_angle(landmarks),
        "right_elbow": get_right_elbow_angle(landmarks),
        "left_knee": get_left_knee_angle(landmarks),
        "right_knee": get_right_knee_angle(landmarks),
        "head_alignment": get_head_alignment(landmarks),
    }


def calculate_distance(point_a, point_b):
    """
    Calculate Euclidean distance between two 3D points.
    
    Args:
        point_a: Tuple or array of (x, y, z)
        point_b: Tuple or array of (x, y, z)
    
    Returns:
        Float: Euclidean distance
    """
    a = np.array(point_a, dtype=np.float32)
    b = np.array(point_b, dtype=np.float32)
    return float(np.linalg.norm(a - b))
