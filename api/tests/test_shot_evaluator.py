from eval import synthetic
from geo import get_phase_feedback
from shot_evaluator import (
    calculate_motion_score,
    evaluate_batting_biomechanics,
    evaluate_bowling_action,
    evaluate_shot,
)


def _batting_frame(le, re, lk, rk):
    return {"left_elbow": le, "right_elbow": re, "left_knee": lk, "right_knee": rk,
            "spine_tilt": 12.0, "head_alignment": 1.0}


def test_sitting_sequence_scores_low():
    seq = [_batting_frame(90, 92, 95, 96) for _ in range(40)]
    result = evaluate_shot(None, seq, shot_type="cover_drive")
    assert result["score"] <= 30


def test_motion_score_monotonic_in_range():
    small = [_batting_frame(150 + (i % 2), 150, 150, 150) for i in range(20)]
    large = [_batting_frame(120 + i * 2, 150, 130 + i, 150) for i in range(20)]
    small_score, _ = calculate_motion_score(small)
    large_score, _ = calculate_motion_score(large)
    assert large_score >= small_score


def _bowling_frame(left_elbow, right_elbow, wrist_above=True):
    # wrist above shoulder => wrist_y < shoulder_y (delivery phase)
    wy = 0.2 if wrist_above else 0.8
    return {
        "left_elbow": left_elbow, "right_elbow": right_elbow,
        "left_knee": 170, "right_knee": 170, "spine_tilt": 10.0,
        "left_wrist_y": wy, "left_shoulder_y": 0.5,
        "right_wrist_y": wy, "right_shoulder_y": 0.5,
        "nose_y": 0.3, "shoulder_width": 0.25,
    }


def test_bowling_detects_high_variance_arm():
    # Right elbow swings a lot; left stays constant -> right arm is the bowling arm.
    seq = []
    for i in range(20):
        seq.append(_bowling_frame(left_elbow=150, right_elbow=100 + (i % 2) * 70))
    result = evaluate_bowling_action(seq)
    assert "Right-Arm" in result["feedback"]
    assert result["shot_type"] == "bowling_action"
    assert result["disclaimer"]  # indicative-screen disclaimer present


def _delivery_frame(elbow_angle, elbow_y, wrist_y, is_world=True):
    """Right-arm bowling frame with explicit arm geometry (screen y, down-positive)."""
    return {
        "left_elbow": 150, "right_elbow": elbow_angle,
        "left_knee": 170, "right_knee": 170, "spine_tilt": 10.0,
        "left_wrist_y": 0.8, "left_shoulder_y": 0.5, "left_elbow_y": 0.65,
        "right_wrist_y": wrist_y, "right_shoulder_y": 0.5, "right_elbow_y": elbow_y,
        "nose_y": 0.3, "shoulder_width": 0.25, "is_world": is_world,
    }


def _windowed_action(window_angles):
    """Gather (wild elbow, arm down) → delivery window → follow-through."""
    seq = []
    # Gather: arm below shoulder, elbow angle flapping 90↔170. Must NOT count.
    for i in range(10):
        seq.append(_delivery_frame(90 + (i % 2) * 80, elbow_y=0.7, wrist_y=0.85))
    # Delivery: elbow crosses above the shoulder, wrist rising to its peak.
    n = len(window_angles)
    for j, ang in enumerate(window_angles):
        elbow_y = 0.45 - 0.02 * j          # above shoulder (0.5) from the start
        wrist_y = 0.40 - 0.03 * j          # wrist above elbow, peaks at last frame
        seq.append(_delivery_frame(ang, elbow_y=elbow_y, wrist_y=wrist_y))
    # Follow-through: arm comes down, elbow angle wild again. Must NOT count.
    for i in range(8):
        seq.append(_delivery_frame(80 + (i % 2) * 90, elbow_y=0.7, wrist_y=0.75))
    return seq, n


def test_bowling_window_ignores_gather_and_followthrough():
    # Arm locked (168-171°) through the delivery window, wild outside it.
    seq, _ = _windowed_action([168, 169, 170, 171, 170, 169, 170, 171, 170, 169])
    result = evaluate_bowling_action(seq, is_right_handed=True)
    assert result["angle_scores"]["bowling_arm_extension"] < 5.0
    assert result["is_good_shot"] is True
    assert result["confidence"] == "normal"


def test_bowling_window_detects_scripted_extension():
    # 25° of extension scripted inside the window (145° → 170°).
    seq, _ = _windowed_action([145 + 2.5 * j for j in range(11)])
    result = evaluate_bowling_action(seq, is_right_handed=True)
    ext = result["angle_scores"]["bowling_arm_extension"]
    assert abs(ext - 25.0) <= 5.0
    assert result["is_good_shot"] is False
    assert "not an official assessment" in result["feedback"]


def test_bowling_without_elbow_y_falls_back_low_confidence():
    # Legacy payloads (no elbow_y) can't isolate the ICC window.
    seq = [_bowling_frame(left_elbow=150, right_elbow=100 + (i % 2) * 70) for i in range(20)]
    result = evaluate_bowling_action(seq)
    assert result["confidence"] == "low"


def test_bowling_never_subtracts_an_arbitrary_perspective_offset():
    # Geometry uncertainty reduces confidence, not the measured extension.
    def seq(is_world):
        frames = []
        for i in range(20):
            f = _bowling_frame(left_elbow=150, right_elbow=130 + (i % 2) * 40)
            f["is_world"] = is_world
            frames.append(f)
        return frames

    ext_2d = evaluate_bowling_action(seq(False))["angle_scores"]["bowling_arm_extension"]
    ext_3d = evaluate_bowling_action(seq(True))["angle_scores"]["bowling_arm_extension"]
    assert ext_3d == ext_2d
    assert evaluate_bowling_action(seq(False))["confidence"] == "low"


def test_bowling_flexion_is_not_counted_as_extension():
    seq = synthetic.bowling_action(extension_deg=25)
    for frame in seq:
        frame["right_elbow"] = 325 - frame["right_elbow"]
    assert evaluate_bowling_action(seq)["angle_scores"]["bowling_arm_extension"] == 0


def test_real_scoring_entrypoint_keeps_gather_outside_delivery_measurement():
    seq, _ = _windowed_action([145 + 2.5 * i for i in range(11)])
    measured = evaluate_shot(None, seq, shot_type="bowling_action")
    assert abs(measured["angle_scores"]["bowling_arm_extension"] - 25) < 2


def test_motion_score_is_invariant_when_frames_are_duplicated():
    import numpy as np

    seq = [_batting_frame(100 + 50 * np.sin(i * 0.9), 150, 165, 165) for i in range(25)]
    duplicated = [frame for frame in seq for _ in range(4)]
    assert calculate_motion_score(seq)[0] == calculate_motion_score(duplicated)[0]


def test_upright_frames_are_included_in_average_spine_tilt():
    seq = synthetic.bowling_action(extension_deg=5)
    for frame in seq:
        frame["spine_tilt"] = 0
    seq[-1]["spine_tilt"] = 26
    result = evaluate_bowling_action(seq)
    assert abs(result["angle_scores"]["spine_tilt"] - 26 / len(seq)) < 1e-6


def test_later_delivery_cannot_change_first_delivery_window():
    first = synthetic.bowling_action(extension_deg=5)
    second = synthetic.bowling_action(extension_deg=40)
    for frame in second:
        frame["right_wrist_y"] -= 0.2  # Higher wrist in a later, separate action.
    result = evaluate_bowling_action(first + second)
    assert abs(result["angle_scores"]["bowling_arm_extension"] - 5) <= 2


def test_missing_tracking_is_not_turned_into_a_technique_score():
    seq = synthetic.perfect_replay("cover_drive")
    for frame in seq[:30]:
        for key in ("left_elbow", "right_elbow", "left_knee", "right_knee"):
            frame[key] = None
    result = evaluate_shot(None, seq)
    assert result["confidence"] == "low"
    assert result["angle_scores"] == {}
    assert result["tracking_quality"] == 25


def test_bowling_delivery_phase_filtering_uses_raised_arm():
    # Only frames with the wrist above the shoulder should drive the extension read.
    seq = []
    for i in range(20):
        raised = i >= 10
        # Big elbow swing only while the arm is raised.
        re = 100 + (i % 2) * 60 if raised else 165
        seq.append(_bowling_frame(left_elbow=150, right_elbow=re, wrist_above=raised))
    result = evaluate_bowling_action(seq)
    assert "extension" in result["feedback"].lower()
    assert result["angle_scores"]["bowling_arm_extension"] >= 0


# ── coaching feedback targeting ────────────────────────────────────────────

def test_phase_feedback_targets_the_worst_phase():
    assert get_phase_feedback(
        {"backswing_phase": 20, "impact_phase": 90, "follow_through_phase": 88}
    ) == "Rotate your shoulders early"
    assert get_phase_feedback(
        {"backswing_phase": 95, "impact_phase": 31, "follow_through_phase": 90}
    ) == "Head steady, eyes on the ball"
    assert get_phase_feedback(
        {"backswing_phase": 92, "impact_phase": 88, "follow_through_phase": 12}
    ) == "Complete your follow-through naturally"


def test_phase_feedback_falls_back_when_unsegmentable():
    # No recognizable swing to point at — a setup cue, not a random phase tip.
    assert get_phase_feedback({}) == "Keep your feet shoulder-width apart and relaxed"
    assert get_phase_feedback({"left_elbow": 40.0}) == (
        "Keep your feet shoulder-width apart and relaxed"
    )


def test_phase_tip_survives_the_feedback_cap():
    # Only three items are joined into `feedback`; the phase tip must outrank
    # the generic per-angle advice or the user never sees it.
    tips = {
        "Rotate your shoulders early",
        "Head steady, eyes on the ball",
        "Complete your follow-through naturally",
        "Keep your feet shoulder-width apart and relaxed",
    }
    result = evaluate_shot(
        None, synthetic.player_replay("cover_drive", noise=3.0, offset=5.0),
        shot_type="cover_drive",
    )
    assert any(part in tips for part in result["feedback"].split(" | "))


def test_head_tilt_warning_fires_and_is_not_dead_code():
    # Regression: this compared `head_alignment` (bounded to [-1, 1]) against
    # 3.0, so it could never fire for any input.
    def seq(tilt):
        return [{"left_elbow": 150.0, "right_elbow": 150.0,
                 "left_knee": 170.0, "right_knee": 170.0,
                 "head_tilt": tilt} for _ in range(20)]

    level = evaluate_batting_biomechanics(seq(2.0))
    cocked = evaluate_batting_biomechanics(seq(35.0))
    assert not any("Head Alignment" in f for f in level)
    assert any("Head Alignment" in f for f in cocked)


# ── bowling elbow extension ────────────────────────────────────────────────

def test_extension_matches_ground_truth():
    for true_ext in (0.0, 5.0, 15.0, 20.0, 30.0, 45.0):
        seq = synthetic.bowling_action(extension_deg=true_ext)
        measured = evaluate_bowling_action(seq)["angle_scores"]["bowling_arm_extension"]
        assert abs(measured - true_ext) <= 2.0, f"{true_ext}: measured {measured}"


def test_short_delivery_window_does_not_lose_the_peak():
    # Regression: scipy.signal.medfilt zero-pads, dragging the last two samples
    # of the window down and discarding peak extension. On a 6-frame window that
    # reported 60% of truth, so a 25° action read as 15° and passed as legal.
    result = evaluate_bowling_action(
        synthetic.bowling_action(extension_deg=25.0, n_delivery=6)
    )
    assert result["angle_scores"]["bowling_arm_extension"] >= 23.0
    assert result["is_good_shot"] is False


def test_legality_boundary_sits_at_15_degrees():
    legal = evaluate_bowling_action(synthetic.bowling_action(extension_deg=14.0))
    illegal = evaluate_bowling_action(synthetic.bowling_action(extension_deg=20.0))
    assert legal["is_good_shot"] is True
    assert illegal["is_good_shot"] is False


def test_gather_extension_is_not_counted():
    # Rule 11.1 measures only from upper-arm-horizontal to release; a 40°
    # excursion during the gather is legal and must be ignored entirely.
    result = evaluate_bowling_action(
        synthetic.bowling_action(extension_deg=5.0, gather_extension_deg=40.0)
    )
    assert result["angle_scores"]["bowling_arm_extension"] <= 7.0
    assert result["is_good_shot"] is True
