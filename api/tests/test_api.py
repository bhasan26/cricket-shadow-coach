import random

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


def test_track_ball_disabled_returns_501(monkeypatch):
    monkeypatch.setattr(index, "ENABLE_BALL_TRACKING", False)
    files = {"video": ("x.mp4", b"0" * 10, "video/mp4")}
    assert client.post("/api/track-ball", files=files).status_code == 501
