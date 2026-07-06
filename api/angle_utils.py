"""
Angle calculation utilities for cricket biomechanics analysis.

This module contains functions to calculate angles between three points
in 3D space using NumPy. It focuses on critical joint angles for evaluating
cricket batting technique, particularly the cover drive shot.

Angles are gated on landmark visibility: if any of the three landmarks that
define an angle is not confidently tracked, the angle is reported as ``None``
so downstream scoring can skip it instead of averaging in garbage.
"""

import numpy as np

# A landmark below this visibility is considered untracked for angle purposes.
VISIBILITY_THRESHOLD = 0.5


def calculate_angle(point_a, point_b, point_c):
    """
    Calculate the angle at point_b formed by points a, b, and c in 3D space.

    Uses the dot product formula: cos(θ) = (u·v) / (||u|| ||v||)
    where u = a - b and v = c - b are vectors formed by the three points.

    Returns:
        Float: Angle in degrees (0-180)
    """
    a = np.array(point_a, dtype=np.float32)
    b = np.array(point_b, dtype=np.float32)
    c = np.array(point_c, dtype=np.float32)

    ba = a - b
    bc = c - b

    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)

    if norm_ba == 0 or norm_bc == 0:
        return 0.0

    cosine = np.dot(ba, bc) / (norm_ba * norm_bc)
    cosine = np.clip(cosine, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosine)))


def _xyz(landmarks, i):
    lm = landmarks[i]
    return (lm["x"], lm["y"], lm["z"])


def _all_visible(vis_landmarks, idxs, threshold=VISIBILITY_THRESHOLD):
    """True only if every referenced landmark is tracked at >= threshold."""
    try:
        return all(
            float(vis_landmarks[i].get("visibility", 1.0)) >= threshold for i in idxs
        )
    except (KeyError, IndexError, TypeError):
        return False


def _joint_angle(coords, vis_landmarks, i, j, k):
    """
    Angle at joint ``j``. Geometry is read from ``coords`` (world landmarks when
    available, else 2D image landmarks); visibility gating uses ``vis_landmarks``
    (always the 2D image landmarks, which carry the tracker's confidence).
    Returns ``None`` when the joint isn't reliably visible.
    """
    if not _all_visible(vis_landmarks, (i, j, k)):
        return None
    try:
        return calculate_angle(_xyz(coords, i), _xyz(coords, j), _xyz(coords, k))
    except (KeyError, IndexError, TypeError):
        return None


def get_left_elbow_angle(landmarks, coords=None):
    """Left elbow angle (11=shoulder, 13=elbow, 15=wrist)."""
    return _joint_angle(coords or landmarks, landmarks, 11, 13, 15)


def get_right_elbow_angle(landmarks, coords=None):
    """Right elbow angle (12=shoulder, 14=elbow, 16=wrist)."""
    return _joint_angle(coords or landmarks, landmarks, 12, 14, 16)


def get_left_knee_angle(landmarks, coords=None):
    """Left knee angle (23=hip, 25=knee, 27=ankle)."""
    return _joint_angle(coords or landmarks, landmarks, 23, 25, 27)


def get_right_knee_angle(landmarks, coords=None):
    """Right knee angle (24=hip, 26=knee, 28=ankle)."""
    return _joint_angle(coords or landmarks, landmarks, 24, 26, 28)


def get_spine_tilt(landmarks, coords=None):
    """
    Spine tilt (torso alignment relative to vertical), in degrees.
    0 is perfectly upright. Returns ``None`` if the torso isn't visible.
    """
    src = coords or landmarks
    if not _all_visible(landmarks, (11, 12, 23, 24)):
        return None
    try:
        mid_shoulder = (
            (src[11]["x"] + src[12]["x"]) / 2.0,
            (src[11]["y"] + src[12]["y"]) / 2.0,
            (src[11]["z"] + src[12]["z"]) / 2.0,
        )
        mid_hip = (
            (src[23]["x"] + src[24]["x"]) / 2.0,
            (src[23]["y"] + src[24]["y"]) / 2.0,
            (src[23]["z"] + src[24]["z"]) / 2.0,
        )
        torso = np.array(mid_shoulder) - np.array(mid_hip)
        vertical = np.array([0.0, -1.0, 0.0])  # y points down in MediaPipe
        torso_norm = np.linalg.norm(torso)
        if torso_norm == 0:
            return None
        cosine = np.clip(np.dot(torso, vertical) / torso_norm, -1.0, 1.0)
        return float(np.degrees(np.arccos(cosine)))
    except (KeyError, IndexError, TypeError):
        return None


def get_head_alignment(landmarks):
    """
    Head alignment relative to the front shoulder (image space).
    MediaPipe indices: 0=nose, 11=left_shoulder.
    """
    try:
        return float(landmarks[0]["y"] - landmarks[11]["y"])
    except (KeyError, IndexError, TypeError):
        return 0.0


def get_shoulder_width(landmarks):
    """
    Normalized horizontal distance between the shoulders (image space).
    A small value means the batter/bowler is filmed side-on, where elbow angles
    from a single 2D camera become unreliable.
    """
    try:
        return abs(float(landmarks[11]["x"]) - float(landmarks[12]["x"]))
    except (KeyError, IndexError, TypeError):
        return 0.0


# Angle channels used throughout scoring.
ANGLE_KEYS = ["left_elbow", "right_elbow", "left_knee", "right_knee", "spine_tilt"]


def extract_shot_angles(landmarks, world_landmarks=None):
    """
    Extract all critical angles and key relative coordinates for shot evaluation.

    Args:
        landmarks: List of 33 landmark dicts (2D normalized image coordinates).
        world_landmarks: Optional list of 33 metric 3D landmark dicts
            (``results.poseWorldLandmarks``). When present, joint angles are
            computed from these for far greater accuracy; visibility gating and
            image-space positions still come from ``landmarks``.

    Returns:
        Dict of angle measurements (some may be ``None``) and key positions.
    """
    coords = world_landmarks if world_landmarks else None

    try:
        left_wrist_y = float(landmarks[15]["y"])
        left_shoulder_y = float(landmarks[11]["y"])
        right_wrist_y = float(landmarks[16]["y"])
        right_shoulder_y = float(landmarks[12]["y"])
        nose_y = float(landmarks[0]["y"])
    except (KeyError, IndexError, TypeError):
        left_wrist_y = 1.0
        left_shoulder_y = 0.5
        right_wrist_y = 1.0
        right_shoulder_y = 0.5
        nose_y = 0.0

    return {
        "left_elbow": get_left_elbow_angle(landmarks, coords),
        "right_elbow": get_right_elbow_angle(landmarks, coords),
        "left_knee": get_left_knee_angle(landmarks, coords),
        "right_knee": get_right_knee_angle(landmarks, coords),
        "head_alignment": get_head_alignment(landmarks),
        "spine_tilt": get_spine_tilt(landmarks, coords),
        "shoulder_width": get_shoulder_width(landmarks),
        "left_wrist_y": left_wrist_y,
        "left_shoulder_y": left_shoulder_y,
        "right_wrist_y": right_wrist_y,
        "right_shoulder_y": right_shoulder_y,
        "nose_y": nose_y,
    }


def channel_values(angle_sequence, key):
    """Return the non-null, positive values of one angle channel over a sequence."""
    out = []
    for f in angle_sequence:
        v = f.get(key)
        if v is not None and v > 0:
            out.append(float(v))
    return out


def smooth_sequence(values, window=5):
    """
    Moving-average smoother over a 1D list (MediaPipe jitter is a few degrees).
    ``None`` entries are ignored; the output has the same length as the input,
    with each position replaced by the mean of the surrounding valid window.
    """
    n = len(values)
    if n == 0:
        return []
    half = window // 2
    out = []
    for i in range(n):
        lo = max(0, i - half)
        hi = min(n, i + half + 1)
        win = [v for v in values[lo:hi] if v is not None]
        if win:
            out.append(float(np.mean(win)))
        else:
            out.append(values[i])
    return out


def resample_channel(values, target_len=50):
    """
    Resample a 1D sequence to ``target_len`` points via linear interpolation.
    Drops ``None``/zero entries first. Returns a list of length ``target_len``
    (all zeros if there aren't at least two valid points).
    """
    valid = [float(v) for v in values if v is not None and v > 0]
    if len(valid) < 2:
        return [0.0] * target_len
    xs = np.linspace(0.0, 1.0, num=len(valid))
    xt = np.linspace(0.0, 1.0, num=target_len)
    return list(np.interp(xt, xs, valid))


def calculate_distance(point_a, point_b):
    """Euclidean distance between two 3D points."""
    a = np.array(point_a, dtype=np.float32)
    b = np.array(point_b, dtype=np.float32)
    return float(np.linalg.norm(a - b))
