from shot_evaluator import (
    calculate_motion_score,
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


def test_bowling_leniency_applies_only_to_2d_angles():
    # Identical elbow swing, measured once from legacy 2D landmarks and once
    # from 3D world landmarks. The 20° foreshortening leniency must only be
    # subtracted in the 2D case.
    def seq(is_world):
        frames = []
        for i in range(20):
            f = _bowling_frame(left_elbow=150, right_elbow=130 + (i % 2) * 40)
            f["is_world"] = is_world
            frames.append(f)
        return frames

    ext_2d = evaluate_bowling_action(seq(False))["angle_scores"]["bowling_arm_extension"]
    ext_3d = evaluate_bowling_action(seq(True))["angle_scores"]["bowling_arm_extension"]
    assert ext_3d > ext_2d
    assert abs(ext_3d - ext_2d - 20.0) < 1e-6


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
