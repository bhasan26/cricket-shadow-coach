"""
Golden-fixture harness: score REAL recorded clips and report real accuracy.

Everything in run_eval.py is synthetic — sequences generated from the same
references they are scored against. That proves the scorer is self-consistent;
it cannot tell you whether the references match a real person in a real room.
This harness closes that gap, and it is the only number in the project that is
an actual accuracy measurement.

RECORDING THE FIXTURES
    Film front-on, full body in frame, good light, one shot per clip. Two clips
    per shot type is the minimum worth reporting; five is better. Name nothing
    specially — the folder is the ground-truth label:

        fixtures/
          cover_drive/     clip1.mp4 clip2.mov ...
          straight_drive/  ...
          pull_shot/       ...
          defensive_block/ ...
          flick_shot/      ...

    A `bowling_action/` folder is scored for elbow extension instead of shot
    identity. Clips you know are wrong (a deliberate mis-hit, a shot played
    badly) still belong here — they are how the low end gets validated.

USAGE
    python -m eval.run_fixtures fixtures/              # videos, needs mediapipe
    python -m eval.run_fixtures fixtures/ --save-landmarks cache/
    python -m eval.run_fixtures cache/                 # cached JSON, no mediapipe

Extraction is the slow part, so cache it once with --save-landmarks and iterate
on the scorer against the cache afterwards.
"""

import argparse
import json
import os
import sys

import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from angle_utils import extract_shot_angles
from shot_evaluator import evaluate_shot, identify_shot

VIDEO_SUFFIXES = (".mp4", ".mov", ".avi", ".webm", ".mkv")


def landmarks_from_video(path):
    """
    Extract per-frame (image_landmarks, world_landmarks) from a video.

    Both are needed: joint angles come from the metric 3D world landmarks, while
    visibility gating and the screen-space phase detection come from the image
    landmarks (see api/angle_utils.py).
    """
    import cv2
    import mediapipe as mp

    frames = []
    capture = cv2.VideoCapture(path)
    with mp.solutions.pose.Pose(model_complexity=1, min_detection_confidence=0.5) as pose:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            results = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if not results.pose_landmarks:
                continue
            image = [
                {"x": p.x, "y": p.y, "z": p.z, "visibility": p.visibility}
                for p in results.pose_landmarks.landmark
            ]
            world = None
            if results.pose_world_landmarks:
                world = [
                    {"x": p.x, "y": p.y, "z": p.z, "visibility": p.visibility}
                    for p in results.pose_world_landmarks.landmark
                ]
            frames.append({"image": image, "world": world})
    capture.release()
    return frames


def load_clip(path):
    """Landmark frames from a video or a cached JSON extraction."""
    if path.lower().endswith(".json"):
        with open(path) as fh:
            return json.load(fh)
    return landmarks_from_video(path)


def angle_sequence(frames):
    return [
        extract_shot_angles(f["image"], world_landmarks=f.get("world"))
        for f in frames
    ]


def discover(root):
    """{shot_type: [clip paths]} from one folder per shot type."""
    clips = {}
    for shot in sorted(os.listdir(root)):
        folder = os.path.join(root, shot)
        if not os.path.isdir(folder):
            continue
        paths = [
            os.path.join(folder, name)
            for name in sorted(os.listdir(folder))
            if name.lower().endswith(VIDEO_SUFFIXES + (".json",))
        ]
        if paths:
            clips[shot] = paths
    return clips


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("fixtures_dir", help="one folder per shot type")
    parser.add_argument("--save-landmarks", metavar="DIR",
                        help="cache extractions as JSON for fast re-runs")
    parser.add_argument("--right-handed", action="store_true", default=True)
    parser.add_argument("--left-handed", dest="right_handed", action="store_false")
    args = parser.parse_args()

    if not os.path.isdir(args.fixtures_dir):
        sys.exit(f"No such directory: {args.fixtures_dir}")
    clips = discover(args.fixtures_dir)
    if not clips:
        sys.exit(
            f"No clips under {args.fixtures_dir}. Expected one folder per shot "
            f"type, e.g. {args.fixtures_dir}/cover_drive/clip1.mp4"
        )

    print(f"{'CLIP':<34}{'SCORE':>6}{'IDENTIFIED AS':>18}{'OK':>5}{'TRACK':>7}")
    print("-" * 70)

    identified = correct = 0
    scores, tracking = [], []
    for shot, paths in clips.items():
        for path in paths:
            try:
                frames = load_clip(path)
            except Exception as exc:  # noqa: BLE001 — report and keep going
                print(f"{os.path.basename(path):<34}  SKIPPED: {exc}")
                continue
            if len(frames) < 10:
                print(f"{os.path.basename(path):<34}  SKIPPED: only {len(frames)} tracked frames")
                continue

            if args.save_landmarks:
                out_dir = os.path.join(args.save_landmarks, shot)
                os.makedirs(out_dir, exist_ok=True)
                stem = os.path.splitext(os.path.basename(path))[0]
                with open(os.path.join(out_dir, f"{stem}.json"), "w") as fh:
                    json.dump(frames, fh)

            angles = angle_sequence(frames)
            result = evaluate_shot(None, angles, shot_type=shot,
                                   is_right_handed=args.right_handed)
            label = f"{shot}/{os.path.basename(path)}"[:33]
            quality = result.get("tracking_quality", 0.0)
            scores.append(result["score"])
            tracking.append(quality)

            if shot == "bowling_action":
                extension = result.get("angle_scores", {}).get("bowling_arm_extension", 0.0)
                print(f"{label:<34}{result['score']:>6}{f'{extension:.1f} deg ext':>18}"
                      f"{'-':>5}{quality:>6.0f}%")
                continue

            match = identify_shot(angles, is_right_handed=args.right_handed)
            best = match["best"] if match else "-"
            hit = bool(match and match["best"] == shot)
            identified += 1
            correct += hit
            print(f"{label:<34}{result['score']:>6}{best:>18}{'yes' if hit else 'NO':>5}"
                  f"{quality:>6.0f}%")

    print("-" * 70)
    if not scores:
        sys.exit("No clips could be scored.")
    print(f"clips scored          : {len(scores)}")
    print(f"score  mean/min/max   : {np.mean(scores):.0f} / {min(scores)} / {max(scores)}")
    print(f"tracking quality mean : {np.mean(tracking):.0f}%")
    if identified:
        accuracy = 100.0 * correct / identified
        print(f"shot identification   : {accuracy:.0f}%  ({correct}/{identified})")
        print()
        print("This is a REAL accuracy number, unlike run_eval.py. Compare it "
              "against the 100% that harness reports on synthetic reps — any gap "
              "is the references failing to describe a real player.")
        if accuracy < 80.0:
            print("\nBelow 80%: the recorded references do not generalize to this "
                  "player. Rebuilding them from real clips is the fix, not "
                  "retuning thresholds.")
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
