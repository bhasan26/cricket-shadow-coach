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
        Float angle in degrees (0-180), or None for invalid/zero-length bones.
    """
    a = np.array(point_a, dtype=np.float64)
    b = np.array(point_b, dtype=np.float64)
    c = np.array(point_c, dtype=np.float64)

    ba = a - b
    bc = c - b

    if not np.all(np.isfinite(ba)) or not np.all(np.isfinite(bc)):
        return None
    scale_ba, scale_bc = np.max(np.abs(ba)), np.max(np.abs(bc))
    if scale_ba == 0 or scale_bc == 0:
        return None
    # Normalize bone vectors separately before taking norms, avoiding overflow
    # and retaining scale invariance for very small or large coordinates.
    ba, bc = ba / scale_ba, bc / scale_bc
    norm_ba, norm_bc = np.linalg.norm(ba), np.linalg.norm(bc)

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
        return calculate_angle(torso, (0, 0, 0), vertical)
    except (KeyError, IndexError, TypeError):
        return None


def get_head_alignment(landmarks):
    """
    Head POSITION relative to the front shoulder (image space, normalized
    coordinates, so bounded to [-1, 1]). MediaPipe indices: 0=nose,
    11=left_shoulder.

    This is an offset, not a tilt — use ``get_head_tilt`` for head cock. Kept
    because the hardcoded ideal sequences in geo.py carry a ``head_alignment``
    channel.
    """
    try:
        return float(landmarks[0]["y"] - landmarks[11]["y"])
    except (KeyError, IndexError, TypeError):
        return 0.0


def get_head_tilt(landmarks):
    """
    Head cock in degrees: the angle between the ear-to-ear line (7=left_ear,
    8=right_ear) and the shoulder line (11, 12). 0 means the eyes are level
    with the shoulders.

    Measuring against the SHOULDER line rather than the horizon is deliberate —
    it cancels camera roll. A tilted phone rotates the ears and the shoulders
    together, so it no longer reads as a head tilt; only the player actually
    cocking their head relative to their own shoulders does.

    Returns ``None`` when the ears or shoulders aren't reliably visible.
    """
    if not _all_visible(landmarks, (7, 8, 11, 12)):
        return None
    try:
        ear = (
            float(landmarks[8]["x"]) - float(landmarks[7]["x"]),
            float(landmarks[8]["y"]) - float(landmarks[7]["y"]),
        )
        shoulder = (
            float(landmarks[12]["x"]) - float(landmarks[11]["x"]),
            float(landmarks[12]["y"]) - float(landmarks[11]["y"]),
        )
    except (KeyError, IndexError, TypeError):
        return None
    if np.hypot(*ear) < 1e-6 or np.hypot(*shoulder) < 1e-6:
        return None

    delta = np.degrees(
        np.arctan2(ear[1], ear[0]) - np.arctan2(shoulder[1], shoulder[0])
    )
    # These are lines, not directed vectors: a reversed ear landmark order
    # must not turn two parallel, level lines into a 180-degree head tilt.
    delta = (delta + 90.0) % 180.0 - 90.0
    return float(abs(delta))


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


def extract_shot_angles(landmarks, world_landmarks=None, image_width=None, image_height=None):
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
    # Image x/z use width units, while y is normalized by height. Put image
    # coordinates on a common scale before measuring angles. World landmarks
    # already use metres and must never be aspect-scaled.
    image_coords = landmarks
    if image_width and image_height:
        aspect = image_height / image_width
        image_coords = [{**lm, "y": lm["y"] * aspect} for lm in landmarks]
    coords = world_landmarks if world_landmarks else image_coords

    # Phase/window detection positions are deliberately taken from SCREEN space
    # (normalized image coords, y grows downward): "wrist above shoulder" and
    # "upper arm past horizontal" are camera-relative notions, and screen y is
    # stable across MediaPipe versions, whereas world-landmark y is meters
    # relative to the hip center with a different sign convention.
    try:
        left_wrist_y = float(landmarks[15]["y"])
        left_shoulder_y = float(landmarks[11]["y"])
        right_wrist_y = float(landmarks[16]["y"])
        right_shoulder_y = float(landmarks[12]["y"])
        left_elbow_y = float(landmarks[13]["y"])
        right_elbow_y = float(landmarks[14]["y"])
        nose_y = float(landmarks[0]["y"])
    except (KeyError, IndexError, TypeError):
        left_wrist_y = 1.0
        left_shoulder_y = 0.5
        right_wrist_y = 1.0
        right_shoulder_y = 0.5
        left_elbow_y = 0.75
        right_elbow_y = 0.75
        nose_y = 0.0

    return {
        "left_elbow": get_left_elbow_angle(landmarks, coords),
        "right_elbow": get_right_elbow_angle(landmarks, coords),
        "left_knee": get_left_knee_angle(landmarks, coords),
        "right_knee": get_right_knee_angle(landmarks, coords),
        "head_alignment": get_head_alignment(landmarks),
        "head_tilt": get_head_tilt(image_coords),
        "spine_tilt": get_spine_tilt(landmarks, coords),
        "shoulder_width": get_shoulder_width(landmarks),
        "left_wrist_y": left_wrist_y,
        "left_shoulder_y": left_shoulder_y,
        "right_wrist_y": right_wrist_y,
        "right_shoulder_y": right_shoulder_y,
        "left_elbow_y": left_elbow_y,
        "right_elbow_y": right_elbow_y,
        "nose_y": nose_y,
        # True when joint angles came from metric 3D world landmarks. Downstream
        # checks use this to skip 2D-foreshortening compensation.
        "is_world": bool(world_landmarks),
    }


def channel_values(angle_sequence, key):
    """Return finite measured values, including genuine zero-degree angles."""
    out = []
    for f in angle_sequence:
        v = f.get(key)
        if v is not None and np.isfinite(v):
            out.append(float(v))
    return out


def smooth_sequence(values, window=7, polyorder=2):
    """
    Savitzky-Golay smoother over a 1D angle series (MediaPipe jitter is a few
    degrees frame-to-frame). Sav-Gol fits a local polynomial, so unlike a moving
    average it suppresses noise without flattening the genuine peaks that the
    motion score and bowling-extension checks depend on.

    Missing entries stay missing and split the series into separate runs.
    Runs too short for the filter are returned unchanged.
    """
    n = len(values)
    if n == 0:
        return []

    from scipy.signal import savgol_filter

    # Missing frames are gaps in time. Do not concatenate the observations on
    # either side and smooth across a movement we never measured.
    out = [None] * n
    start = 0
    while start < n:
        if values[start] is None or not np.isfinite(values[start]):
            start += 1
            continue
        end = start
        while end < n and values[end] is not None and np.isfinite(values[end]):
            end += 1
        valid = np.asarray(values[start:end], dtype=float)
        if len(valid) >= window:
            smoothed = savgol_filter(valid, window_length=window, polyorder=polyorder)
        else:
            # Short runs cannot support the fit; preserve their real extrema.
            smoothed = valid
        out[start:end] = [float(np.clip(v, 0.0, 180.0)) for v in smoothed]
        start = end
    return out


def resample_channel(values, target_len=50, timestamps=None):
    """
    Resample a 1D sequence to ``target_len`` points via linear interpolation.
    Preserve original sample times when interpolating gaps; zero is a valid
    measurement. Optional timestamps are strictly increasing milliseconds.
    Returns a list of length ``target_len``
    (all zeros if there aren't at least two valid points).
    """
    valid_idx = [i for i, v in enumerate(values) if v is not None and np.isfinite(v)]
    valid = [float(values[i]) for i in valid_idx]
    if len(valid) < 2:
        return [0.0] * target_len
    times = np.asarray(timestamps if timestamps is not None else range(len(values)), dtype=float)
    xs = times[valid_idx]
    xt = np.linspace(times[0], times[-1], num=target_len)
    return list(np.interp(xt, xs, valid))


def calculate_distance(point_a, point_b):
    """Euclidean distance between two 3D points."""
    a = np.array(point_a, dtype=np.float32)
    b = np.array(point_b, dtype=np.float32)
    return float(np.linalg.norm(a - b))
