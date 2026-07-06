"""
Capture a reference take from a video file.

Runs MediaPipe Pose over a video of one clean shot, extracts the smoothed 3D
world-landmark angle sequence, resamples it to a fixed frame count, and saves
it as a JSON "take" under api/references/<shot_type>/.

Requires the dev dependencies (NOT shipped to prod):
    pip install -r api/requirements-dev.txt

Usage:
    python api/tools/capture_reference.py cover_drive path/to/take.mp4
    python api/tools/capture_reference.py cover_drive clips/*.mp4

Record 5-10 clean takes per shot type, then build the averaged reference with:
    python api/tools/build_reference.py cover_drive
"""

import json
import os
import sys

# Make api/ modules importable when run from the repo root.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from angle_utils import ANGLE_KEYS, extract_shot_angles, smooth_sequence  # noqa: E402

REFERENCES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "references")
TAKE_FRAMES = 32


def _landmarks_to_dicts(landmark_list):
    return [
        {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": getattr(lm, "visibility", 1.0)}
        for lm in landmark_list.landmark
    ]


def extract_angle_sequence(video_path):
    """Run MediaPipe Pose over a video, returning one angle dict per frame."""
    import cv2
    import mediapipe as mp

    sequence = []
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    with mp.solutions.pose.Pose(model_complexity=2, min_detection_confidence=0.5) as pose:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            results = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if not results.pose_landmarks:
                continue
            screen = _landmarks_to_dicts(results.pose_landmarks)
            world = (
                _landmarks_to_dicts(results.pose_world_landmarks)
                if results.pose_world_landmarks
                else None
            )
            sequence.append(extract_shot_angles(screen, world_landmarks=world))
    cap.release()
    return sequence


def resample_take(angle_sequence, target_len=TAKE_FRAMES):
    """Smooth each channel, then linearly resample to ``target_len`` frames."""
    import numpy as np

    channels = {}
    for key in ANGLE_KEYS:
        smoothed = smooth_sequence([f.get(key) for f in angle_sequence])
        valid = [(i, v) for i, v in enumerate(smoothed) if v is not None]
        if len(valid) < 2:
            channels[key] = None
            continue
        xs = np.array([i for i, _ in valid], dtype=float)
        ys = np.array([v for _, v in valid], dtype=float)
        xt = np.linspace(xs[0], xs[-1], target_len)
        channels[key] = list(np.interp(xt, xs, ys))
    return channels


def next_take_path(shot_type):
    out_dir = os.path.join(REFERENCES_DIR, shot_type)
    os.makedirs(out_dir, exist_ok=True)
    n = 1
    while os.path.exists(os.path.join(out_dir, f"take_{n}.json")):
        n += 1
    return os.path.join(out_dir, f"take_{n}.json")


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    shot_type = sys.argv[1]
    for video_path in sys.argv[2:]:
        print(f"Processing {video_path} ...")
        sequence = extract_angle_sequence(video_path)
        if len(sequence) < 10:
            print(f"  SKIPPED: only {len(sequence)} tracked frames (need >= 10)")
            continue
        world_frames = sum(1 for f in sequence if f.get("is_world"))
        channels = resample_take(sequence)
        take = {
            "shot_type": shot_type,
            "source": os.path.basename(video_path),
            "frames": TAKE_FRAMES,
            "tracked_frames": len(sequence),
            "world_landmark_ratio": round(world_frames / len(sequence), 3),
            "channels": channels,
        }
        out_path = next_take_path(shot_type)
        with open(out_path, "w") as fh:
            json.dump(take, fh, indent=1)
        print(f"  Saved {out_path} ({len(sequence)} frames -> {TAKE_FRAMES})")


if __name__ == "__main__":
    main()
