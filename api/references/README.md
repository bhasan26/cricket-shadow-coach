# Recorded reference data

The scoring engine compares a player's angle sequences against a reference for
each shot type. Recorded references (real, good technique) are far more
accurate than the legacy hardcoded sequences in `geo.py`, which are used as a
fallback when no `reference.json` exists for a shot type.

## Current references (2026-07)

The committed takes were derived from the `rokmr/cricket-shot` research
dataset (Hugging Face; structure based on CricShot10, itself CC0), which
contains broadcast footage of professional batters. Only **derived joint-angle
sequences** are committed — no video frames. For each shot type, the 8
best-tracked clips (≥84% of frames with all four key angles measurable) were
selected from ~125 candidates, MediaPipe-extracted as 3D world landmarks, and
DTW-averaged into `reference.json`. Each take's `source` field records its
origin clip. Intended for non-commercial research/practice use.

Known limitations: broadcast clips mix left/right-handed batters and camera
angles, which widens the tolerance bands. Replacing these with 5–10 clean,
deliberately filmed takes per shot (below) will tighten scoring.

## Recording better takes

Record **5–10 clean takes per shot type** — yourself, a coach, or traced pro
footage you have the rights to use. Film front-on or ~45°, full body in frame,
good lighting. Then:

```bash
pip install -r api/requirements-dev.txt

# 1. Extract each take (repeat per video; appends take_N.json)
python api/tools/capture_reference.py cover_drive clips/cover_drive_1.mp4

# 2. Average the takes into reference.json with per-frame tolerance bands
python api/tools/build_reference.py cover_drive
```

Layout:

```
api/references/
  cover_drive/
    take_1.json      # one captured take (32-frame angle channels)
    take_2.json
    reference.json   # DTW-aligned mean + per-frame std across takes
  pull_shot/
    ...
```

`geo.py` loads every `<shot_type>/reference.json` at import and uses the
per-frame std as a scoring tolerance band (within 1 std = full marks, scaled
to 0 at 3 std). Shot types without a reference fall back to the hardcoded
sequences and log a warning.

Take files and references are small JSON — commit them.
