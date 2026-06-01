"""
Shot evaluation engine using DTW and biomechanical feedback.

This module orchestrates the comparison of user's shot against ideal models,
generating scores and contextual feedback.
"""

import numpy as np
from angle_utils import extract_shot_angles, calculate_distance
from geo import (
    get_ideal_angle_sequence,
    get_shot_name,
    get_angle_threshold,
    get_feedback_for_angle,
    get_position_feedback,
)


def evaluate_frame(landmarks, frame_index=0):
    """
    Evaluate a single frame of pose data.
    """
    angles = extract_shot_angles(landmarks)
    return angles


def generate_feedback_list(angles):
    """
    Generate list of feedback strings based on angle deviations.
    """
    feedback_list = []
    for angle_name, angle_value in angles.items():
        if angle_name == "head_alignment":
            continue
        fb = get_feedback_for_angle(angle_name, angle_value)
        if fb:
            feedback_list.append(fb)
    return feedback_list


def calculate_motion_score(angle_sequence):
    """
    Calculate how much actual motion occurred during the recording.
    
    A real cricket shot involves significant joint angle changes as the 
    player moves through backswing → downswing → contact → follow-through.
    Sitting still or making random movements will show very low motion variance.
    
    Returns:
        float: Motion score from 0-100
        list: Motion-related feedback
    """
    if len(angle_sequence) < 3:
        return 0, ["Too few frames — record a full shot"]

    angle_keys = ["left_elbow", "right_elbow", "left_knee", "right_knee"]
    feedback = []
    
    # 1) Range of motion: how much did each angle change?
    ranges = {}
    for key in angle_keys:
        values = [f.get(key, 0) for f in angle_sequence]
        if not values:
            ranges[key] = 0
            continue
        ranges[key] = max(values) - min(values)
    
    avg_range = np.mean(list(ranges.values()))
    
    # A real cover drive moves elbows ~40° and knees ~20° through the sequence
    # Sitting still typically has < 5° range
    if avg_range < 5:
        return 5, ["Almost no movement detected — stand up and swing!"]
    elif avg_range < 10:
        return 15, ["Very little body movement — try a full batting motion"]
    elif avg_range < 15:
        return 40, ["Limited range of motion — extend your backswing and follow-through"]

    # 2) Check for phase progression: angles should change over time, not stay flat
    phase_changes = 0
    for key in angle_keys:
        values = [f.get(key, 0) for f in angle_sequence]
        # Count significant direction changes (indicates backswing → forward swing)
        for i in range(2, len(values)):
            diff_prev = values[i-1] - values[i-2]
            diff_curr = values[i] - values[i-1]
            if diff_prev * diff_curr < 0 and abs(diff_curr) > 3:
                phase_changes += 1
    
    # A real shot should have at least some direction changes
    if phase_changes < 2:
        feedback.append("Shot lacks distinct phases — needs backswing and follow-through")
        return 50, feedback

    # 3) Smoothness: real shots are fluid, not jerky random movements
    jerkiness_scores = []
    for key in angle_keys:
        values = [f.get(key, 0) for f in angle_sequence]
        if len(values) > 2:
            diffs = np.diff(values)
            jerkiness = np.std(diffs)  # High std = jerky/random
            jerkiness_scores.append(jerkiness)
    
    avg_jerkiness = np.mean(jerkiness_scores) if jerkiness_scores else 0
    
    # Penalize very jerky movements (random flailing)
    if avg_jerkiness > 15:
        feedback.append("Movement is too erratic — focus on a smooth swing")
        return 55, feedback
    
    # Good motion detected
    motion_score = min(100, 50 + avg_range * 1.5 + phase_changes * 3)
    return motion_score, feedback


def check_standing_pose(angle_sequence):
    """
    Check if the person appears to be in a standing batting stance.
    
    MediaPipe knee angles for a standing person are typically 160-180°.
    Sitting down gives angles around 80-110°.
    
    Returns:
        bool: True if likely standing
        str: Feedback message
    """
    if not angle_sequence:
        return False, "No data"
    
    # Check the first few frames for stance
    sample = angle_sequence[:min(5, len(angle_sequence))]
    avg_left_knee = np.mean([f.get("left_knee", 0) for f in sample])
    avg_right_knee = np.mean([f.get("right_knee", 0) for f in sample])
    
    # Sitting: knees bent at ~90°. Standing: knees at ~160-175°
    if avg_left_knee < 120 and avg_right_knee < 120:
        return False, "You appear to be sitting — stand up for accurate analysis"
    
    return True, ""


def calculate_shot_score(angles, ideal_angles=None, shot_type="cover_drive"):
    """
    Calculate a score based on how close angles are to ideal.
    """
    if ideal_angles is None:
        ideal_seq = get_ideal_angle_sequence(shot_type)
        ideal_angles = ideal_seq[0]
    
    angle_keys = ["left_elbow", "right_elbow", "left_knee", "right_knee"]
    deviations = []
    
    for key in angle_keys:
        user_val = angles.get(key, 0)
        ideal_val = ideal_angles.get(key, 0)
        deviation = abs(user_val - ideal_val)
        deviations.append(deviation)
    
    avg_deviation = np.mean(deviations)
    score = max(0, 100 - (avg_deviation / 30 * 100))
    
    return float(score)


def get_adaptive_threshold(age_group="adult", metric="bowler_knee"):
    """
    Adaptive thresholding based on age-group and skeletal maturity.
    """
    thresholds = {
        "adult": {"bowler_knee": 155.0, "batter_knee": 150.0},
        "u18": {"bowler_knee": 152.0, "batter_knee": 145.0},
        "u15": {"bowler_knee": 150.0, "batter_knee": 140.0},
        "u10": {"bowler_knee": 148.0, "batter_knee": 135.0},
    }
    return thresholds.get(age_group, thresholds["adult"]).get(metric, 155.0)


def evaluate_batting_biomechanics(angle_sequence, is_right_handed=True, age_group="adult"):
    """
    Evaluate batting-specific injury risks and biomechanical inefficiencies.
    """
    feedback = []
    if not angle_sequence:
        return feedback

    front_knee_key = "left_knee" if is_right_handed else "right_knee"
    front_knees = [f.get(front_knee_key, 0) for f in angle_sequence if f.get(front_knee_key, 0) > 0]
    
    # 1. Batter Knee Flex (>= 150 at impact)
    if front_knees:
        min_front_knee = min(front_knees)
        knee_threshold = get_adaptive_threshold(age_group, "batter_knee")
        if min_front_knee < knee_threshold:
            feedback.append(f"⚠️ Knee Flex Warning: Front knee collapsed below {knee_threshold}° (measured {min_front_knee:.1f}°). A collapsed knee destroys shot control and balance.")

    # 2. Head Alignment
    head_alignments = [f.get("head_alignment", 0) for f in angle_sequence]
    if head_alignments:
        max_tilt = max(abs(h) for h in head_alignments)
        if max_tilt > 3.0:
            feedback.append(f"⚠️ Head Alignment: Severe head tilt detected. This alters binocular visual depth tracking and can cause premature bat closing.")

    return feedback


def evaluate_bowling_action(angle_sequence, age_group="adult"):
    """
    Evaluate a bowling action sequence for compliance with ICC Rule 11.1.
    
    1. Identify the bowling arm (left vs. right elbow with largest motion/variance).
    2. Filter frames where the wrist is above shoulder level (wrist_y < shoulder_y).
       In MediaPipe, y decreases upwards, so wrist_y < shoulder_y means hand is raised.
    3. Calculate maximum elbow extension (straightening) during this delivery phase:
       Elbow extension = max_elbow_angle - min_elbow_angle
    4. If the extension exceeds 15 degrees, it's illegal (chucking).
    """
    if len(angle_sequence) < 3:
        return {
            "score": 10,
            "feedback": "Too few frames captured — please record a full bowling action.",
            "is_good_shot": False,
            "shot_type": "bowling_action",
            "shot_name": "Bowling Action Check",
            "angle_scores": {}
        }
        
    # Step 1: Detect the bowling arm
    left_elbows = [f.get("left_elbow", 0) for f in angle_sequence if f.get("left_elbow", 0) > 0]
    right_elbows = [f.get("right_elbow", 0) for f in angle_sequence if f.get("right_elbow", 0) > 0]
    
    if not left_elbows and not right_elbows:
        return {
            "score": 10,
            "feedback": "No arm joints detected. Ensure your full body is visible in the camera.",
            "is_good_shot": False,
            "shot_type": "bowling_action",
            "shot_name": "Bowling Action Check",
            "angle_scores": {}
        }
        
    left_var = np.var(left_elbows) if len(left_elbows) > 1 else 0
    right_var = np.var(right_elbows) if len(right_elbows) > 1 else 0
    
    is_right_handed = right_var >= left_var
    arm_key = "right_elbow" if is_right_handed else "left_elbow"
    arm_name = "Right-Arm" if is_right_handed else "Left-Arm"
    
    # Step 2: Extract delivery phase frames (wrist Y < shoulder Y)
    delivery_frames = []
    wrist_y_key = "right_wrist_y" if is_right_handed else "left_wrist_y"
    shoulder_y_key = "right_shoulder_y" if is_right_handed else "left_shoulder_y"
    
    for f in angle_sequence:
        wrist_y = f.get(wrist_y_key, 1.0)
        shoulder_y = f.get(shoulder_y_key, 0.5)
        # In MediaPipe y coordinate, 0 is at top, so wrist_y < shoulder_y means wrist is higher
        if wrist_y < shoulder_y:
            elbow_val = f.get(arm_key, 0)
            if elbow_val > 0:
                delivery_frames.append(elbow_val)
                
    # Fallback: if we didn't detect the hand above shoulder, use all frames
    if not delivery_frames:
        delivery_frames = [f.get(arm_key, 0) for f in angle_sequence if f.get(arm_key, 0) > 0]
        
    if len(delivery_frames) < 2:
        return {
            "score": 20,
            "feedback": f"Could not isolate delivery swing for {arm_name} bowler. Start with hands low and swing fully above your shoulder.",
            "is_good_shot": False,
            "shot_type": "bowling_action",
            "shot_name": "Bowling Action Check",
            "angle_scores": {}
        }
        
    # Step 3: Measure elbow extension
    import scipy.signal as signal
    
    # Apply median filter to remove tracking jitter
    if len(delivery_frames) >= 5:
        smoothed = signal.medfilt(delivery_frames, kernel_size=5)
    else:
        smoothed = delivery_frames
        
    min_elbow = min(smoothed)
    max_elbow = max(smoothed)
    
    # Calculate extension. We apply a 20° leniency offset because 2D webcam 
    # projection heavily distorts (foreshortens) the arm, making straight arms look bent.
    raw_extension = max_elbow - min_elbow
    elbow_extension = max(0.0, raw_extension - 20.0)
    elbow_extension = min(180.0, elbow_extension)
    
    spine_tilts = [f.get("spine_tilt", 0) for f in angle_sequence if f.get("spine_tilt", 0) > 0]
    avg_spine_tilt = np.mean(spine_tilts) if spine_tilts else 0.0
    
    front_knee_key = "left_knee" if is_right_handed else "right_knee"
    front_knees = [f.get(front_knee_key, 0) for f in angle_sequence if f.get(front_knee_key, 0) > 0]
    avg_front_knee = np.mean(front_knees[-5:]) if len(front_knees) >= 5 else 180.0
    
    # Step 4: Compare against ICC Rule 11.1 15-degree threshold
    is_legal = elbow_extension <= 15.0
    
    if is_legal:
        score = int(round(100 - (elbow_extension * 1.5)))
        score = max(80, min(100, score))
        verdict = f"✅ LEGAL ACTION ({arm_name})"
        feedback = (
            f"{verdict} | Excellent! Your bowling elbow extension was {elbow_extension:.1f}°, "
            f"well within the official ICC Rule 11.1 15° limit (went from {min_elbow:.1f}° to {max_elbow:.1f}°). "
            f"Smooth release with perfect straight-arm discipline."
        )
    else:
        score = int(round(100 - (elbow_extension - 15.0) * 4.0))
        score = max(10, min(55, score))
        verdict = f"⚠️ ILLEGAL ACTION (Chucking / Throwing)"
        feedback = (
            f"{verdict} | Under ICC Rule 11.1, elbow extension must be under 15°. "
            f"Your action showed an extension of {elbow_extension:.1f}° (from {min_elbow:.1f}° to {max_elbow:.1f}°), "
            f"which is an illegal throw. Keep your arm locked and rotate from the shoulder."
        )
        
    coaching_tips = []
    
    # 1. Lumbar Spine Strain Detection
    if avg_spine_tilt > 25:
        coaching_tips.append("⚠️ Lumbar Spine Strain Risk: Significant lateral tilt (>25°) detected. This indicates mixed delivery action leading to high torsional lumbar stress.")
        
    # 2. Knee Valgus Instability
    knee_threshold = get_adaptive_threshold(age_group, "bowler_knee")
    if avg_front_knee < knee_threshold:
        coaching_tips.append(f"⚠️ Knee Valgus Instability: Front knee collapsed below {knee_threshold}° (measured {avg_front_knee:.1f}°). This transfers force directly to the lumbar spine, inducing stress fractures.")
    elif avg_front_knee >= 165:
        coaching_tips.append("✅ Braced-leg landing is excellent, providing maximum release height and safety.")

    # 3. Shoulder Impingement Hazard (Round-arm)
    nose_ys = [f.get("nose_y", 0) for f in angle_sequence if f.get("nose_y", 0) > 0]
    avg_nose_y = np.mean(nose_ys) if nose_ys else 0.0
    # MediaPipe: Y goes down. So wrist_y < nose_y means wrist is ABOVE head.
    min_wrist_y = min([f.get(wrist_y_key, 1.0) for f in angle_sequence]) if angle_sequence else 1.0
    if avg_nose_y > 0 and min_wrist_y > avg_nose_y:
        coaching_tips.append("⚠️ Shoulder Impingement Hazard: Release height fell below head height (round-arm action). This places high shear stress on the rotator cuff.")
        
    if coaching_tips:
        feedback += " Coaching tips: " + " ".join(coaching_tips[:2])
        
    angle_scores = {
        "bowling_arm_extension": float(elbow_extension),
        "min_elbow_angle": float(min_elbow),
        "max_elbow_angle": float(max_elbow),
        "spine_tilt": float(avg_spine_tilt)
    }
    
    return {
        "score": score,
        "feedback": feedback,
        "is_good_shot": is_legal,
        "shot_type": "bowling_action",
        "shot_name": "Bowling Action Check",
        "angle_scores": angle_scores
    }


def calculate_sequence_score(angle_sequence, shot_type="cover_drive"):
    """
    Calculate score for an entire shot sequence.
    
    Now includes motion validation: static poses and random movements
    are penalized heavily.
    """
    if not angle_sequence:
        return {
            "score": 0,
            "feedback": "No data captured",
            "matches": 0,
        }
        
    if shot_type == "bowling_action":
        return evaluate_bowling_action(angle_sequence)
    
    shot_name = get_shot_name(shot_type)
    ideal_seq = get_ideal_angle_sequence(shot_type)
    angle_keys = ["left_elbow", "right_elbow", "left_knee", "right_knee"]
    
    # ── VALIDATION CHECKS ─────────────────────────────────────────
    
    # 1) Check if person is standing
    is_standing, stance_feedback = check_standing_pose(angle_sequence)
    
    # 2) Check for actual motion
    motion_score, motion_feedback = calculate_motion_score(angle_sequence)
    
    # If no real motion detected, cap the score low
    if motion_score < 30:
        feedback_parts = [f"❌ Not a valid {shot_name}"]
        if stance_feedback:
            feedback_parts.append(stance_feedback)
        feedback_parts.extend(motion_feedback)
        return {
            "score": max(5, int(motion_score * 0.3)),
            "shot_type": shot_type,
            "shot_name": shot_name,
            "feedback": " | ".join(feedback_parts[:3]),
            "angle_scores": {},
            "is_good_shot": False,
        }
    
    # ── DTW COMPARISON ────────────────────────────────────────────
    
    # Extract individual angle sequences
    user_sequences = {}
    ideal_sequences = {}
    
    for key in angle_keys:
        user_sequences[key] = [f.get(key, 0) for f in angle_sequence]
        ideal_sequences[key] = [f.get(key, 0) for f in ideal_seq]
    
    # Pad sequences to same length
    max_length = max(len(angle_sequence), len(ideal_seq))
    for key in angle_keys:
        if len(user_sequences[key]) < max_length:
            user_sequences[key].extend([user_sequences[key][-1]] * (max_length - len(user_sequences[key])))
        if len(ideal_sequences[key]) < max_length:
            ideal_sequences[key].extend([ideal_sequences[key][-1]] * (max_length - len(ideal_sequences[key])))
    
    # Calculate DTW-based scores
    angle_scores = {}
    total_score = 0
    
    try:
        from fastdtw import fastdtw
        from scipy.spatial.distance import euclidean
        
        for key in angle_keys:
            user_arr = np.array(user_sequences[key], dtype=np.float32).reshape(-1, 1)
            ideal_arr = np.array(ideal_sequences[key], dtype=np.float32).reshape(-1, 1)
            
            distance, _ = fastdtw(user_arr, ideal_arr, dist=euclidean)
            angle_scores[key] = max(0, 100 - min(100, distance))
            total_score += angle_scores[key]
        
        raw_score = total_score / len(angle_keys)
    except ImportError:
        # Fallback: simple deviation
        for key in angle_keys:
            deviations = [abs(u - i) for u, i in zip(user_sequences[key], ideal_sequences[key])]
            avg_dev = np.mean(deviations)
            angle_scores[key] = max(0, 100 - (avg_dev / 30 * 100))
            total_score += angle_scores[key]
        
        raw_score = total_score / len(angle_keys)
    
    # ── BLEND RAW SCORE WITH MOTION QUALITY ──────────────────────
    # Final score = 60% angle accuracy + 25% motion quality + 15% stance
    stance_score = 100 if is_standing else 30
    motion_weight = min(100, motion_score)
    
    final_score = (raw_score * 0.60) + (motion_weight * 0.25) + (stance_score * 0.15)
    
    # Apply penalty if motion is poor (< 50)
    if motion_score < 50:
        final_score = final_score * 0.6
    
    final_score = max(0, min(100, final_score))
    
    # ── GENERATE FEEDBACK ────────────────────────────────────────
    feedback_list = []
    
    # Determine handedness for batting biomechanics (heuristic)
    left_elbows = [f.get("left_elbow", 0) for f in angle_sequence]
    right_elbows = [f.get("right_elbow", 0) for f in angle_sequence]
    is_right_handed = np.var(right_elbows) >= np.var(left_elbows)
    
    batting_feedback = evaluate_batting_biomechanics(angle_sequence, is_right_handed)
    if batting_feedback:
        feedback_list.extend(batting_feedback)
    
    if final_score >= 80:
        feedback_list.append(f"Excellent {shot_name}! 🔥")
    elif final_score >= 60:
        feedback_list.append(f"Good {shot_name}, keep practicing!")
    elif final_score >= 40:
        feedback_list.append(f"Fair {shot_name}, needs improvement")
    else:
        feedback_list.append(f"Keep working on your {shot_name}")
    
    # Add stance warning
    if not is_standing and stance_feedback:
        feedback_list.append(stance_feedback)
    
    # Add motion feedback
    feedback_list.extend(motion_feedback)
    
    # Add angle-specific feedback
    if angle_sequence:
        final_angles = angle_sequence[-1]
        for key in angle_keys:
            fb = get_feedback_for_angle(key, final_angles.get(key, 0))
            if fb:
                feedback_list.append(fb)
    
    pos_feedback = get_position_feedback(len(angle_sequence))
    if pos_feedback:
        feedback_list.append(pos_feedback)
    
    return {
        "score": int(round(final_score)),
        "shot_type": shot_type,
        "shot_name": shot_name,
        "feedback": " | ".join(feedback_list[:3]),
        "angle_scores": angle_scores,
        "is_good_shot": final_score >= 70,
    }


def evaluate_shot(current_angles, accumulated_sequence=None, shot_type="cover_drive"):
    """
    Main entry point for shot evaluation.
    """
    if accumulated_sequence:
        return calculate_sequence_score(accumulated_sequence, shot_type)
    else:
        score = calculate_shot_score(current_angles, shot_type=shot_type)
        feedback_list = generate_feedback_list(current_angles)
        feedback = " | ".join(feedback_list) if feedback_list else "Frame captured"
        
        return {
            "score": int(round(score)),
            "feedback": feedback,
            "angles": current_angles,
        }
