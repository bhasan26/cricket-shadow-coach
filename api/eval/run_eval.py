"""
Calibration harness for the shot scorer.

Runs ``evaluate_shot`` over a suite of synthetic sequences and prints a score
table. Acceptance targets:

  * ideal replay            >= 90
  * time-stretched ideal    >= 85
  * noisy ideal             >= 75
  * still / flailing        <= 30
  * WRONG shot selected     <= 50   (a clean pull shot graded as a cover drive)

Plus a shot-identification sweep: across noise, tempo and per-player angle
offset, ``identify_shot`` must name the shot that was actually played, and must
never confidently mislabel a correct rep.

Run:  python -m eval.run_eval    (from the api/ directory)
Exit code is non-zero if any target is missed, so CI can gate on it.
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shot_evaluator import evaluate_shot, identify_shot  # noqa: E402
from eval import synthetic  # noqa: E402

SHOTS = ["cover_drive", "straight_drive", "pull_shot", "defensive_block", "flick_shot"]


def _score(seq, shot_type):
    return evaluate_shot(None, seq, shot_type=shot_type)["score"]


def build_cases():
    cases = []  # (label, shot_type, seq, kind) where kind in {"high","mid","low"}
    for shot in SHOTS:
        cases.append((f"ideal:{shot}", shot, synthetic.perfect_replay(shot), "ideal"))
    cases.append(("stretch 0.5x cover", "cover_drive", synthetic.time_stretched("cover_drive", 0.5), "stretch"))
    cases.append(("stretch 2.0x cover", "cover_drive", synthetic.time_stretched("cover_drive", 2.0), "stretch"))
    cases.append(("noisy cover", "cover_drive", synthetic.noisy_replay("cover_drive"), "noisy"))
    cases.append(("noisy pull", "pull_shot", synthetic.noisy_replay("pull_shot"), "noisy"))
    cases.append(("sitting still", "cover_drive", synthetic.sitting_still(), "junk"))
    cases.append(("random flailing", "cover_drive", synthetic.random_flailing(), "junk"))
    # Cross-shot: a clean rep of one shot graded against a DIFFERENT selection.
    # Before shot identification these all scored 91-99.
    for performed, selected in (
        ("pull_shot", "cover_drive"),
        ("cover_drive", "pull_shot"),
        ("defensive_block", "flick_shot"),
        ("straight_drive", "defensive_block"),
        ("flick_shot", "straight_drive"),
    ):
        cases.append((
            f"{performed[:9]} as {selected[:9]}", selected,
            synthetic.perfect_replay(performed), "wrong_shot",
        ))
    return cases


TARGETS = {
    "ideal": (90, None),
    "stretch": (85, None),
    "noisy": (75, None),
    "junk": (None, 30),
    "wrong_shot": (None, 50),
}

# Realistic-user conditions for the identification sweep: (noise°, tempo, offset°).
ID_CONDITIONS = [
    (0.0, 1.0, 0.0),
    (5.0, 1.0, 0.0),
    (3.0, 1.5, 0.0),
    (5.0, 0.7, 10.0),
    (8.0, 1.5, 15.0),
    (8.0, 1.5, 25.0),
]


def run_identification():
    """
    Sweep ``identify_shot`` over realistic reps. Returns (failures, printed).

    Two things must hold: the top match is the shot actually played, and no
    correct rep is CONFIDENTLY labelled as a different shot (which would cap a
    good rep's score at MISMATCH_SCORE_CAP and tell the user they played the
    wrong drill).
    """
    print("\nSHOT IDENTIFICATION (top-1 over the 5 recorded references)")
    print(f"{'noise/tempo/offset':<22}{'top-1':>8}{'false alarms':>14}  RESULT")
    print("-" * 56)
    failures = 0
    for noise, stretch, offset in ID_CONDITIONS:
        correct = total = false_alarms = 0
        for shot in SHOTS:
            for _ in range(6):
                seq = synthetic.player_replay(shot, noise=noise, stretch=stretch,
                                              offset=offset)
                match = identify_shot(seq)
                total += 1
                if match and match["best"] == shot:
                    correct += 1
                elif match and match["confident"]:
                    false_alarms += 1
        top1 = 100.0 * correct / total
        ok = top1 >= 90.0 and false_alarms == 0
        label = f"{noise:.0f}° / {stretch:.1f}x / {offset:.0f}°"
        print(f"{label:<22}{top1:>7.0f}%{false_alarms:>14}  {'PASS' if ok else 'FAIL'}")
        if not ok:
            failures += 1
    return failures


def main():
    print(f"{'CASE':<26}{'SCORE':>6}  {'TARGET':>10}  RESULT")
    print("-" * 56)
    failures = 0
    for label, shot, seq, kind in build_cases():
        score = _score(seq, shot)
        lo, hi = TARGETS[kind]
        ok = True
        if lo is not None and score < lo:
            ok = False
        if hi is not None and score > hi:
            ok = False
        target = f">= {lo}" if lo is not None else f"<= {hi}"
        print(f"{label:<26}{score:>6}  {target:>10}  {'PASS' if ok else 'FAIL'}")
        if not ok:
            failures += 1

    print("-" * 56)
    failures += run_identification()
    print("-" * 56)
    if failures:
        print(f"{failures} case(s) missed target")
        return 1
    print("All acceptance targets met.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
