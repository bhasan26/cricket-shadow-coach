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


def test_smooth_sequence_handles_none_and_length():
    out = smooth_sequence([10, None, 10, 10, 10], window=3)
    assert len(out) == 5
    assert all(o is not None for o in out)


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
