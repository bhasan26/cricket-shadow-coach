import itertools
import json

import geo
from dtw_utils import (
    constrained_dtw_path,
    shape_match_score,
    tolerance_score,
)
from eval import synthetic
from geo import IDEAL_COVER_DRIVE, get_ideal_angle_sequence, get_reference_tolerance
from shot_evaluator import (
    MAX_BUILD_CALIBRATION,
    build_calibration_offset,
    evaluate_shot,
    identify_shot,
    score_phases,
    segment_phases,
)

# ── geo.py loading ─────────────────────────────────────────────────────────

def test_shot_type_without_reference_falls_back_to_hardcoded():
    # Unknown shot types have no recorded reference and fall back to the
    # hardcoded cover-drive sequence with no tolerance bands.
    assert get_ideal_angle_sequence("nonexistent_shot") == IDEAL_COVER_DRIVE
    assert get_reference_tolerance("nonexistent_shot") is None


def test_recorded_references_loaded_for_app_shots():
    # Real references (built from the cricketshot research dataset) exist for
    # all five batting shot types and carry per-frame tolerance bands.
    for shot in ("cover_drive", "straight_drive", "pull_shot",
                 "defensive_block", "flick_shot"):
        seq = get_ideal_angle_sequence(shot)
        tol = get_reference_tolerance(shot)
        assert len(seq) == 32, shot
        assert tol and "left_elbow" in tol and len(tol["left_elbow"]) == 32, shot


def test_loader_reads_reference_json(tmp_path, monkeypatch):
    ref_dir = tmp_path / "cover_drive"
    ref_dir.mkdir()
    n = 32
    reference = {
        "shot_type": "cover_drive",
        "num_takes": 3,
        "frames": n,
        "channels": {
            "left_elbow": {"mean": [150.0] * n, "std": [4.0] * n},
            "right_elbow": {"mean": [160.0] * n, "std": [3.0] * n},
        },
    }
    (ref_dir / "reference.json").write_text(json.dumps(reference))

    monkeypatch.setattr(geo, "REFERENCES_DIR", str(tmp_path))
    loaded = geo._load_recorded_references()
    assert "cover_drive" in loaded
    assert len(loaded["cover_drive"]["sequence"]) == n
    assert loaded["cover_drive"]["sequence"][0]["left_elbow"] == 150.0
    assert loaded["cover_drive"]["tolerance"]["right_elbow"] == [3.0] * n


# ── tolerance-band scoring ─────────────────────────────────────────────────

def test_tolerance_score_bands():
    mean = [150.0] * 20
    std = [5.0] * 20
    perfect = tolerance_score([150.0] * 20, mean, std)
    within_1_std = tolerance_score([154.0] * 20, mean, std)  # 0.8 std
    at_2_std = tolerance_score([160.0] * 20, mean, std)
    beyond_3_std = tolerance_score([170.0] * 20, mean, std)  # 4 std
    assert perfect == 100.0
    assert within_1_std == 100.0  # inside the band = full marks
    assert 40.0 <= at_2_std <= 60.0  # halfway between 1 and 3 std
    assert beyond_3_std == 0.0


def test_tolerance_score_band_width_matters():
    # Same deviation counts more where technique should be consistent (tight std).
    mean = [150.0] * 20
    loose = tolerance_score([158.0] * 20, mean, [8.0] * 20)   # 1 std → full
    tight = tolerance_score([158.0] * 20, mean, [3.0] * 20)   # 2.7 std → low
    assert loose > tight


# ── phase segmentation ─────────────────────────────────────────────────────

def _swing_series():
    """Stance → flex to 120 (backswing) → extend to 175 (impact) → settle."""
    stance = [168.0] * 8
    backswing = [168 - 6 * i for i in range(1, 9)]     # down to 120
    downswing = [120 + 7 * i for i in range(1, 9)]     # up to 176
    follow = [176 - 2 * i for i in range(1, 9)]
    return stance + backswing + downswing + follow


def test_segment_phases_orders_correctly():
    phases = segment_phases(_swing_series())
    assert phases is not None
    assert phases["backswing"][0] < phases["backswing"][1]
    assert phases["backswing"][1] <= phases["impact"][1]
    assert phases["impact"][0] <= phases["follow_through"][0]


def test_segment_phases_rejects_static_series():
    assert segment_phases([160.0] * 40) is None


def test_score_phases_high_for_matching_sequences():
    series = _swing_series()
    frames = [
        {"left_elbow": v, "right_elbow": v, "left_knee": 140.0, "right_knee": 140.0}
        for v in series
    ]
    scores = score_phases(frames, frames, is_right_handed=True)
    assert scores  # phases detected
    for key, val in scores.items():
        assert key.endswith("_phase")
        assert val >= 90.0


# ── constrained alignment & shot identification ────────────────────────────

def test_constrained_dtw_path_covers_both_series():
    path = constrained_dtw_path(list(range(50)), list(range(32)))
    assert path
    assert path[0] == (0, 0)
    assert path[-1] == (49, 31)
    # Monotonic in both indices — a valid warping path.
    assert all(b[0] >= a[0] and b[1] >= a[1] for a, b in itertools.pairwise(path))


def test_band_limits_warping():
    # A spike late in the user series cannot be warped onto an early reference
    # spike once the band is tight, so the score drops.
    ref = [100.0] * 10 + [160.0] * 10 + [100.0] * 30
    user = [100.0] * 30 + [160.0] * 10 + [100.0] * 10  # same spike, much later
    std = [4.0] * len(ref)
    loose = tolerance_score(user, ref, std, band=45)
    tight = tolerance_score(user, ref, std, band=3)
    assert loose > tight


def test_std_cap_prevents_unbounded_tolerance():
    # A 30° std band would otherwise give full marks to a 25° deviation.
    mean = [150.0] * 20
    uncapped = tolerance_score([175.0] * 20, mean, [30.0] * 20, std_cap=None)
    capped = tolerance_score([175.0] * 20, mean, [30.0] * 20)
    assert uncapped == 100.0
    assert capped < 20.0


def test_shape_match_ignores_constant_offset():
    ref = [100.0 + 30.0 * (i % 10) / 9.0 for i in range(40)]
    shifted = [v + 25.0 for v in ref]
    assert shape_match_score(shifted, ref) > 95.0


def test_shape_match_none_for_flat_series():
    assert shape_match_score([150.0] * 40, [150.0] * 40) is None


def test_identify_shot_names_the_shot_played():
    # A clean replay of each reference must identify as that shot, not another.
    for shot in ("cover_drive", "straight_drive", "pull_shot",
                 "defensive_block", "flick_shot"):
        seq = synthetic.perfect_replay(shot)
        match = identify_shot(seq)
        assert match is not None, shot
        assert match["best"] == shot, f"{shot} identified as {match['best']}"
        assert match["confident"], shot


def test_wrong_shot_selection_is_penalised():
    # Playing a clean pull shot while "cover drive" is selected must not score
    # like a good cover drive — before shot identification this returned 98.
    seq = synthetic.perfect_replay("pull_shot")
    result = evaluate_shot(None, seq, shot_type="cover_drive")
    assert result["score"] <= 50
    assert result["shot_match"]["best"] == "pull_shot"
    assert result["shot_match"]["matches_selection"] is False
    assert "Pull Shot" in result["feedback"]


def test_correct_shot_is_not_penalised():
    seq = synthetic.perfect_replay("cover_drive")
    result = evaluate_shot(None, seq, shot_type="cover_drive")
    assert result["score"] >= 90
    assert result["shot_match"]["matches_selection"] is True


# ── body-build calibration ─────────────────────────────────────────────────

def _offset_replay(shot, offset=0.0, fault_key=None, fault_deg=0.0):
    seq = synthetic.perfect_replay(shot)
    for f in seq:
        for k in ("left_elbow", "right_elbow", "left_knee", "right_knee"):
            f[k] = f[k] + offset
        if fault_key:
            f[fault_key] = f[fault_key] + fault_deg
    return seq


def test_build_offset_is_forgiven():
    # Same shot, played correctly, by someone whose joints all read 20° off the
    # broadcast references. Without calibration this lost ~27 points.
    seq = _offset_replay("cover_drive", offset=20.0)
    result = evaluate_shot(None, seq, shot_type="cover_drive")
    assert result["score"] >= 90
    assert result["build_calibration"] > 5.0


def test_single_joint_fault_is_not_calibrated_away():
    # One joint consistently wrong is technique, not anatomy: the common-mode
    # correction must stay near zero so the fault still costs marks.
    clean = evaluate_shot(None, _offset_replay("cover_drive"), shot_type="cover_drive")
    faulty_seq = _offset_replay("cover_drive", fault_key="left_elbow", fault_deg=30.0)
    faulty = evaluate_shot(None, faulty_seq, shot_type="cover_drive")
    assert abs(faulty["build_calibration"]) < 3.0
    assert faulty["score"] < clean["score"]
    assert faulty["angle_scores"]["left_elbow"] < clean["angle_scores"]["left_elbow"]


def test_calibration_is_clamped():
    # A 40° offset is beyond anatomy — only MAX_BUILD_CALIBRATION is removed.
    seq = _offset_replay("cover_drive", offset=40.0)
    result = evaluate_shot(None, seq, shot_type="cover_drive")
    assert abs(result["build_calibration"]) <= MAX_BUILD_CALIBRATION


def test_calibration_needs_most_joints():
    # Too few tracked channels to separate common mode from a single fault.
    channels = {"left_elbow": [150.0] * 50}
    ideal = get_ideal_angle_sequence("cover_drive")
    assert build_calibration_offset(channels, ideal) == 0.0
