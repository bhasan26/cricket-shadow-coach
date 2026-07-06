"""
Shot evaluation engine using DTW and biomechanical feedback.

This module orchestrates the comparison of user's shot against ideal models,
generating scores and contextual feedback.

Scoring pipeline (batting):
  1. Smooth each angle channel (MediaPipe jitter is a few degrees).
  2. Validate motion / stance so static or random clips score low.
  3. Resample user + ideal channels to a fixed length so recording duration and
     frame rate don't skew the comparison, then score with length-normalized DTW.
"""

import numpy as np

from angle_utils import (
    extract_shot_angles,
    calculate_distance,
    channel_values,
    smooth_sequence,
    resample_channel,
)
from dtw_utils import calculate_dtw_distance
from geo import (
    get_ideal_angle_sequence,
    get_shot_name,
    get_angle_threshold,
    get_feedback_for_angle,
    get_position_feedback,
)

# Angle channels compared against ideal models.
DTW_KEYS = ["left_elbow", "right_elbow", "left_knee", "right_knee"]
# Channels that get smoothed across the sequence.
SMOOTH_KEYS = DTW_KEYS + ["spine_tilt"]
# Number of points every channel is resampled to before DTW.
RESAMPLE_LEN = 50

BOWLING_DISCLAIMER = (
    "Indicative screen only — a single 2D camera cannot match lab-grade 3D motion "
    "capture. Elbow extension is measured in the image plane, so perspective can "
    "add or remove tens of degrees. Use this as practice guidance, not an official "
    "legality verdict."
)


def evaluate_frame(landmarks, frame_index=0):
    """Evaluate a single frame of pose data."""
    return extract_shot_angles(landmarks)


def smooth_angle_sequence(angle_sequence):
    """Return a copy of the sequence with each angle channel moving-averaged."""
    channels = {
        k: smooth_sequence([f.get(k) for f in angle_sequence], window=5)
        for k in SMOOTH_KEYS
    }
    out = []
    for i, f in enumerate(angle_sequence):
        g = dict(f)
        for k in SMOOTH_KEYS:
            g[k] = channels[k][i]
        out.append(g)
    return out


def tracking_quality(angle_sequence):
    """Percentage of frames in which all key joint angles were confidently tracked."""
    if not angle_sequence:
        return 0.0
    full = sum(
        1 for f in angle_sequence if all(f.get(k) is not None for k in DTW_KEYS)
    )
    return round(100.0 * full / len(angle_sequence), 1)


def mirror_ideal(ideal_seq):
    """Swap left/right angle keys so a right-handed ideal fits a left-handed player."""
    swapped = []
    for f in ideal_seq:
        g = dict(f)
        g["left_elbow"], g["right_elbow"] = f.get("right_elbow"), f.get("left_elbow")
        g["left_knee"], g["right_knee"] = f.get("right_knee"), f.get("left_knee")
        swapped.append(g)
    return swapped


def generate_feedback_list(angles):
    """Generate list of feedback strings based on angle deviations."""
    feedback_list = []
    for angle_name, angle_value in angles.items():
        if angle_name == "head_alignment" or angle_value is None:
            continue
        fb = get_feedback_for_angle(angle_name, angle_value)
        if fb:
            feedback_list.append(fb)
    return feedback_list


def calculate_motion_score(angle_sequence):
    """
    Calculate how much actual motion occurred during the recording.

    A real cricket shot involves significant joint angle changes; sitting still
    or random movements show very low motion. Returns (score 0-100, feedback).
    """
    if len(angle_sequence) < 3:
        return 0, ["Too few frames — record a full shot"]

    # Range of motion and smoothness per channel (ignoring untracked frames).
    # Both are frame-count invariant, so scores are comparable across recording
    # durations and frame rates (a 40-frame and a 200-frame clip of the same
    # swing land in the same place).
    ranges = []
    jerk = []
    for key in DTW_KEYS:
        values = channel_values(angle_sequence, key)
        if len(values) >= 2:
            ranges.append(max(values) - min(values))
        if len(values) > 2:
            jerk.append(float(np.std(np.diff(values))))
    avg_range = float(np.mean(ranges)) if ranges else 0.0
    avg_jerk = float(np.mean(jerk)) if jerk else 0.0

    if avg_range < 5:
        return 5, ["Almost no movement detected — stand up and swing!"]
    if avg_range < 10:
        return 15, ["Very little body movement — try a full batting motion"]
    if avg_range < 15:
        return 40, ["Limited range of motion — extend your backswing and follow-through"]

    # Erratic, high-jerk movement (random flailing) is not a real shot.
    if avg_jerk > 6:
        return 25, ["Movement is too erratic — focus on a smooth swing"]

    motion_score = min(100.0, 55 + avg_range * 1.6)
    return motion_score, []


def check_standing_pose(angle_sequence):
    """Heuristic: are the early frames a standing batting stance (knees ~160-175°)?"""
    if not angle_sequence:
        return False, "No data"

    sample = angle_sequence[: min(5, len(angle_sequence))]
    left = channel_values(sample, "left_knee")
    right = channel_values(sample, "right_knee")
    avg_left_knee = float(np.mean(left)) if left else 180.0
    avg_right_knee = float(np.mean(right)) if right else 180.0

    if avg_left_knee < 120 and avg_right_knee < 120:
        return False, "You appear to be sitting — stand up for accurate analysis"

    return True, ""


def calculate_shot_score(angles, ideal_angles=None, shot_type="cover_drive"):
    """Score a single frame against the ideal setup frame."""
    if ideal_angles is None:
        ideal_angles = get_ideal_angle_sequence(shot_type)[0]

    deviations = []
    for key in DTW_KEYS:
        user_val = angles.get(key)
        if user_val is None:
            continue
        deviations.append(abs(user_val - ideal_angles.get(key, 0)))

    if not deviations:
        return 0.0
    avg_deviation = float(np.mean(deviations))
    return float(max(0, 100 - (avg_deviation / 30 * 100)))


def get_adaptive_threshold(age_group="adult", metric="bowler_knee"):
    """Adaptive thresholding based on age-group and skeletal maturity."""
    thresholds = {
        "adult": {"bowler_knee": 155.0, "batter_knee": 150.0},
        "u18": {"bowler_knee": 152.0, "batter_knee": 145.0},
        "u15": {"bowler_knee": 150.0, "batter_knee": 140.0},
        "u10": {"bowler_knee": 148.0, "batter_knee": 135.0},
    }
    return thresholds.get(age_group, thresholds["adult"]).get(metric, 155.0)


def evaluate_batting_biomechanics(angle_sequence, is_right_handed=True, age_group="adult"):
    """Evaluate batting-specific injury risks and biomechanical inefficiencies."""
    feedback = []
    if not angle_sequence:
        return feedback

    front_knee_key = "left_knee" if is_right_handed else "right_knee"
    front_knees = channel_values(angle_sequence, front_knee_key)

    if front_knees:
        min_front_knee = min(front_knees)
        knee_threshold = get_adaptive_threshold(age_group, "batter_knee")
        if min_front_knee < knee_threshold:
            feedback.append(
                f"⚠️ Knee Flex Warning: Front knee collapsed below {knee_threshold}° "
                f"(measured {min_front_knee:.1f}°). A collapsed knee destroys shot control and balance."
            )

    head_alignments = [f.get("head_alignment", 0) for f in angle_sequence]
    if head_alignments:
        max_tilt = max(abs(h) for h in head_alignments)
        if max_tilt > 3.0:
            feedback.append(
                "⚠️ Head Alignment: Severe head tilt detected. This alters binocular "
                "visual depth tracking and can cause premature bat closing."
            )

    return feedback


def evaluate_bowling_action(angle_sequence, is_right_handed=None, age_group="adult"):
    """
    Evaluate a bowling action sequence against ICC Rule 11.1 (15° elbow extension).

    NOTE: this is an indicative screen from a single 2D camera, not a lab verdict —
    see BOWLING_DISCLAIMER, surfaced in the response.
    """
    base = {
        "shot_type": "bowling_action",
        "shot_name": "Bowling Action Check",
        "angle_scores": {},
        "disclaimer": BOWLING_DISCLAIMER,
        "tracking_quality": tracking_quality(angle_sequence),
    }

    if len(angle_sequence) < 3:
        return {**base, "score": 10, "is_good_shot": False,
                "feedback": "Too few frames captured — please record a full bowling action."}

    left_elbows = channel_values(angle_sequence, "left_elbow")
    right_elbows = channel_values(angle_sequence, "right_elbow")

    if not left_elbows and not right_elbows:
        return {**base, "score": 10, "is_good_shot": False,
                "feedback": "No arm joints detected. Ensure your full body is visible in the camera."}

    # Detect the bowling arm as the one with the larger elbow-angle variance,
    # unless the caller told us the handedness explicitly.
    left_var = np.var(left_elbows) if len(left_elbows) > 1 else 0
    right_var = np.var(right_elbows) if len(right_elbows) > 1 else 0
    if is_right_handed is None:
        is_right_handed = right_var >= left_var

    arm_key = "right_elbow" if is_right_handed else "left_elbow"
    arm_name = "Right-Arm" if is_right_handed else "Left-Arm"

    # Extract delivery-phase frames (wrist above shoulder: wrist_y < shoulder_y).
    delivery_frames = []
    wrist_y_key = "right_wrist_y" if is_right_handed else "left_wrist_y"
    shoulder_y_key = "right_shoulder_y" if is_right_handed else "left_shoulder_y"

    for f in angle_sequence:
        if f.get(wrist_y_key, 1.0) < f.get(shoulder_y_key, 0.5):
            elbow_val = f.get(arm_key)
            if elbow_val and elbow_val > 0:
                delivery_frames.append(elbow_val)

    if not delivery_frames:
        delivery_frames = channel_values(angle_sequence, arm_key)

    if len(delivery_frames) < 2:
        return {**base, "score": 20, "is_good_shot": False,
                "feedback": f"Could not isolate delivery swing for {arm_name} bowler. "
                            "Start with hands low and swing fully above your shoulder."}

    import scipy.signal as signal
    if len(delivery_frames) >= 5:
        smoothed = signal.medfilt(delivery_frames, kernel_size=5)
    else:
        smoothed = delivery_frames

    min_elbow = float(min(smoothed))
    max_elbow = float(max(smoothed))

    # 20° leniency for 2D foreshortening (see disclaimer).
    raw_extension = max_elbow - min_elbow
    elbow_extension = min(180.0, max(0.0, raw_extension - 20.0))

    spine_tilts = channel_values(angle_sequence, "spine_tilt")
    avg_spine_tilt = float(np.mean(spine_tilts)) if spine_tilts else 0.0

    front_knee_key = "left_knee" if is_right_handed else "right_knee"
    front_knees = channel_values(angle_sequence, front_knee_key)
    avg_front_knee = float(np.mean(front_knees[-5:])) if len(front_knees) >= 5 else 180.0

    is_legal = elbow_extension <= 15.0

    if is_legal:
        score = max(80, min(100, int(round(100 - (elbow_extension * 1.5)))))
        verdict = f"✅ LIKELY LEGAL ({arm_name})"
        feedback = (
            f"{verdict} | Indicative elbow extension was {elbow_extension:.1f}°, within the "
            f"ICC Rule 11.1 15° guideline (went from {min_elbow:.1f}° to {max_elbow:.1f}°). "
            f"Smooth release with good straight-arm discipline."
        )
    else:
        score = max(10, min(55, int(round(100 - (elbow_extension - 15.0) * 4.0))))
        verdict = f"⚠️ POSSIBLE THROW ({arm_name}, indicative)"
        feedback = (
            f"{verdict} | The ICC Rule 11.1 guideline is under 15° elbow extension. "
            f"This clip indicated {elbow_extension:.1f}° (from {min_elbow:.1f}° to {max_elbow:.1f}°). "
            f"Keep your arm locked and rotate from the shoulder."
        )

    coaching_tips = []
    if avg_spine_tilt > 25:
        coaching_tips.append(
            "⚠️ Lumbar Spine Strain Risk: Significant lateral tilt (>25°) detected — "
            "mixed delivery action can cause high torsional lumbar stress."
        )
    knee_threshold = get_adaptive_threshold(age_group, "bowler_knee")
    if avg_front_knee < knee_threshold:
        coaching_tips.append(
            f"⚠️ Knee Valgus Instability: Front knee collapsed below {knee_threshold}° "
            f"(measured {avg_front_knee:.1f}°), transferring force to the lumbar spine."
        )
    elif avg_front_knee >= 165:
        coaching_tips.append("✅ Braced-leg landing is excellent, providing maximum release height and safety.")

    nose_ys = [f.get("nose_y", 0) for f in angle_sequence if f.get("nose_y", 0) > 0]
    avg_nose_y = float(np.mean(nose_ys)) if nose_ys else 0.0
    min_wrist_y = min([f.get(wrist_y_key, 1.0) for f in angle_sequence]) if angle_sequence else 1.0
    if avg_nose_y > 0 and min_wrist_y > avg_nose_y:
        coaching_tips.append(
            "⚠️ Shoulder Impingement Hazard: Release height fell below head height "
            "(round-arm action), placing high shear stress on the rotator cuff."
        )

    if coaching_tips:
        feedback += " Coaching tips: " + " ".join(coaching_tips[:2])

    # Camera-angle warning: small shoulder width ⇒ side-on ⇒ elbow angles unreliable.
    shoulder_widths = [f.get("shoulder_width", 0) for f in angle_sequence if f.get("shoulder_width", 0) > 0]
    avg_shoulder_width = float(np.mean(shoulder_widths)) if shoulder_widths else 0.0
    camera_angle_warning = ""
    if 0 < avg_shoulder_width < 0.08:
        camera_angle_warning = (
            "You appear to be filmed side-on — elbow extension from a single 2D camera is "
            "unreliable at this angle. Film front-on or at ~45° for a better read."
        )

    return {
        **base,
        "score": score,
        "feedback": feedback,
        "is_good_shot": is_legal,
        "angle_scores": {
            "bowling_arm_extension": float(elbow_extension),
            "min_elbow_angle": min_elbow,
            "max_elbow_angle": max_elbow,
            "spine_tilt": avg_spine_tilt,
        },
        "camera_angle_warning": camera_angle_warning,
    }


def calculate_sequence_score(angle_sequence, shot_type="cover_drive", is_right_handed=True):
    """Calculate score for an entire shot sequence."""
    if not angle_sequence:
        return {"score": 0, "feedback": "No data captured", "matches": 0}

    # Smooth angle channels before any scoring.
    angle_sequence = smooth_angle_sequence(angle_sequence)

    if shot_type == "bowling_action":
        return evaluate_bowling_action(angle_sequence, is_right_handed=is_right_handed)

    shot_name = get_shot_name(shot_type)
    ideal_seq = get_ideal_angle_sequence(shot_type)
    if not is_right_handed:
        ideal_seq = mirror_ideal(ideal_seq)

    quality = tracking_quality(angle_sequence)

    # ── VALIDATION CHECKS ──────────────────────────────────────────
    is_standing, stance_feedback = check_standing_pose(angle_sequence)
    motion_score, motion_feedback = calculate_motion_score(angle_sequence)

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
            "tracking_quality": quality,
        }

    # ── DTW COMPARISON (resampled + length-normalized) ─────────────
    angle_scores = {}
    total_score = 0.0
    for key in DTW_KEYS:
        user_resampled = resample_channel([f.get(key) for f in angle_sequence], RESAMPLE_LEN)
        ideal_resampled = resample_channel([f.get(key, 0) for f in ideal_seq], RESAMPLE_LEN)
        _, score = calculate_dtw_distance(user_resampled, ideal_resampled)
        angle_scores[key] = score
        total_score += score
    raw_score = total_score / len(DTW_KEYS)

    # ── BLEND RAW SCORE WITH MOTION QUALITY ────────────────────────
    stance_score = 100 if is_standing else 30
    motion_weight = min(100, motion_score)
    final_score = (raw_score * 0.60) + (motion_weight * 0.25) + (stance_score * 0.15)
    if motion_score < 50:
        final_score *= 0.6
    # If the motion doesn't resemble the template at all, it's not a good rep —
    # don't let free motion/stance points inflate a non-matching swing.
    if raw_score < 35:
        final_score = min(final_score, 30)
    final_score = max(0, min(100, final_score))

    # ── GENERATE FEEDBACK ──────────────────────────────────────────
    feedback_list = []
    batting_feedback = evaluate_batting_biomechanics(angle_sequence, is_right_handed)
    feedback_list.extend(batting_feedback)

    if final_score >= 80:
        feedback_list.append(f"Excellent {shot_name}! 🔥")
    elif final_score >= 60:
        feedback_list.append(f"Good {shot_name}, keep practicing!")
    elif final_score >= 40:
        feedback_list.append(f"Fair {shot_name}, needs improvement")
    else:
        feedback_list.append(f"Keep working on your {shot_name}")

    if not is_standing and stance_feedback:
        feedback_list.append(stance_feedback)
    feedback_list.extend(motion_feedback)

    if quality < 60:
        feedback_list.append(
            f"⚠️ Low tracking quality ({quality:.0f}%). Stand fully in frame with good lighting."
        )

    final_angles = angle_sequence[-1]
    for key in DTW_KEYS:
        fb = get_feedback_for_angle(key, final_angles.get(key))
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
        "tracking_quality": quality,
    }


def evaluate_shot(current_angles, accumulated_sequence=None, shot_type="cover_drive", is_right_handed=True):
    """Main entry point for shot evaluation."""
    if accumulated_sequence:
        return calculate_sequence_score(accumulated_sequence, shot_type, is_right_handed=is_right_handed)

    score = calculate_shot_score(current_angles, shot_type=shot_type)
    feedback_list = generate_feedback_list(current_angles)
    feedback = " | ".join(feedback_list) if feedback_list else "Frame captured"
    return {
        "score": int(round(score)),
        "feedback": feedback,
        "angles": current_angles,
    }
