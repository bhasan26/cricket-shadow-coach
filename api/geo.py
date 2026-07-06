"""
Ideal model definitions for cricket batting shots.

This module contains hardcoded reference data for biomechanically optimal
cricket shots. These serve as the comparison baseline for evaluating
user performance.
"""

# ─── COVER DRIVE ─────────────────────────────────────────────────────────
IDEAL_COVER_DRIVE = [
    {
        "frame": 0,
        "left_elbow": 145, "right_elbow": 165,
        "left_knee": 145, "right_knee": 135,
        "head_alignment": 2.5,
        "description": "Setup position - relaxed stance"
    },
    {
        "frame": 1,
        "left_elbow": 142, "right_elbow": 162,
        "left_knee": 148, "right_knee": 132,
        "head_alignment": 2.3,
        "description": "Backswing begins"
    },
    {
        "frame": 2,
        "left_elbow": 138, "right_elbow": 155,
        "left_knee": 152, "right_knee": 130,
        "head_alignment": 2.0,
        "description": "Backswing continues - loading phase"
    },
    {
        "frame": 3,
        "left_elbow": 130, "right_elbow": 145,
        "left_knee": 158, "right_knee": 125,
        "head_alignment": 1.8,
        "description": "Maximum backswing - coiled position"
    },
    {
        "frame": 4,
        "left_elbow": 125, "right_elbow": 140,
        "left_knee": 155, "right_knee": 128,
        "head_alignment": 1.5,
        "description": "Beginning of downswing"
    },
    {
        "frame": 5,
        "left_elbow": 135, "right_elbow": 150,
        "left_knee": 145, "right_knee": 135,
        "head_alignment": 1.2,
        "description": "Mid-downswing - hip rotation initiates"
    },
    {
        "frame": 6,
        "left_elbow": 155, "right_elbow": 160,
        "left_knee": 135, "right_knee": 140,
        "head_alignment": 0.8,
        "description": "Bat coming through - extension phase"
    },
    {
        "frame": 7,
        "left_elbow": 168, "right_elbow": 165,
        "left_knee": 130, "right_knee": 142,
        "head_alignment": 0.5,
        "description": "Contact position - full extension of arms"
    },
    {
        "frame": 8,
        "left_elbow": 170, "right_elbow": 168,
        "left_knee": 128, "right_knee": 140,
        "head_alignment": 0.3,
        "description": "Just after contact - follow-through begins"
    },
    {
        "frame": 9,
        "left_elbow": 165, "right_elbow": 162,
        "left_knee": 132, "right_knee": 138,
        "head_alignment": 0.0,
        "description": "Early follow-through"
    },
    {
        "frame": 10,
        "left_elbow": 155, "right_elbow": 150,
        "left_knee": 140, "right_knee": 135,
        "head_alignment": -0.5,
        "description": "Mid follow-through - bat over shoulder"
    },
]

# ─── STRAIGHT DRIVE ──────────────────────────────────────────────────────
IDEAL_STRAIGHT_DRIVE = [
    {
        "frame": 0,
        "left_elbow": 148, "right_elbow": 162,
        "left_knee": 150, "right_knee": 140,
        "head_alignment": 2.0,
        "description": "Setup - balanced stance, head over ball"
    },
    {
        "frame": 1,
        "left_elbow": 140, "right_elbow": 155,
        "left_knee": 152, "right_knee": 138,
        "head_alignment": 1.8,
        "description": "Backswing - bat comes straight back"
    },
    {
        "frame": 2,
        "left_elbow": 132, "right_elbow": 148,
        "left_knee": 155, "right_knee": 130,
        "head_alignment": 1.5,
        "description": "Loading - weight shifts to back foot"
    },
    {
        "frame": 3,
        "left_elbow": 128, "right_elbow": 142,
        "left_knee": 160, "right_knee": 125,
        "head_alignment": 1.2,
        "description": "Maximum coil - shoulders turned"
    },
    {
        "frame": 4,
        "left_elbow": 135, "right_elbow": 148,
        "left_knee": 150, "right_knee": 130,
        "head_alignment": 1.0,
        "description": "Downswing - front foot strides forward"
    },
    {
        "frame": 5,
        "left_elbow": 150, "right_elbow": 158,
        "left_knee": 138, "right_knee": 140,
        "head_alignment": 0.5,
        "description": "Pre-contact - bat swings straight through"
    },
    {
        "frame": 6,
        "left_elbow": 170, "right_elbow": 168,
        "left_knee": 128, "right_knee": 145,
        "head_alignment": 0.2,
        "description": "Contact - full arm extension, bat vertical"
    },
    {
        "frame": 7,
        "left_elbow": 172, "right_elbow": 170,
        "left_knee": 125, "right_knee": 142,
        "head_alignment": 0.0,
        "description": "Follow-through - bat goes straight past ear"
    },
    {
        "frame": 8,
        "left_elbow": 160, "right_elbow": 155,
        "left_knee": 135, "right_knee": 140,
        "head_alignment": -0.3,
        "description": "Completion - high bat finish"
    },
]

# ─── PULL SHOT ────────────────────────────────────────────────────────────
IDEAL_PULL_SHOT = [
    {
        "frame": 0,
        "left_elbow": 150, "right_elbow": 160,
        "left_knee": 145, "right_knee": 140,
        "head_alignment": 2.0,
        "description": "Setup - slightly open stance"
    },
    {
        "frame": 1,
        "left_elbow": 135, "right_elbow": 145,
        "left_knee": 150, "right_knee": 135,
        "head_alignment": 2.5,
        "description": "Back and across - weight on back foot"
    },
    {
        "frame": 2,
        "left_elbow": 120, "right_elbow": 130,
        "left_knee": 155, "right_knee": 120,
        "head_alignment": 3.0,
        "description": "Backswing high - bat above shoulder"
    },
    {
        "frame": 3,
        "left_elbow": 110, "right_elbow": 120,
        "left_knee": 158, "right_knee": 115,
        "head_alignment": 2.8,
        "description": "Maximum load - deep crouch"
    },
    {
        "frame": 4,
        "left_elbow": 125, "right_elbow": 135,
        "left_knee": 145, "right_knee": 125,
        "head_alignment": 2.0,
        "description": "Downswing - rolling wrists"
    },
    {
        "frame": 5,
        "left_elbow": 145, "right_elbow": 150,
        "left_knee": 130, "right_knee": 135,
        "head_alignment": 1.5,
        "description": "Contact - horizontal bat, in front of body"
    },
    {
        "frame": 6,
        "left_elbow": 160, "right_elbow": 155,
        "left_knee": 135, "right_knee": 140,
        "head_alignment": 1.0,
        "description": "Follow-through - bat wraps around body"
    },
    {
        "frame": 7,
        "left_elbow": 150, "right_elbow": 140,
        "left_knee": 140, "right_knee": 138,
        "head_alignment": 0.5,
        "description": "Completion - weight transfers forward"
    },
]

# ─── DEFENSIVE BLOCK ─────────────────────────────────────────────────────
IDEAL_DEFENSIVE_BLOCK = [
    {
        "frame": 0,
        "left_elbow": 148, "right_elbow": 165,
        "left_knee": 148, "right_knee": 140,
        "head_alignment": 1.5,
        "description": "Setup - compact stance"
    },
    {
        "frame": 1,
        "left_elbow": 145, "right_elbow": 160,
        "left_knee": 150, "right_knee": 138,
        "head_alignment": 1.2,
        "description": "Small backswing - minimal movement"
    },
    {
        "frame": 2,
        "left_elbow": 140, "right_elbow": 155,
        "left_knee": 145, "right_knee": 132,
        "head_alignment": 1.0,
        "description": "Front foot forward - getting to the pitch"
    },
    {
        "frame": 3,
        "left_elbow": 155, "right_elbow": 165,
        "left_knee": 130, "right_knee": 140,
        "head_alignment": 0.5,
        "description": "Bat presented - soft hands, angled down"
    },
    {
        "frame": 4,
        "left_elbow": 160, "right_elbow": 168,
        "left_knee": 125, "right_knee": 142,
        "head_alignment": 0.3,
        "description": "Contact - bat close to pad, dead bat"
    },
    {
        "frame": 5,
        "left_elbow": 155, "right_elbow": 162,
        "left_knee": 130, "right_knee": 140,
        "head_alignment": 0.5,
        "description": "Follow-through - controlled, minimal"
    },
]

# ─── FLICK SHOT (LEG GLANCE) ─────────────────────────────────────────────
IDEAL_FLICK_SHOT = [
    {
        "frame": 0,
        "left_elbow": 150, "right_elbow": 162,
        "left_knee": 148, "right_knee": 138,
        "head_alignment": 2.0,
        "description": "Setup - slightly closed stance"
    },
    {
        "frame": 1,
        "left_elbow": 142, "right_elbow": 155,
        "left_knee": 152, "right_knee": 135,
        "head_alignment": 1.5,
        "description": "Backswing - compact movement"
    },
    {
        "frame": 2,
        "left_elbow": 135, "right_elbow": 148,
        "left_knee": 155, "right_knee": 128,
        "head_alignment": 1.2,
        "description": "Stride - front foot moves to line of ball"
    },
    {
        "frame": 3,
        "left_elbow": 140, "right_elbow": 152,
        "left_knee": 140, "right_knee": 135,
        "head_alignment": 0.8,
        "description": "Pre-contact - wrists cocked"
    },
    {
        "frame": 4,
        "left_elbow": 155, "right_elbow": 160,
        "left_knee": 128, "right_knee": 140,
        "head_alignment": 0.3,
        "description": "Contact - wrist flick, bat angled to leg side"
    },
    {
        "frame": 5,
        "left_elbow": 165, "right_elbow": 158,
        "left_knee": 132, "right_knee": 142,
        "head_alignment": 0.0,
        "description": "Follow-through - wrists roll over"
    },
    {
        "frame": 6,
        "left_elbow": 155, "right_elbow": 148,
        "left_knee": 138, "right_knee": 140,
        "head_alignment": -0.2,
        "description": "Completion - balanced finish"
    },
]

# ─── SHOT REGISTRY ───────────────────────────────────────────────────────
SHOT_MODELS = {
    "cover_drive": {
        "name": "Cover Drive",
        "emoji": "🏏",
        "description": "Classic off-side drive through the covers",
        "difficulty": "Intermediate",
        "sequence": IDEAL_COVER_DRIVE,
    },
    "straight_drive": {
        "name": "Straight Drive",
        "emoji": "⬆️",
        "description": "Drive hit straight back past the bowler",
        "difficulty": "Advanced",
        "sequence": IDEAL_STRAIGHT_DRIVE,
    },
    "pull_shot": {
        "name": "Pull Shot",
        "emoji": "💪",
        "description": "Horizontal bat shot to short-pitched delivery",
        "difficulty": "Intermediate",
        "sequence": IDEAL_PULL_SHOT,
    },
    "defensive_block": {
        "name": "Defensive Block",
        "emoji": "🛡️",
        "description": "Solid forward defense with soft hands",
        "difficulty": "Beginner",
        "sequence": IDEAL_DEFENSIVE_BLOCK,
    },
    "flick_shot": {
        "name": "Flick Shot",
        "emoji": "🖐️",
        "description": "Wristy flick off the pads to leg side",
        "difficulty": "Advanced",
        "sequence": IDEAL_FLICK_SHOT,
    },
    "bowling_action": {
        "name": "Bowling Action Check",
        "emoji": "🥎",
        "description": "ICC Rule 11.1 - 15° elbow extension limit (chucking detector)",
        "difficulty": "Elite",
        "sequence": [],  # Bowling is evaluated dynamically via biomechanics rules
    },
}


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
    "spine_tilt": {
        "ideal": 12,
        "min_acceptable": 5,
        "max_acceptable": 25,
        "feedback_low": "Lean forward slightly more into the shot for better balance",
        "feedback_high": "Keep your body more upright; you are leaning too far or falling over",
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


def get_shot_list():
    """Get list of available shots with metadata."""
    return {
        key: {
            "name": model["name"],
            "emoji": model["emoji"],
            "description": model["description"],
            "difficulty": model["difficulty"],
        }
        for key, model in SHOT_MODELS.items()
    }


def get_ideal_angle_sequence(shot_type="cover_drive"):
    """
    Get the ideal angle sequence for a specific shot type.
    
    Args:
        shot_type: Key from SHOT_MODELS (default: cover_drive)
    
    Returns:
        List: List of angle measurements at each frame
    """
    model = SHOT_MODELS.get(shot_type, SHOT_MODELS["cover_drive"])
    return model["sequence"]


def get_shot_name(shot_type="cover_drive"):
    """Get the display name for a shot type."""
    model = SHOT_MODELS.get(shot_type, SHOT_MODELS["cover_drive"])
    return model["name"]


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
    if user_value is None:
        return ""

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
