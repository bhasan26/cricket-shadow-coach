"""
Synthetic angle-sequence generators for calibrating the shot scorer.

These produce lists of angle dicts in the same shape ``extract_shot_angles``
emits, so they can be fed straight into ``evaluate_shot(None, seq, shot_type)``.
"""

import os
import sys

import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from geo import get_ideal_angle_sequence  # noqa: E402

ANGLE_KEYS = ["left_elbow", "right_elbow", "left_knee", "right_knee"]
_rng = np.random.default_rng(42)


def _resample(values, n):
    xs = np.linspace(0.0, 1.0, num=len(values))
    xt = np.linspace(0.0, 1.0, num=n)
    return list(np.interp(xt, xs, values))


def _frame(le, re, lk, rk, spine=12.0, head=1.0):
    return {
        "left_elbow": float(le),
        "right_elbow": float(re),
        "left_knee": float(lk),
        "right_knee": float(rk),
        "spine_tilt": float(spine),
        "head_alignment": float(head),
        # positional keys (used by the bowling path; harmless defaults here)
        "left_wrist_y": 0.4, "left_shoulder_y": 0.3,
        "right_wrist_y": 0.4, "right_shoulder_y": 0.3,
        "nose_y": 0.2, "shoulder_width": 0.25,
    }


def perfect_replay(shot_type="cover_drive", n_frames=40):
    """Upsample the ideal keyframes into a realistic-length clean replay."""
    ideal = get_ideal_angle_sequence(shot_type)
    channels = {k: _resample([f.get(k, 0) for f in ideal], n_frames) for k in ANGLE_KEYS}
    return [
        _frame(channels["left_elbow"][i], channels["right_elbow"][i],
               channels["left_knee"][i], channels["right_knee"][i])
        for i in range(n_frames)
    ]


def time_stretched(shot_type="cover_drive", factor=1.5):
    """Same motion, different duration (0.5×–2× speed)."""
    n = max(6, int(40 * factor))
    return perfect_replay(shot_type, n_frames=n)


def noisy_replay(shot_type="cover_drive", sigma=3.0, n_frames=40):
    """Clean replay plus ±sigma° gaussian tracking noise on each channel."""
    base = perfect_replay(shot_type, n_frames)
    for f in base:
        for k in ANGLE_KEYS:
            f[k] = float(f[k] + _rng.normal(0.0, sigma))
    return base


def sitting_still(n_frames=40):
    """Seated, no motion — knees bent ~95°, tiny jitter."""
    return [
        _frame(90 + _rng.normal(0, 0.5), 92 + _rng.normal(0, 0.5),
               95 + _rng.normal(0, 0.5), 96 + _rng.normal(0, 0.5))
        for _ in range(n_frames)
    ]


def random_flailing(n_frames=40):
    """Random uncorrelated joint angles — not a real shot."""
    return [
        _frame(_rng.uniform(60, 180), _rng.uniform(60, 180),
               _rng.uniform(60, 180), _rng.uniform(60, 180),
               spine=_rng.uniform(0, 40))
        for _ in range(n_frames)
    ]
