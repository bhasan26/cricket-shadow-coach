"""
Calibration harness for the shot scorer.

Runs ``evaluate_shot`` over a suite of synthetic sequences and prints a score
table. Acceptance targets:

  * ideal replay            >= 90
  * time-stretched ideal    >= 85
  * noisy ideal             >= 75
  * still / flailing        <= 30

Run:  python -m eval.run_eval    (from the api/ directory)
Exit code is non-zero if any target is missed, so CI can gate on it.
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shot_evaluator import evaluate_shot  # noqa: E402
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
    return cases


TARGETS = {
    "ideal": (90, None),
    "stretch": (85, None),
    "noisy": (75, None),
    "junk": (None, 30),
}


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
    if failures:
        print(f"{failures} case(s) missed target")
        return 1
    print("All acceptance targets met.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
