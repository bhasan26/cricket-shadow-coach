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

from itertools import pairwise

import numpy as np

from angle_utils import (
    channel_values,
    resample_channel,
    smooth_sequence,
)
from dtw_utils import (
    calculate_dtw_distance,
    constrained_dtw_path,
    shape_match_score,
    tolerance_score,
)
from geo import (
    get_feedback_for_angle,
    get_ideal_angle_sequence,
    get_phase_feedback,
    get_recorded_shot_types,
    get_reference_tolerance,
    get_shot_name,
)

# Angle channels compared against ideal models.
DTW_KEYS = ["left_elbow", "right_elbow", "left_knee", "right_knee"]
# Channels that get smoothed across the sequence.
SMOOTH_KEYS = DTW_KEYS + ["spine_tilt"]
# Channels used to decide WHICH shot a motion resembles. Spine tilt separates
# the shots strongly (a pull rotates the torso where a defensive block stays
# upright) but its absolute value is too camera-dependent to grade against, so
# it identifies the shot without contributing to the score.
MATCH_KEYS = DTW_KEYS + ["spine_tilt"]
# Number of points every channel is resampled to before DTW.
RESAMPLE_LEN = 50
SCORING_VERSION = "2"

# A shot-identification result only overrides the user's selection when the best
# match beats the runner-up by this margin AND fits well enough in absolute
# terms. Tuned in api/eval/run_eval.py: correct reps are never confidently
# mislabelled at these thresholds, across noise, tempo and personal offset.
MIN_MATCH_MARGIN = 6.0
MIN_MATCH_FIT = 50.0

# Largest body-build correction applied to the user's angles (degrees). A player
# whose joints all read ~20° off the broadcast references — different build,
# camera height, or systematic tracker bias — otherwise loses ~27 points on a
# correctly played shot. Beyond this cap the deviation is too large to be
# anatomy and is graded as technique.
#
# 8° is where the trade-off sits: it recovers a 20°-offset rep from 73 to 92,
# while a generic non-shot arm swing stays at 30. Raising it to 12 buys only 6
# more points on the genuine rep but lifts that non-shot to 63 — forgiveness
# that starts flattering motion which isn't a cricket shot at all.
MAX_BUILD_CALIBRATION = 8.0

# Head cock (degrees from the shoulder line) that earns a coaching note. A
# heuristic for practice guidance, not a clinical measure — ear landmarks are
# noisy, so the check uses the 90th percentile over the sequence rather than a
# single frame.
HEAD_TILT_WARN_DEGREES = 20.0
# Ceiling applied when the motion confidently matches a different shot — a
# well-executed pull shot is not a good cover drive, whatever its angles score.
MISMATCH_SCORE_CAP = 45

BOWLING_DISCLAIMER = (
    "Indicative screen only — single-camera pose estimates cannot establish bowling "
    "legality. The delivery window uses an estimated wrist-high point, not a detected "
    "ball release. Perspective and tracking error can change the measurement in "
    "either direction. Use this as practice guidance, not an official verdict."
)


def evaluate_frame(angles, frame_index=0):
    """Evaluate the already-extracted angles supplied by the frame endpoints."""
    return evaluate_shot(angles)


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


def _sequence_timestamps(angle_sequence):
    times = [frame.get("timestamp_ms") for frame in angle_sequence]
    if any(value is None or not np.isfinite(value) for value in times):
        return None
    return times if all(b > a for a, b in pairwise(times)) else None


def normalize_batting_angles(angle_sequence):
    """Resample onto one timeline before smoothing, so filter width is FPS-independent."""
    timestamps = _sequence_timestamps(angle_sequence)
    channels = {}
    for key in [*SMOOTH_KEYS, "head_tilt"]:
        values = [frame.get(key) for frame in angle_sequence]
        if len(channel_values(angle_sequence, key)) < 2:
            channels[key] = [None] * RESAMPLE_LEN
        else:
            channels[key] = resample_channel(values, RESAMPLE_LEN, timestamps)
    normalized = [{key: values[i] for key, values in channels.items()} for i in range(RESAMPLE_LEN)]
    return smooth_angle_sequence(normalized)


def tracking_quality(angle_sequence):
    """Percentage of frames in which all key joint angles were confidently tracked."""
    if not angle_sequence:
        return 0.0
    full = sum(
        1 for f in angle_sequence if all(f.get(k) is not None and np.isfinite(f[k]) for k in DTW_KEYS)
    )
    return round(100.0 * full / len(angle_sequence), 1)


def mirror_tolerance(tolerance):
    """Swap left/right tolerance bands to match a mirrored ideal sequence."""
    if not tolerance:
        return tolerance
    swapped = dict(tolerance)
    for a, b in (("left_elbow", "right_elbow"), ("left_knee", "right_knee")):
        swapped[a], swapped[b] = tolerance.get(b), tolerance.get(a)
    return {k: v for k, v in swapped.items() if v is not None}


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

    # Derivatives per raw frame depend on FPS. Compare change on a fixed
    # normalized timeline, so duplicating frames cannot turn flailing smooth.
    ranges = []
    jerk = []
    for key in DTW_KEYS:
        values = channel_values(angle_sequence, key)
        if len(values) >= 2:
            ranges.append(max(values) - min(values))
        if len(values) > 2:
            normalized = resample_channel([f.get(key) for f in angle_sequence], RESAMPLE_LEN,
                                          timestamps=_sequence_timestamps(angle_sequence))
            jerk.append(float(np.std(np.diff(normalized))))
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
    if not left or not right:
        return False, "Setup knees were not tracked — keep your full body in view"
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
                f"Front-knee bend reached {min_front_knee:.1f}°. Review your balance "
                "alongside the stroke video; this angle alone does not establish a technique fault."
            )

    # Head cock in degrees, relative to the player's own shoulder line. This
    # previously compared `head_alignment` — a normalized coordinate offset
    # bounded to [-1, 1] — against 3.0, so the warning could never fire.
    head_tilts = channel_values(angle_sequence, "head_tilt")
    if head_tilts:
        # Sustained tilt, not a single frame of tracker noise: the ear landmarks
        # are among MediaPipe's jitteriest.
        max_tilt = float(np.percentile(head_tilts, 90))
        if max_tilt > HEAD_TILT_WARN_DEGREES:
            feedback.append(
                f"⚠️ Head Alignment: Head cocked {max_tilt:.0f}° relative to your "
                "shoulders. Keeping your eyes level helps depth perception — try to "
                "stay square through the shot."
            )

    return feedback


def _bowling_measurement_window(angle_sequence, arm_key, wrist_y_key, shoulder_y_key, elbow_y_key):
    """
    Isolate the ICC measurement window for elbow extension.

    Start: first frame where the bowling upper arm passes horizontal — in screen
    space (y down), elbow_y crossing from below to above shoulder_y — while the
    wrist is above the elbow (arm swinging up, not hanging in the gather).
    End (release): the frame where the wrist reaches its highest point at or
    after the start.

    Returns (elbow_angles_in_window, frame_count). Empty list when the payload
    lacks elbow_y data or no crossing is found.
    """
    if not any(elbow_y_key in f for f in angle_sequence):
        return [], 0

    def tracked(frame):
        return all(frame.get(key) is not None and np.isfinite(frame[key])
                   for key in (arm_key, wrist_y_key, shoulder_y_key, elbow_y_key))

    start = None
    for i in range(1, len(angle_sequence)):
        prev, cur = angle_sequence[i - 1], angle_sequence[i]
        if not tracked(prev) or not tracked(cur):
            continue
        prev_below = prev.get(elbow_y_key, 1.0) >= prev.get(shoulder_y_key, 0.5)
        now_above = cur.get(elbow_y_key, 1.0) < cur.get(shoulder_y_key, 0.5)
        wrist_leading = cur.get(wrist_y_key, 1.0) <= cur.get(elbow_y_key, 1.0)
        if prev_below and now_above and wrist_leading:
            start = i
            break
    if start is None:
        return [], 0

    # Stop at the end of this arm swing. A later second delivery must not
    # redefine this one's release proxy or extend its measurement window.
    end = next((i for i in range(start + 1, len(angle_sequence))
                if tracked(angle_sequence[i]) and angle_sequence[i][elbow_y_key] >= angle_sequence[i][shoulder_y_key]),
               len(angle_sequence))
    observed = [i for i in range(start, end) if tracked(angle_sequence[i])]
    if len(observed) < 2:
        return [], 0
    # Highest tracked wrist is only a release proxy, not a detected release.
    release = min(
        observed,
        key=lambda i: angle_sequence[i].get(wrist_y_key, 1.0),
    )
    if release <= start:
        release = observed[1]

    window = angle_sequence[start: release + 1]
    angles = channel_values(window, arm_key)
    return angles, len(window)


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
        "confidence": "low",
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

    wrist_y_key = "right_wrist_y" if is_right_handed else "left_wrist_y"
    shoulder_y_key = "right_shoulder_y" if is_right_handed else "left_shoulder_y"
    elbow_y_key = "right_elbow_y" if is_right_handed else "left_elbow_y"

    # ICC-style measurement window: from the frame where the upper arm passes
    # horizontal (elbow rises above the shoulder in screen space, i.e. the
    # shoulder→elbow y-component crosses 0 with the arm on the way up) to the
    # release frame (wrist at its highest point). Elbow extension outside this
    # window — e.g. during the gather — is legal and must not be counted.
    delivery_frames, window_frame_count = _bowling_measurement_window(
        angle_sequence, arm_key, wrist_y_key, shoulder_y_key, elbow_y_key
    )
    window_found = bool(delivery_frames)

    if not delivery_frames:
        # Fallback for clips where the window can't be isolated (older payloads
        # without elbow_y, or partial visibility): all wrist-above-shoulder
        # frames, else the whole tracked series. Confidence is reported low.
        for f in angle_sequence:
            if f.get(wrist_y_key, 1.0) < f.get(shoulder_y_key, 0.5):
                elbow_val = f.get(arm_key)
                if elbow_val is not None and np.isfinite(elbow_val):
                    delivery_frames.append(elbow_val)
        if not delivery_frames:
            delivery_frames = channel_values(angle_sequence, arm_key)
        window_frame_count = len(delivery_frames)

    if len(delivery_frames) < 2:
        return {**base, "score": 20, "is_good_shot": False,
                "feedback": f"Could not isolate delivery swing for {arm_name} bowler. "
                            "Start with hands low and swing fully above your shoulder."}

    # Despike the elbow series, replicating the edge samples rather than
    # zero-padding. scipy.signal.medfilt zero-pads, which drags the last two
    # samples of the window toward zero and silently discards the peak
    # extension — losing 2/(n-1) of the measured range. On a 6-frame delivery
    # window (a fast arm at 30fps) that reported only 60% of the true value, so
    # a genuine 25° extension read as 15° and passed as legal. Under-reporting
    # is the dangerous direction here: it clears actions that should be flagged.
    from scipy.ndimage import median_filter
    if len(delivery_frames) >= 5:
        smoothed = median_filter(
            np.asarray(delivery_frames, dtype=float), size=5, mode="nearest"
        )
    else:
        smoothed = delivery_frames

    min_elbow = float(min(smoothed))
    max_elbow = float(max(smoothed))

    # Perspective error can have either sign. Subtracting a fixed 20 degrees
    # made a measured 25-degree extension read as five; it is not calibration.
    world_frames = sum(1 for f in angle_sequence if f.get("is_world"))
    angles_are_3d = world_frames >= len(angle_sequence) / 2
    # Extension is straightening in time order, not an unordered max-min range:
    # an arm only flexing from 170 to 145 degrees has zero observed extension.
    running_min = float(smoothed[0])
    elbow_extension = 0.0
    for angle in smoothed:
        running_min = min(running_min, float(angle))
        elbow_extension = max(elbow_extension, float(angle) - running_min)
    elbow_extension = min(180.0, elbow_extension)

    spine_tilts = channel_values(angle_sequence, "spine_tilt")
    avg_spine_tilt = float(np.mean(spine_tilts)) if spine_tilts else 0.0

    front_knee_key = "left_knee" if is_right_handed else "right_knee"
    front_knees = channel_values(angle_sequence, front_knee_key)
    avg_front_knee = float(np.mean(front_knees[-5:])) if front_knees else None

    is_legal = elbow_extension <= 15.0

    # Confidence: a proper measurement needs a real window with enough frames
    # and well-tracked joints. 30fps webcam analysis is never authoritative —
    # this flags when it isn't even a reliable estimate.
    confidence = "normal"
    if (not angles_are_3d or not window_found or len(delivery_frames) < 5
            or 100 * len(delivery_frames) / max(1, window_frame_count) < 60
            or base["tracking_quality"] < 60):
        confidence = "low"

    if is_legal:
        score = max(80, min(100, round(100 - (elbow_extension * 1.5))))
        verdict = f"✅ Estimated extension {elbow_extension:.1f}° ({arm_name})"
        feedback = (
            f"{verdict} | Within the ICC Rule 11.1 15° guideline "
            f"(observed elbow angles ranged from {min_elbow:.1f}° to {max_elbow:.1f}°). "
            f"Smooth release with good straight-arm discipline."
        )
    else:
        score = max(10, min(55, round(100 - (elbow_extension - 15.0) * 4.0)))
        verdict = f"⚠️ Estimated extension {elbow_extension:.1f}° ({arm_name})"
        feedback = (
            f"{verdict} | Exceeds the ICC Rule 11.1 15° guideline "
            f"(observed angles ranged from {min_elbow:.1f}° to {max_elbow:.1f}°). "
            f"Indicative only; not an official assessment. "
            f"Review a clearly filmed delivery with a coach."
        )

    if confidence == "low":
        feedback += (
            " Low measurement confidence — the delivery window was short or joints "
            "were poorly tracked. Re-record with your full body visible."
        )

    coaching_tips = []
    if avg_spine_tilt > 25:
        coaching_tips.append(
            f"Estimated torso lean averaged {avg_spine_tilt:.1f}°. "
            "This measurement does not distinguish lateral lean from forward lean."
        )
    knee_threshold = get_adaptive_threshold(age_group, "bowler_knee")
    if avg_front_knee is not None and avg_front_knee < knee_threshold:
        coaching_tips.append(
            f"Late front-knee angle averaged {avg_front_knee:.1f}°. "
            "Knee flexion alone cannot measure sideways knee collapse or injury risk."
        )
    elif avg_front_knee is not None and avg_front_knee >= 165:
        coaching_tips.append(f"Late front-knee angle averaged {avg_front_knee:.1f}° (near straight).")

    if coaching_tips:
        feedback += " Coaching tips: " + " ".join(coaching_tips[:2])

    # Camera-angle warning: small shoulder width ⇒ side-on ⇒ elbow angles unreliable.
    shoulder_widths = [f.get("shoulder_width", 0) for f in angle_sequence if f.get("shoulder_width", 0) > 0]
    avg_shoulder_width = float(np.mean(shoulder_widths)) if shoulder_widths else 0.0
    camera_angle_warning = ""
    if not angles_are_3d and 0 < avg_shoulder_width < 0.08:
        camera_angle_warning = (
            "You appear to be filmed side-on — elbow extension from a single 2D camera is "
            "unreliable at this angle. Film front-on or at ~45° for a better read."
        )

    return {
        **base,
        "score": score,
        "feedback": feedback,
        "is_good_shot": is_legal,
        "confidence": confidence,
        "angle_scores": {
            "bowling_arm_extension": float(elbow_extension),
            "min_elbow_angle": min_elbow,
            "max_elbow_angle": max_elbow,
            "spine_tilt": avg_spine_tilt,
        },
        "camera_angle_warning": camera_angle_warning,
    }


def segment_phases(front_elbow_series):
    """
    Rule-based batting phase segmentation over a smoothed front-elbow angle
    series: stance (still) → backswing (elbow flexing, angle decreasing) →
    downswing/impact (extending to peak) → follow-through.

    Returns {"backswing": (start, end), "impact": (start, end),
    "follow_through": (start, end)} index ranges (inclusive), or None when the
    series doesn't contain a recognizable swing shape.
    """
    n = len(front_elbow_series)
    if n < 10:
        return None
    series = np.asarray(front_elbow_series, dtype=float)
    velocity = np.abs(np.diff(series))

    # Stance ends when the elbow starts genuinely moving.
    moving = np.where(velocity > 1.0)[0]
    stance_end = int(moving[0]) if len(moving) else 0

    # Backswing bottoms out at maximum flexion; impact is peak extension after it.
    search_from = min(stance_end, n - 2)
    min_idx = search_from + int(np.argmin(series[search_from:]))
    if min_idx >= n - 2:
        return None
    impact_idx = min_idx + int(np.argmax(series[min_idx:]))
    if impact_idx <= min_idx or (series[impact_idx] - series[min_idx]) < 10:
        return None  # no meaningful extension — not a swing

    half_window = max(2, n // 16)
    return {
        "backswing": (stance_end, min_idx),
        "impact": (max(0, impact_idx - half_window), min(n - 1, impact_idx + half_window)),
        "follow_through": (impact_idx, n - 1),
    }


def score_phases(angle_sequence, ideal_seq, is_right_handed=True):
    """
    Per-phase scores against the matching segment of the reference, so feedback
    can say WHICH part of the shot was off. Returns {} when either sequence has
    no recognizable swing (whole-sequence DTW score still applies).
    """
    front_key = "left_elbow" if is_right_handed else "right_elbow"
    timestamps = _sequence_timestamps(angle_sequence)
    user_front = resample_channel([f.get(front_key) for f in angle_sequence], RESAMPLE_LEN, timestamps)
    ideal_front = resample_channel([f.get(front_key, 0) for f in ideal_seq], RESAMPLE_LEN)

    user_phases = segment_phases(user_front)
    ideal_phases = segment_phases(ideal_front)
    if not user_phases or not ideal_phases:
        return {}

    user_channels = {
        k: resample_channel([f.get(k) for f in angle_sequence], RESAMPLE_LEN, timestamps) for k in DTW_KEYS
    }
    ideal_channels = {
        k: resample_channel([f.get(k, 0) for f in ideal_seq], RESAMPLE_LEN) for k in DTW_KEYS
    }

    phase_scores = {}
    for phase in ("backswing", "impact", "follow_through"):
        u0, u1 = user_phases[phase]
        i0, i1 = ideal_phases[phase]
        if u1 - u0 < 2 or i1 - i0 < 2:
            continue
        scores = []
        for key in DTW_KEYS:
            _, s = calculate_dtw_distance(
                user_channels[key][u0: u1 + 1], ideal_channels[key][i0: i1 + 1]
            )
            scores.append(s)
        if scores:
            phase_scores[f"{phase}_phase"] = float(np.mean(scores))
    return phase_scores


def build_calibration_offset(user_channels, ideal_seq, keys=None):
    """
    The angle offset this player carries from body build, camera height and
    systematic tracker bias — to be removed before grading technique.

    Only the COMMON-MODE offset is returned: the median, across joints, of each
    joint's median residual against the reference. That split is what makes the
    correction safe. A player who is simply built differently reads offset on
    every joint at once, so the median moves and the bias is removed. A genuine
    fault — a front elbow consistently over-extended — moves one joint only, so
    the median barely shifts and the fault still costs marks.

    The recorded references are broadcast clips trimmed to the shot itself, with
    no still stance to calibrate against (verified: 5-7° of motion from frame
    one), so the offset is measured over the aligned swing rather than at rest.

    Returns degrees, clamped to ±MAX_BUILD_CALIBRATION, or 0.0 when there isn't
    enough tracked data to judge.
    """
    keys = keys or DTW_KEYS
    per_joint = []
    for key in keys:
        user = user_channels.get(key)
        ref = [f.get(key, 0) for f in ideal_seq]
        if not user or not ref or max(user) <= 0:
            continue
        path = constrained_dtw_path(user, ref)
        if not path:
            continue
        per_joint.append(float(np.median([user[i] - ref[j] for i, j in path])))

    # Need most joints present, or "common mode" is just one joint's fault.
    if len(per_joint) < 3:
        return 0.0
    offset = float(np.median(per_joint))
    return float(np.clip(offset, -MAX_BUILD_CALIBRATION, MAX_BUILD_CALIBRATION))


def identify_shot(angle_sequence, is_right_handed=True):
    """
    Which recorded reference does this motion most resemble?

    Matching is on SHAPE only (each channel mean-removed before alignment), so
    a player whose joint angles sit 20° off the broadcast references is still
    identified correctly — see ``shape_match_score``. This answers "did you play
    the shot you selected?", which the tolerance-band score cannot: before this
    check, a perfect pull shot scored 98/100 against the cover-drive reference.

    Returns ``{"best", "scores", "margin", "confident"}``, or ``None`` when the
    motion carries too little shape information to judge.
    """
    candidates = get_recorded_shot_types()
    if len(candidates) < 2:
        return None

    user = {
        k: resample_channel([f.get(k) for f in angle_sequence], RESAMPLE_LEN,
                            _sequence_timestamps(angle_sequence))
        for k in MATCH_KEYS
    }

    scores = {}
    for shot in candidates:
        ref_seq = get_ideal_angle_sequence(shot)
        if not is_right_handed:
            ref_seq = mirror_ideal(ref_seq)
        channel_scores = [
            s
            for s in (
                shape_match_score(user[k], [f.get(k, 0) for f in ref_seq])
                for k in MATCH_KEYS
            )
            if s is not None
        ]
        # Need agreement across several joints — one channel can match by chance.
        if len(channel_scores) >= 2:
            scores[shot] = float(np.mean(channel_scores))

    if len(scores) < 2:
        return None

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    best, best_score = ranked[0]
    margin = best_score - ranked[1][1]
    return {
        "best": best,
        "scores": scores,
        "margin": float(margin),
        "confident": margin >= MIN_MATCH_MARGIN and best_score >= MIN_MATCH_FIT,
    }


def calculate_sequence_score(angle_sequence, shot_type="cover_drive", is_right_handed=True):
    """Calculate score for an entire shot sequence."""
    if not angle_sequence:
        return {"score": 0, "feedback": "No data captured", "matches": 0}

    if shot_type == "bowling_action":
        # Isolate the delivery before filtering. Otherwise the gather and
        # follow-through contaminate the extension extrema at its boundaries.
        return evaluate_bowling_action(angle_sequence, is_right_handed=is_right_handed)

    shot_name = get_shot_name(shot_type)
    ideal_seq = get_ideal_angle_sequence(shot_type)
    tolerance = get_reference_tolerance(shot_type)
    if not is_right_handed:
        ideal_seq = mirror_ideal(ideal_seq)
        tolerance = mirror_tolerance(tolerance)

    quality = tracking_quality(angle_sequence)
    if quality < 60:
        return {
            "score": 0, "shot_type": shot_type, "shot_name": shot_name,
            "feedback": "Tracking was uncertain. Record again with your full body visible and good lighting.",
            "angle_scores": {}, "is_good_shot": False,
            "tracking_quality": quality, "confidence": "low",
        }
    if len(angle_sequence) < 3:
        return {
            "score": 0, "shot_type": shot_type, "shot_name": shot_name,
            "feedback": "Too few frames — record a complete stroke.",
            "angle_scores": {}, "is_good_shot": False,
            "tracking_quality": quality, "confidence": "low",
        }

    angle_sequence = normalize_batting_angles(angle_sequence)

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

    # ── REFERENCE COMPARISON (resampled + length-normalized) ───────
    # With a recorded reference, each channel is scored against per-frame
    # tolerance bands (1 std = full marks → 0 at 3 std). Hardcoded fallback
    # references have no bands, so plain length-normalized DTW applies.
    user_channels = {
        key: resample_channel([f.get(key) for f in angle_sequence], RESAMPLE_LEN,
                              _sequence_timestamps(angle_sequence))
        for key in DTW_KEYS
    }
    # Grade technique, not anatomy: remove the offset this player carries on
    # every joint at once before comparing against the reference.
    calibration = build_calibration_offset(user_channels, ideal_seq)

    angle_scores = {}
    total_score = 0.0
    for key in DTW_KEYS:
        user_resampled = [float(np.clip(v - calibration, 0, 180)) for v in user_channels[key]]
        if tolerance and tolerance.get(key):
            ref_mean = [f.get(key, 0) for f in ideal_seq]
            score = tolerance_score(user_resampled, ref_mean, tolerance[key])
        else:
            ideal_resampled = resample_channel([f.get(key, 0) for f in ideal_seq], RESAMPLE_LEN)
            _, score = calculate_dtw_distance(user_resampled, ideal_resampled)
        angle_scores[key] = score
        total_score += score
    raw_score = total_score / len(DTW_KEYS)

    # ── PHASE-AWARE SCORES (which part of the shot was off) ────────
    angle_scores.update(score_phases(angle_sequence, ideal_seq, is_right_handed))

    # ── DID THEY PLAY THE SHOT THEY SELECTED? ──────────────────────
    match = identify_shot(angle_sequence, is_right_handed)
    is_mismatch = bool(match and match["confident"] and match["best"] != shot_type)

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
    # A clean rep of a DIFFERENT shot is not a good rep of this one.
    if is_mismatch:
        final_score = min(final_score, MISMATCH_SCORE_CAP)
    final_score = max(0, min(100, final_score))

    # ── GENERATE FEEDBACK ──────────────────────────────────────────
    feedback_list = []
    if is_mismatch:
        feedback_list.append(
            f"That looked more like a {get_shot_name(match['best'])} than a {shot_name} — "
            f"check you selected the drill you meant to play."
        )
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

    # Straight after the headline: which part of THIS swing was weakest. Only
    # three feedback items survive the join below, so this has to outrank the
    # generic per-angle tips or it never reaches the user.
    phase_feedback = get_phase_feedback(angle_scores)
    if phase_feedback:
        feedback_list.append(phase_feedback)

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


    result = {
        "score": round(final_score),
        "shot_type": shot_type,
        "shot_name": shot_name,
        "feedback": " | ".join(feedback_list[:3]),
        "angle_scores": angle_scores,
        "is_good_shot": final_score >= 70,
        "tracking_quality": quality,
        # Degrees of body-build offset removed before grading (0 when none was
        # detected). Surfaced so a large correction is visible, not silent.
        "build_calibration": round(calibration, 1),
    }
    if match:
        result["shot_match"] = {
            "best": match["best"],
            "best_name": get_shot_name(match["best"]),
            "margin": round(match["margin"], 1),
            "confident": match["confident"],
            "matches_selection": match["best"] == shot_type,
        }
    return result


def evaluate_shot(current_angles, accumulated_sequence=None, shot_type="cover_drive", is_right_handed=True):
    """Main entry point for shot evaluation."""
    if accumulated_sequence:
        return calculate_sequence_score(accumulated_sequence, shot_type, is_right_handed=is_right_handed)

    score = calculate_shot_score(current_angles, shot_type=shot_type)
    feedback_list = generate_feedback_list(current_angles)
    feedback = " | ".join(feedback_list) if feedback_list else "Frame captured"
    return {
        "score": round(score),
        "feedback": feedback,
        "angles": current_angles,
    }
