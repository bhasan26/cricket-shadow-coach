import math

from angle_utils import (
    calculate_angle,
    get_left_elbow_angle,
    extract_shot_angles,
    smooth_sequence,
    resample_channel,
    channel_values,
)


def _landmarks(overrides):
    """33 landmarks defaulting to visible origin; overrides is {index: dict}."""
    lms = [{"x": 0.0, "y": 0.0, "z": 0.0, "visibility": 1.0} for _ in range(33)]
    for i, d in overrides.items():
        lms[i] = {**lms[i], **d}
    return lms


def test_calculate_angle_known_values():
    assert calculate_angle((1, 0, 0), (0, 0, 0), (1, 0, 0)) == 0.0
    assert math.isclose(calculate_angle((0, 1, 0), (0, 0, 0), (1, 0, 0)), 90.0, abs_tol=1e-3)
    assert math.isclose(calculate_angle((-1, 0, 0), (0, 0, 0), (1, 0, 0)), 180.0, abs_tol=1e-3)


def test_left_elbow_90_degrees():
    lms = _landmarks({
        11: {"x": 0, "y": 1, "z": 0},   # shoulder
        13: {"x": 0, "y": 0, "z": 0},   # elbow (vertex)
        15: {"x": 1, "y": 0, "z": 0},   # wrist
    })
    assert math.isclose(get_left_elbow_angle(lms), 90.0, abs_tol=1e-3)


def test_low_visibility_gates_to_none():
    lms = _landmarks({
        11: {"x": 0, "y": 1, "z": 0, "visibility": 0.2},  # below 0.5 threshold
        13: {"x": 0, "y": 0, "z": 0},
        15: {"x": 1, "y": 0, "z": 0},
    })
    assert get_left_elbow_angle(lms) is None


def test_extract_shot_angles_uses_world_landmarks():
    # 2D landmarks make a straight arm (180°); world landmarks make 90°.
    two_d = _landmarks({11: {"x": -1, "y": 0}, 13: {"x": 0, "y": 0}, 15: {"x": 1, "y": 0}})
    world = _landmarks({11: {"x": 0, "y": 1}, 13: {"x": 0, "y": 0}, 15: {"x": 1, "y": 0}})
    angles = extract_shot_angles(two_d, world_landmarks=world)
    assert math.isclose(angles["left_elbow"], 90.0, abs_tol=1e-3)


def test_smooth_sequence_preserves_none_and_length():
    # None means "joint untracked" — smoothing must not invent a value there.
    out = smooth_sequence([10, None, 10, 10, 10])
    assert len(out) == 5
    assert out[1] is None
    assert all(o is not None for i, o in enumerate(out) if i != 1)


def test_smooth_sequence_savgol_reduces_jitter_keeps_peak():
    import numpy as np

    rng = np.random.default_rng(42)
    t = np.linspace(0, np.pi, 60)
    clean = 90 + 60 * np.sin(t)          # swing peaking at 150°
    noisy = clean + rng.normal(0, 2.5, 60)  # ±2.5° MediaPipe-like jitter
    out = np.array(smooth_sequence(list(noisy)))
    # Noise reduced...
    assert np.std(out - clean) < np.std(noisy - clean) * 0.7
    # ...without clipping the genuine peak by more than ~3°.
    assert abs(float(out.max()) - clean.max()) < 3.0


def test_extract_shot_angles_sets_is_world_flag():
    lms = _landmarks({})
    assert extract_shot_angles(lms)["is_world"] is False
    assert extract_shot_angles(lms, world_landmarks=lms)["is_world"] is True


def test_resample_channel_fixed_length():
    out = resample_channel([10, 20, 30], target_len=50)
    assert len(out) == 50
    assert math.isclose(out[0], 10, abs_tol=1e-6)
    assert math.isclose(out[-1], 30, abs_tol=1e-6)


def test_resample_channel_insufficient_valid_points():
    assert resample_channel([None, 0], target_len=10) == [0.0] * 10


def test_channel_values_filters_none_and_zero():
    seq = [{"left_elbow": 100}, {"left_elbow": None}, {"left_elbow": 0}, {"left_elbow": 120}]
    assert channel_values(seq, "left_elbow") == [100.0, 120.0]
