"""
Average multiple captured takes into a single reference with tolerance bands.

Aligns every take to the first take with DTW (per channel), resamples the
aligned series to the common frame count, then computes the per-frame mean and
standard deviation. The std-dev becomes the scoring tolerance band: tight where
good technique is consistent, loose where natural variation exists.

Usage (after capturing takes with capture_reference.py):
    python api/tools/build_reference.py cover_drive
    python api/tools/build_reference.py --all
"""

import glob
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from angle_utils import ANGLE_KEYS  # noqa: E402

REFERENCES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "references")
# Never let a tolerance band collapse below measurement noise (~2° after smoothing).
MIN_STD_DEG = 2.0


def align_to(base, series):
    """Warp ``series`` onto ``base``'s timeline via the DTW path, same length as base."""
    from fastdtw import fastdtw

    _, path = fastdtw(
        np.array(base, dtype=float).reshape(-1, 1),
        np.array(series, dtype=float).reshape(-1, 1),
        dist=lambda a, b: abs(float(a[0]) - float(b[0])),
    )
    # For each base index, average the series values matched to it.
    buckets = [[] for _ in base]
    for i, j in path:
        buckets[i].append(series[j])
    return [float(np.mean(b)) if b else float("nan") for b in buckets]


def build_reference(shot_type):
    take_paths = sorted(glob.glob(os.path.join(REFERENCES_DIR, shot_type, "take_*.json")))
    if len(take_paths) < 2:
        print(f"{shot_type}: need >= 2 takes, found {len(take_paths)} — skipping")
        return False

    takes = []
    for p in take_paths:
        with open(p) as fh:
            takes.append(json.load(fh))

    channels = {}
    for key in ANGLE_KEYS:
        series_list = [t["channels"].get(key) for t in takes]
        series_list = [s for s in series_list if s]
        if len(series_list) < 2:
            channels[key] = None
            continue
        base = series_list[0]
        aligned = [base] + [align_to(base, s) for s in series_list[1:]]
        arr = np.array(aligned, dtype=float)
        channels[key] = {
            "mean": [round(v, 2) for v in np.nanmean(arr, axis=0)],
            "std": [round(max(v, MIN_STD_DEG), 2) for v in np.nanstd(arr, axis=0)],
        }

    reference = {
        "shot_type": shot_type,
        "num_takes": len(takes),
        "frames": takes[0]["frames"],
        "channels": channels,
    }
    out_path = os.path.join(REFERENCES_DIR, shot_type, "reference.json")
    with open(out_path, "w") as fh:
        json.dump(reference, fh, indent=1)
    print(f"{shot_type}: reference.json built from {len(takes)} takes")
    return True


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    if sys.argv[1] == "--all":
        shot_types = [
            d for d in os.listdir(REFERENCES_DIR)
            if os.path.isdir(os.path.join(REFERENCES_DIR, d))
        ]
    else:
        shot_types = sys.argv[1:]
    for shot_type in shot_types:
        build_reference(shot_type)


if __name__ == "__main__":
    main()
