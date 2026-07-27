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


# ─── CONSTRAINED ALIGNMENT ──────────────────────────────────────────────────
# Unconstrained DTW can warp a series arbitrarily to match a template, so any
# swing eventually "fits" any reference and timing stops mattering. A
# Sakoe-Chiba band restricts each user frame to align within ±BAND reference
# frames of the diagonal, which preserves tempo as a real signal. Sequences are
# already resampled to a fixed length before scoring, so the band only limits
# LOCAL warping, not overall recording duration.
SAKOE_CHIBA_BAND = 5

# Reference tolerance bands are built from broadcast footage of different
# players at different camera angles, so their per-frame std reaches 40°+ —
# wider than the difference BETWEEN shots, which made every shot score ~95
# against every reference. Capping the band keeps genuine variation tolerated
# while restoring discrimination (see api/eval/run_eval.py cross-shot cases).
MAX_TOLERANCE_STD = 8.0

# Below this per-channel std the user's angle series is essentially flat
# (untracked joint or no movement), so its shape carries no information.
MIN_SHAPE_VARIATION = 2.0


def constrained_dtw_path(user_sequence, ref_sequence, band=SAKOE_CHIBA_BAND):
    """
    DTW alignment path under a Sakoe-Chiba band, for 1D angle series of any
    (possibly different) lengths. The band is measured around the diagonal that
    maps the user series onto the reference, so it stays meaningful when the two
    have different lengths.

    Returns a list of (user_index, ref_index) pairs, or [] when no path exists.
    """
    u = np.asarray(user_sequence, dtype=np.float64)
    r = np.asarray(ref_sequence, dtype=np.float64)
    n, k = len(u), len(r)
    if n < 2 or k < 2:
        return []
    band = max(2, band)

    cost = np.full((n + 1, k + 1), np.inf)
    cost[0, 0] = 0.0
    for i in range(1, n + 1):
        centre = round(i * k / n)
        for j in range(max(1, centre - band), min(k, centre + band) + 1):
            best = min(cost[i - 1, j], cost[i, j - 1], cost[i - 1, j - 1])
            cost[i, j] = abs(u[i - 1] - r[j - 1]) + best
    if not np.isfinite(cost[n, k]):
        return []

    path = []
    i, j = n, k
    while i > 0 and j > 0:
        path.append((i - 1, j - 1))
        step = min(cost[i - 1, j], cost[i, j - 1], cost[i - 1, j - 1])
        if step == cost[i - 1, j - 1]:
            i, j = i - 1, j - 1
        elif step == cost[i - 1, j]:
            i -= 1
        else:
            j -= 1
    return path[::-1]


def tolerance_score(user_sequence, ref_mean, ref_std, band=SAKOE_CHIBA_BAND,
                    std_cap=MAX_TOLERANCE_STD):
    """
    Score a user angle series against a recorded reference with per-frame
    tolerance bands (from api/tools/build_reference.py).

    The user series is DTW-aligned to the reference mean under a Sakoe-Chiba
    band; each matched step is scored by its deviation in units of that frame's
    std-dev (capped at ``std_cap``): within 1 std = full marks, scaling linearly
    to 0 at 3 std. Returns 0-100.
    """
    if not user_sequence or not ref_mean or len(ref_mean) != len(ref_std):
        return 0.0
    path = constrained_dtw_path(user_sequence, ref_mean, band)
    if not path:
        # Degenerate lengths — fall back to unconstrained alignment rather than
        # reporting a zero the user hasn't earned.
        try:
            _, path = fastdtw(
                np.array(user_sequence, dtype=np.float32).reshape(-1, 1),
                np.array(ref_mean, dtype=np.float32).reshape(-1, 1),
                dist=euclidean,
            )
        except Exception as e:
            print(f"DTW calculation error: {e}")
            return 0.0
    if not path:
        return 0.0

    total = 0.0
    for i, j in path:
        std = float(ref_std[j])
        if std_cap:
            std = min(std, float(std_cap))
        std = max(std, 1e-6)
        z = abs(float(user_sequence[i]) - float(ref_mean[j])) / std
        if z <= 1.0:
            total += 1.0
        elif z < 3.0:
            total += (3.0 - z) / 2.0
    return float(100.0 * total / len(path))


def shape_match_score(user_sequence, ref_mean, band=SAKOE_CHIBA_BAND, k=DTW_SCORE_K):
    """
    How closely the SHAPE of a user angle series follows a reference, ignoring
    any constant offset — 0-100.

    Absolute joint angles carry a large per-player bias (build, stance, camera),
    which swamps the difference between shots: at a 25° personal offset,
    absolute matching picks the right shot only 20% of the time. Mean-removing
    each series first makes the comparison depend on the motion pattern alone,
    which identifies the shot correctly across noise, tempo and offset.

    Returns ``None`` when the user series is too flat for its shape to mean
    anything (untracked joint, or no movement).
    """
    if not user_sequence or not ref_mean:
        return None
    u = np.asarray(user_sequence, dtype=np.float64)
    r = np.asarray(ref_mean, dtype=np.float64)
    if u.std() < MIN_SHAPE_VARIATION or r.std() < MIN_SHAPE_VARIATION:
        return None
    u = u - u.mean()
    r = r - r.mean()
    path = constrained_dtw_path(u, r, band)
    if not path:
        return None
    deviation = float(np.mean([abs(u[i] - r[j]) for i, j in path]))
    return float(max(0.0, 100.0 - deviation * k))


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
