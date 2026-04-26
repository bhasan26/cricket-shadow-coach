"""
Ideal model definitions for cricket batting shots.

This module contains hardcoded reference data for biomechanically optimal
cover drive shots. These serve as the comparison baseline for evaluating
user performance.
"""

# Ideal cover drive shot angles over time (captured at 30fps)
# Each frame contains angle measurements in degrees
IDEAL_COVER_DRIVE = [
    {
        "frame": 0,
        "left_elbow": 145,
        "right_elbow": 165,
        "left_knee": 145,
        "right_knee": 135,
        "head_alignment": 2.5,
        "description": "Setup position - relaxed stance"
    },
    {
        "frame": 1,
        "left_elbow": 142,
        "right_elbow": 162,
        "left_knee": 148,
        "right_knee": 132,
        "head_alignment": 2.3,
        "description": "Backswing begins"
    },
    {
        "frame": 2,
        "left_elbow": 138,
        "right_elbow": 155,
        "left_knee": 152,
        "right_knee": 130,
        "head_alignment": 2.0,
        "description": "Backswing continues - loading phase"
    },
    {
        "frame": 3,
        "left_elbow": 130,
        "right_elbow": 145,
        "left_knee": 158,
        "right_knee": 125,
        "head_alignment": 1.8,
        "description": "Maximum backswing - coiled position"
    },
    {
        "frame": 4,
        "left_elbow": 125,
        "right_elbow": 140,
        "left_knee": 155,
        "right_knee": 128,
        "head_alignment": 1.5,
        "description": "Beginning of downswing"
    },
    {
        "frame": 5,
        "left_elbow": 135,
        "right_elbow": 150,
        "left_knee": 145,
        "right_knee": 135,
        "head_alignment": 1.2,
        "description": "Mid-downswing - hip rotation initiates"
    },
    {
        "frame": 6,
        "left_elbow": 155,
        "right_elbow": 160,
        "left_knee": 135,
        "right_knee": 140,
        "head_alignment": 0.8,
        "description": "Bat coming through - extension phase"
    },
    {
        "frame": 7,
        "left_elbow": 168,
        "right_elbow": 165,
        "left_knee": 130,
        "right_knee": 142,
        "head_alignment": 0.5,
        "description": "Contact position - full extension of arms"
    },
    {
        "frame": 8,
        "left_elbow": 170,
        "right_elbow": 168,
        "left_knee": 128,
        "right_knee": 140,
        "head_alignment": 0.3,
        "description": "Just after contact - follow-through begins"
    },
    {
        "frame": 9,
        "left_elbow": 165,
        "right_elbow": 162,
        "left_knee": 132,
        "right_knee": 138,
        "head_alignment": 0.0,
        "description": "Early follow-through"
    },
    {
        "frame": 10,
        "left_elbow": 155,
        "right_elbow": 150,
        "left_knee": 140,
        "right_knee": 135,
        "head_alignment": -0.5,
        "description": "Mid follow-through - bat over shoulder"
    },
]

# Define angle thresholds for feedback generation
ANGLE_THRESHOLDS = {
    "left_elbow": {
        "ideal": 160,
        "min_acceptable": 150,
        "max_acceptable": 170,
        "feedback_low": "Raise your front elbow higher",
        "feedback_high": "Don't over-extend your front elbow",
    },
    "right_elbow": {
        "ideal": 165,
        "min_acceptable": 155,
        "max_acceptable": 175,
        "feedback_low": "Keep your back elbow up",
        "feedback_high": "Slightly lower your back elbow",
    },
    "left_knee": {
        "ideal": 135,
        "min_acceptable": 120,
        "max_acceptable": 150,
        "feedback_low": "Bend your front knee more",
        "feedback_high": "Don't over-bend your front knee",
    },
    "right_knee": {
        "ideal": 140,
        "min_acceptable": 125,
        "max_acceptable": 155,
        "feedback_low": "Bend your back knee slightly",
        "feedback_high": "Don't bend your back knee too much",
    },
}

# Position-based feedback for different stages
POSITION_FEEDBACK = {
    "setup": "Keep your feet shoulder-width apart and relaxed",
    "backswing": "Rotate your shoulders early",
    "downswing": "Drive through with your hips",
    "contact": "Head steady, eyes on the ball",
    "follow_through": "Complete your follow-through naturally",
}


def get_ideal_angle_sequence():
    """
    Get the ideal angle sequence for a cover drive shot.
    
    Returns:
        List: List of angle measurements at each frame
    """
    return IDEAL_COVER_DRIVE


def get_angle_threshold(angle_name):
    """
    Get threshold information for a specific angle.
    
    Args:
        angle_name: Name of the angle (e.g., 'left_elbow')
    
    Returns:
        Dict: Threshold and feedback information
    """
    return ANGLE_THRESHOLDS.get(angle_name, {})


def get_feedback_for_angle(angle_name, user_value):
    """
    Generate feedback based on how far user's angle deviates from ideal.
    
    Args:
        angle_name: Name of the angle
        user_value: User's measured angle value
    
    Returns:
        String: Feedback message (empty string if within acceptable range)
    """
    threshold = get_angle_threshold(angle_name)
    if not threshold:
        return ""
    
    ideal = threshold.get("ideal", 0)
    deviation = user_value - ideal
    
    if deviation < -10:  # Significantly too low
        return threshold.get("feedback_low", "")
    elif deviation > 10:  # Significantly too high
        return threshold.get("feedback_high", "")
    
    return ""


def get_position_feedback(frame_index):
    """
    Get position-based feedback for a specific frame in the shot sequence.
    
    Args:
        frame_index: Frame number in the shot sequence
    
    Returns:
        String: Position-specific feedback
    """
    if frame_index < 1:
        return POSITION_FEEDBACK.get("setup", "")
    elif frame_index < 3:
        return POSITION_FEEDBACK.get("backswing", "")
    elif frame_index < 6:
        return POSITION_FEEDBACK.get("downswing", "")
    elif frame_index < 9:
        return POSITION_FEEDBACK.get("contact", "")
    else:
        return POSITION_FEEDBACK.get("follow_through", "")
