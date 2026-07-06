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
