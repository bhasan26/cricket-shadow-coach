import random

import pytest
from fastapi.testclient import TestClient

import index

client = TestClient(index.app)


def _frame():
    return [{"x": random.random(), "y": random.random(), "z": random.random(), "visibility": 1.0}
            for _ in range(33)]


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_shots_list():
    r = client.get("/api/shots")
    assert r.status_code == 200
    assert "cover_drive" in r.json()


def test_malformed_landmarks_returns_422():
    bad = {"shot_sequence": [[{"x": 0, "y": 0, "z": 0}]], "shot_type": "cover_drive"}
    assert client.post("/api/analyze-shot", json=bad).status_code == 422


def test_sequence_too_long_returns_422():
    payload = {"shot_sequence": [_frame() for _ in range(601)], "shot_type": "cover_drive"}
    assert client.post("/api/analyze-shot", json=payload).status_code == 422


def test_happy_path_returns_score():
    payload = {"shot_sequence": [_frame() for _ in range(12)], "shot_type": "cover_drive"}
    r = client.post("/api/analyze-shot", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert "score" in body
    assert "tracking_quality" in body


@pytest.mark.parametrize("world", [[], [[]], [_frame(), _frame()]])
def test_world_landmarks_must_be_complete_and_aligned(world):
    payload = {"shot_sequence": [_frame()], "world_landmarks": world}
    assert client.post("/api/analyze-shot", json=payload).status_code == 422


def test_world_landmarks_are_bounded():
    payload = {"shot_sequence": [], "world_landmarks": [_frame()] * 601}
    assert client.post("/api/analyze-shot", json=payload).status_code == 422


def test_aligned_world_landmarks_are_accepted():
    frames = [_frame() for _ in range(12)]
    payload = {"shot_sequence": frames, "world_landmarks": frames}
    assert client.post("/api/analyze-shot", json=payload).status_code == 200


@pytest.mark.parametrize("visibility", [-0.1, 1.1])
def test_out_of_range_visibility_is_rejected(visibility):
    frame = _frame()
    frame[0]["visibility"] = visibility
    assert client.post("/api/analyze-shot", json={"shot_sequence": [frame]}).status_code == 422


@pytest.mark.parametrize("coordinate", ["NaN", "Infinity", "-Infinity"])
def test_non_finite_coordinates_are_rejected(coordinate):
    frame = _frame()
    frame[0]["x"] = coordinate
    assert client.post("/api/analyze-shot", json={"shot_sequence": [frame]}).status_code == 422


def test_unknown_shot_type_is_rejected():
    payload = {"shot_sequence": [_frame()], "shot_type": "made_up_shot"}
    assert client.post("/api/analyze-shot", json=payload).status_code == 422


def test_batch_analysis_is_bounded():
    payload = [{"poseLandmarks": _frame()}] * 601
    assert client.post("/api/batch-analyze", json=payload).status_code == 422


def test_single_frame_endpoint_scores_angles(monkeypatch):
    from geo import get_ideal_angle_sequence

    ideal = get_ideal_angle_sequence("cover_drive")[0]
    angles = {key: ideal[key] for key in ("left_elbow", "right_elbow", "left_knee", "right_knee")}
    monkeypatch.setattr(index, "extract_shot_angles", lambda frame: angles)
    response = client.post("/api/analyze-frame", json={"poseLandmarks": _frame()})
    assert response.status_code == 200
    assert response.json()["score"] == 100


def test_track_ball_disabled_returns_501(monkeypatch):
    monkeypatch.setattr(index, "ENABLE_BALL_TRACKING", False)
    files = {"video": ("x.mp4", b"0" * 10, "video/mp4")}
    assert client.post("/api/track-ball", files=files).status_code == 501
