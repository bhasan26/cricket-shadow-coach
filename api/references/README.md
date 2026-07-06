# Recorded reference data

The scoring engine compares a player's angle sequences against a reference for
each shot type. Recorded references (real, good technique) are far more
accurate than the legacy hardcoded sequences in `geo.py`, which are used as a
fallback when no `reference.json` exists for a shot type.

## TODO for the maintainer

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
