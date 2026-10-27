import math

import pytest

from angle_utils import (
    calculate_angle,
    channel_values,
    extract_shot_angles,
    get_head_tilt,
    get_left_elbow_angle,
    resample_channel,
    smooth_sequence,
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


def test_channel_values_filters_missing_but_preserves_zero():
    seq = [{"left_elbow": 100}, {"left_elbow": None}, {"left_elbow": 0}, {"left_elbow": 120}]
    assert channel_values(seq, "left_elbow") == [100.0, 0.0, 120.0]


def test_zero_length_bone_is_missing_not_a_zero_degree_measurement():
    assert calculate_angle((0, 0, 0), (0, 0, 0), (1, 0, 0)) is None
    assert calculate_angle((1, 0, 0), (0, 0, 0), (2, 0, 0)) == 0


def test_resampling_preserves_missing_frame_positions_and_zero_angles():
    assert resample_channel([10, None, 30, 40], 4) == pytest.approx([10, 20, 30, 40])
    assert resample_channel([0, 10, 20], 3) == pytest.approx([0, 10, 20])


def test_resampling_uses_real_capture_times():
    assert resample_channel([10, 20, 40], 4, timestamps=[0, 100, 300]) == pytest.approx([10, 20, 30, 40])


def test_smoothing_does_not_join_opposite_sides_of_a_tracking_gap():
    values = [10] * 8 + [None] * 5 + [100] * 8
    smoothed = smooth_sequence(values)
    assert smoothed[:8] == pytest.approx([10] * 8)
    assert smoothed[8:13] == [None] * 5
    assert smoothed[13:] == pytest.approx([100] * 8)


@pytest.mark.parametrize("width,height", [(1000, 1000), (1280, 720), (720, 1280)])
def test_image_geometry_corrects_for_aspect_ratio(width, height):
    # Pixel-space vectors (100,100) and (100,0) form 45 degrees, in every
    # aspect ratio. Treating x/y normalizations as equal units changes it.
    lms = _landmarks({
        11: {"x": 100 / width, "y": 100 / height},
        13: {"x": 0, "y": 0}, 15: {"x": 100 / width, "y": 0},
    })
    measured = extract_shot_angles(lms, image_width=width, image_height=height)
    assert measured["left_elbow"] == pytest.approx(45)
    assert measured["is_world"] is False


def test_world_geometry_is_not_aspect_scaled():
    lms = _landmarks({11: {"x": 1, "y": 1}, 13: {"x": 0, "y": 0}, 15: {"x": 1, "y": 0}})
    measured = extract_shot_angles(lms, world_landmarks=lms, image_width=1280, image_height=720)
    assert measured["left_elbow"] == pytest.approx(45)
    assert measured["is_world"] is True


# ── head tilt ──────────────────────────────────────────────────────────────

def _head_landmarks(head_cock_deg=0.0, camera_roll_deg=0.0):
    """Ears and shoulders with the head cocked, then the whole image rolled."""
    def rolled(x, y):
        r = math.radians(camera_roll_deg)
        return {"x": 0.5 + (x * math.cos(r) - y * math.sin(r)),
                "y": 0.5 + (x * math.sin(r) + y * math.cos(r)),
                "z": 0.0, "visibility": 0.9}

    h = math.radians(head_cock_deg)
    return _landmarks({
        7: rolled(-0.05 * math.cos(h), -0.20 - 0.05 * math.sin(h)),   # left ear
        8: rolled(0.05 * math.cos(h), -0.20 + 0.05 * math.sin(h)),    # right ear
        11: rolled(-0.10, 0.0),
        12: rolled(0.10, 0.0),
    })


def test_head_tilt_measures_cock_in_degrees():
    assert get_head_tilt(_head_landmarks(0.0)) == pytest.approx(0.0, abs=0.5)
    assert get_head_tilt(_head_landmarks(25.0)) == pytest.approx(25.0, abs=0.5)


def test_head_tilt_ignores_camera_roll():
    # A tilted phone rotates ears and shoulders together — that is not a head
    # tilt, and measuring against the shoulder line cancels it.
    for cock in (0.0, 25.0):
        level = get_head_tilt(_head_landmarks(cock, camera_roll_deg=0.0))
        rolled = get_head_tilt(_head_landmarks(cock, camera_roll_deg=30.0))
        assert level == pytest.approx(rolled, abs=0.5)


def test_head_tilt_none_when_ears_not_visible():
    lms = _head_landmarks(25.0)
    lms[7]["visibility"] = 0.1
    assert get_head_tilt(lms) is None


def test_extract_shot_angles_exposes_head_tilt():
    assert "head_tilt" in extract_shot_angles(_head_landmarks(0.0))
