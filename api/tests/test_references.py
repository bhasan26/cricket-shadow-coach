import json

import geo
from dtw_utils import tolerance_score
from geo import get_ideal_angle_sequence, get_reference_tolerance, IDEAL_COVER_DRIVE
from shot_evaluator import score_phases, segment_phases


# ── geo.py loading ─────────────────────────────────────────────────────────

def test_no_recorded_reference_falls_back_to_hardcoded():
    assert get_ideal_angle_sequence("cover_drive") == IDEAL_COVER_DRIVE
    assert get_reference_tolerance("cover_drive") is None


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
