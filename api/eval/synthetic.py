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
# Spine tilt is part of the recorded references and is what the shot-identity
# check leans on most, so replays must reproduce it rather than a constant.
REPLAY_KEYS = ANGLE_KEYS + ["spine_tilt"]
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
    channels = {k: _resample([f.get(k, 0) for f in ideal], n_frames) for k in REPLAY_KEYS}
    return [
        _frame(channels["left_elbow"][i], channels["right_elbow"][i],
               channels["left_knee"][i], channels["right_knee"][i],
               spine=channels["spine_tilt"][i])
        for i in range(n_frames)
    ]


def player_replay(shot_type="cover_drive", noise=5.0, stretch=1.0, offset=0.0,
                  n_frames=40):
    """
    A realistic amateur rep of ``shot_type``: the reference motion plus tracking
    noise, a different tempo, and a constant per-player angle offset (build,
    stance and camera height all shift absolute joint angles). Used to check the
    shot-identity call survives the variation a real user brings.
    """
    base = perfect_replay(shot_type, max(8, int(n_frames * stretch)))
    for f in base:
        for k in REPLAY_KEYS:
            f[k] = float(f[k] + offset + _rng.normal(0.0, noise))
    return base


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


def bowling_action(extension_deg=8.0, gather_extension_deg=0.0, n_gather=12,
                   n_delivery=14, is_world=True):
    """
    A right-arm bowling action with a KNOWN elbow extension inside the ICC
    measurement window, so the measured value can be checked against ground
    truth.

    Screen space, y down-positive, shoulder at y=0.5:
      * gather   — elbow below the shoulder, wrist hanging below it. The arm
        flexes to (180 - extension_deg) ready for delivery.
      * delivery — elbow crosses above the shoulder with the wrist leading,
        straightening back to 180 at release.

    The elbow angle is CONTINUOUS across the boundary, as a real arm is; a jump
    there would be smeared by the upstream Savitzky-Golay pass and show up as
    measurement error that no real action would produce.

    ``gather_extension_deg`` adds an extension excursion inside the gather —
    the arm straightens fully, then re-flexes before delivery. That extension is
    legal under ICC Rule 11.1 and must be ignored entirely.
    """
    frames = []

    def frame(elbow, wrist_y, elbow_y):
        return {
            "left_elbow": 150.0, "right_elbow": float(elbow),
            "left_knee": 170.0, "right_knee": 170.0, "spine_tilt": 10.0,
            "left_wrist_y": 0.8, "left_shoulder_y": 0.5, "left_elbow_y": 0.65,
            "right_wrist_y": float(wrist_y), "right_shoulder_y": 0.5,
            "right_elbow_y": float(elbow_y),
            "nose_y": 0.3, "shoulder_width": 0.25, "is_world": is_world,
        }

    start_angle = 180.0 - gather_extension_deg
    for i in range(n_gather):
        t = i / max(1, n_gather - 1)
        if gather_extension_deg > 0:
            # Straighten fully by mid-gather, then re-flex ready for delivery.
            elbow = (start_angle + (180.0 - start_angle) * (t / 0.5) if t < 0.5
                     else 180.0 - extension_deg * ((t - 0.5) / 0.5))
        else:
            elbow = 180.0 - extension_deg * t
        frames.append(frame(elbow, 0.90, 0.70))

    for j in range(n_delivery):
        t = j / max(1, n_delivery - 1)
        frames.append(frame(180.0 - extension_deg * (1.0 - t),
                            0.40 - 0.35 * t, 0.45 - 0.25 * t))
    return frames
