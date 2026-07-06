# Cricket Shadow Coach — Analysis Accuracy Game Plan

**Repo:** https://github.com/bhasan26/cricket-shadow-coach
**Goal:** Make shot and bowling analysis genuinely accurate — not just plausible-looking. Fix measurement errors at the source (2D angles, jitter, invented reference data), then upgrade the intelligence layer (real references, phase-aware scoring, in-browser ML classifier).

**Agent instructions:** Work through phases in order. Each phase is independently shippable — commit and verify at the end of each phase before starting the next. Do not skip verification steps. Do not change UI/branding unless a task says to. Ask before deleting anything not explicitly listed.

---

## Phase 0 — Security & hygiene (do first, ~30 min)

### 0.1 Scrub the leaked Kaggle token from git history
The token in `api/train_action_model.py` has been revoked, but it must also be removed from history.
- [ ] Remove the hardcoded `KGAT_...` line; replace with `os.environ.get("KAGGLE_API_TOKEN")` and a comment telling users to set it via Colab secrets.
- [x] Scrub history: `git filter-repo --replace-text` mapping the leaked token to `REDACTED` (or BFG). Force-push. Warn the user this rewrites history.
- [ ] Add a pre-commit secret scan: `gitleaks` config or at minimum a note in CONTRIBUTING.

### 0.2 Repo weight
- [ ] Move `bowling_model.pt` (15 MB) out of the repo — GitHub Release asset or Git LFS. It is not loaded by any runtime code (verify with grep before moving).
- [ ] Remove `Gemini_Generated_Image_*.png` (6.3 MB) and the PDF report from the repo root (move to `/docs` or delete).

**Verify:** `git clone` of the fresh repo is < 5 MB. `grep -r "KGAT" .` returns nothing.

---

## Phase 1 — Fix the measurement layer (biggest accuracy win)

### 1.1 Switch from 2D screen landmarks to 3D world landmarks
**Problem:** All joint angles are computed from `results.poseLandmarks` (normalized 2D image coordinates). Camera perspective/foreshortening distorts angles by 20–60°. This is the root cause of the arbitrary "−20° leniency" hack in `evaluate_bowling_action`.

**Tasks:**
- [ ] In `src/poseUtils.js`, capture **both** `results.poseLandmarks` (keep for canvas drawing — it's in screen space) and `results.poseWorldLandmarks` (3D, meters, hip-origin — use for ALL angle math).
- [ ] Update `handlePoseLandmarks` in `CameraFeed.jsx` to receive `{ screen, world }`. Draw skeleton from `screen`; compute `calculateAngleJS` / spine tilt from `world` using full 3D vectors (x, y, z).
- [ ] Update the frame buffer to store world landmarks; these are what get POSTed to `/api/analyze-shot`.
- [ ] In `api/angle_utils.py`, compute angles as true 3D angles: `angle = arccos(dot(v1, v2) / (|v1||v2|))` with 3-component vectors. Remove any 2D-only assumptions.
- [ ] In `api/shot_evaluator.py` → `evaluate_bowling_action`: **delete the −20° leniency offset.** With 3D world angles it is no longer justified. Re-tune only if verification shows a residual bias.
- [ ] Keep `wrist_y` / `shoulder_y` phase logic working — decide explicitly whether these come from screen or world coords and document it (world coords: y is meters relative to hip center, sign convention differs — verify empirically and add a comment).

**Verify:** Record a test clip standing side-on with a deliberately straight arm (should read ~170–180°) and a deliberately bent arm (~90°). 3D angles must be within ±10° of reality regardless of camera angle (test front-on AND side-on). Log both 2D and 3D angles during testing to demonstrate the improvement.

### 1.2 Smooth landmarks before any analysis
**Problem:** Raw MediaPipe output jitters 2–5° frame-to-frame. This inflates the motion/jerkiness metrics in `calculate_motion_score` and the min/max extension in the bowling check. Currently only the bowling path has a median filter.

**Tasks:**
- [ ] Implement a **One Euro filter** on the client (`src/poseUtils.js` or new `src/filters.js`) applied per-landmark per-axis on world landmarks before buffering. (One Euro is standard for pose tracking: low lag, tunable. Params to start: `minCutoff=1.0`, `beta=0.007`.)
- [ ] Server-side (`api/shot_evaluator.py`): apply Savitzky-Golay (`scipy.signal.savgol_filter`, window 7, polyorder 2) to each angle series before motion scoring, DTW, and bowling extension — as defense-in-depth for old clients.
- [ ] Re-tune `STABILITY_THRESHOLD` in `CameraFeed.jsx` after smoothing (smoothed data has lower variance; the auto-record trigger will fire more easily — verify it still requires genuine stillness).
- [ ] Filter landmarks by `visibility` — exclude landmarks with visibility < 0.5 from angle computation rather than computing garbage angles from occluded joints; propagate "angle unavailable" as `None`, not `0`. Audit every `f.get(key, 0)` in the evaluator — `0` is currently ambiguous between "missing" and "measured 0°".

**Verify:** Stand perfectly still for 5 s; per-angle std-dev over the window must be < 1.5° (was ~2–5°). Swing a shot; peak angles must not be clipped by more than ~3° vs unsmoothed.

### 1.3 Fix DTW normalization
**Problem:** `dtw_utils.py` maps raw DTW distance to a score. Raw distance grows with sequence length → longer recordings always score worse.

**Tasks:**
- [ ] Return `distance / len(warping_path)` from `fastdtw` (it returns the path — use it) and map *that* to the 0–100 score. Calibrate: average per-step deviation of 0° → 100; ≥30° → 0; linear between.
- [ ] Add `fastdtw` to `api/requirements.txt` (currently missing — any code path importing `dtw_utils` crashes in prod).
- [ ] Unit test: same motion recorded at 2 s and at 6 s (resample a fixture) must score within ±5 points.

---

## Phase 2 — Fix the evaluation logic

### 2.1 Replace hardcoded "ideal" sequences with recorded references
**Problem:** The keyframe sequences in `api/geo.py` are invented numbers. DTW measures agreement with guesses, not with good technique.

**Tasks:**
- [ ] Build a capture tool: `api/tools/capture_reference.py` — takes a video file, runs MediaPipe Pose (add `mediapipe` to a separate `requirements-dev.txt`, NOT prod requirements), extracts the smoothed 3D angle sequence, resamples to 32 frames, saves JSON to `api/references/<shot_type>/<take_N>.json`.
- [ ] Build an averaging tool: aligns multiple takes with DTW, computes the mean sequence **and per-frame std-dev** → `api/references/<shot_type>/reference.json`. The std-dev becomes a per-frame tolerance band (tight where technique is consistent, loose where natural variation exists).
- [ ] Update `geo.py` to load `reference.json` files at import, falling back to the current hardcoded sequences for shot types without recorded references yet (log a warning).
- [ ] Update scoring to use per-frame tolerance: deviation within 1 std = full marks, scale down to 0 at 3 std.
- [ ] **Leave a clear TODO + README in `api/references/`** telling the maintainer to record 5–10 clean takes per shot (self, coach, or traced pro footage they have rights to use). The agent cannot do the recording.

### 2.2 Phase-aware scoring instead of whole-sequence DTW
**Problem:** One global DTW score can't tell the user *which part* of the shot was wrong.

**Tasks:**
- [ ] Implement phase segmentation in `api/shot_evaluator.py`: detect stance → backswing → downswing → impact → follow-through using zero-crossings of smoothed elbow angular velocity (backswing = elbow angle decreasing, impact ≈ peak extension, etc.). Keep it simple and rule-based.
- [ ] Score each phase against the corresponding segment of the reference (aligned via the DTW warping path).
- [ ] Return per-phase scores in `angle_scores` so the frontend can show "Backswing 85 / Impact 60 / Follow-through 90". Update `Feedback.jsx` to render them if present (minimal UI change only).

### 2.3 Fix the bowling legality check
**Tasks:**
- [ ] Replace the "wrist above shoulder" window with the proper ICC measurement window: from the frame where the **upper arm passes horizontal** (shoulder→elbow vector y-component crosses 0 in world coords, arm moving upward/forward) to the **release frame** (peak wrist speed, or wrist at highest point). Compute elbow extension = max(angle) − min(angle) **within that window only**.
- [ ] With 3D angles + smoothing from Phase 1, the −20° fudge is gone (done in 1.1). If a small bias remains after verification, apply a documented, empirically derived offset with a code comment explaining the measurement.
- [ ] **Soften the verdict language.** 30 fps webcam analysis cannot adjudicate ICC compliance (official testing is 250 fps 3D lab capture). Change strings: "✅ LEGAL ACTION" → "✅ Estimated extension X° — within the 15° guideline"; "⚠️ ILLEGAL ACTION (Chucking)" → "⚠️ Estimated extension X° — exceeds the 15° guideline. Indicative only; not an official assessment." Update the spoken cues in `CameraFeed.jsx` to match.
- [ ] Report a confidence flag: if fewer than 5 frames landed in the measurement window, or avg landmark visibility in the window < 0.6, return `confidence: "low"` and say so in feedback.

### 2.4 Handedness detection for batting
- [ ] Reuse the variance-based arm detection from `evaluate_bowling_action` to infer batting handedness from the sequence (front side = side with larger elbow range of motion, or infer from stance: which shoulder faces the camera). Pass `is_right_handed` into `evaluate_batting_biomechanics` — it currently hardcodes `True`, silently mis-scoring left-handers.
- [ ] Add an optional manual override: `handedness` field in the `/api/analyze-shot` payload (frontend can add a toggle later; API-first).

### 2.5 Error handling correctness
- [ ] `/api/analyze-frame` and `/api/analyze-shot`: on exception, raise `HTTPException(500)` with a generic message — never return HTTP 200 with `feedback=f"Error: {e}"` (leaks internals, and the client logs it as a successful analysis).
- [ ] Wire the unused `Landmark` Pydantic model into the payload types (`List[List[Landmark]]`) for free validation; return 422 on malformed input.
- [ ] Frontend `api.js`: surface a user-friendly message distinguishing "backend unreachable" from "analysis rejected".

---

## Phase 3 — Real ML: landmark-sequence classifier (replaces the unused .pt)

**Rationale:** The existing `bowling_model.pt` (pixel CNN+LSTM, trained on Kaggle match footage) is never loaded by the app and will transfer poorly to webcam selfie framing. A classifier over **landmark sequences** is smaller, trains on less data, is viewpoint-robust, and can run **in the browser** via ONNX — keeping the "processed locally" privacy story true.

### 3.1 Training pipeline
- [ ] New script `api/train_landmark_classifier.py` (Colab-ready, NO hardcoded secrets):
  - Input: folders of videos per class (`cover_drive/`, `pull_shot/`, ..., `bowling_legal/`, `bowling_illegal/`) OR pre-extracted landmark JSONs.
  - Extract MediaPipe 3D world landmarks per frame → smooth → normalize (center on hip midpoint, scale by torso length) → resample each clip to 48 frames.
  - Model: small architecture — input `(48, 99)` (33 landmarks × xyz) → 1D temporal conv (or 2-layer LSTM, hidden 128) → dense → softmax. Target < 2 MB exported.
  - **Proper methodology:** stratified 70/15/15 train/val/test split BY VIDEO (never split frames of one video across sets), early stopping on val loss, report test accuracy + per-class confusion matrix. Print all of it.
  - Augmentation: horizontal mirror (relabel handedness-sensitive classes), small rotation/scale jitter on landmarks, temporal crop jitter.
- [ ] Export to ONNX (`torch.onnx.export`, opset ≥ 17). Verify parity: ONNX output matches PyTorch within 1e-4 on 10 test samples.

### 3.2 In-browser inference
- [ ] Add `onnxruntime-web` to the frontend. Lazy-load it and the model only when the user opens Live Analysis (keep the landing bundle small — same pattern as the existing lazy imports).
- [ ] New `src/shotClassifier.js`: buffers the recorded (smoothed, normalized — reuse exact training preprocessing, port it faithfully) landmark sequence, resamples to 48 frames, runs the ONNX session, returns `{ label, confidence }`.
- [ ] Use it two ways:
  1. **Shot verification:** after a drill, if `label !== selectedShot` with confidence > 0.7, prepend feedback: "This looked more like a Pull Shot than a Cover Drive."
  2. **Bowling second opinion:** combine rule-based extension estimate with classifier probability; if they disagree, flag low confidence rather than picking one.
- [ ] Model file served from `/public/models/` and cached by the service worker (add to the SW asset list — and while there, fix the SW to precache hashed Vite build assets, e.g. by migrating to `vite-plugin-pwa`).
- [ ] Delete `bowling_model.pt` from the repo (Phase 0 moved it out already) and delete or clearly deprecate `train_action_model.py` in favor of the new script.

**Verify:** Test-set accuracy printed and ≥ 80% before shipping the verification feature (if below, ship classifier behind a `?experimental=1` flag). In-browser inference < 100 ms on a mid-range laptop.

---

## Phase 4 — Honest UX around accuracy

- [ ] **Camera setup guidance:** analysis validity depends heavily on framing. Add a pre-drill check: full body visible (all 33 landmarks visibility > 0.5 for 1 s) and reasonable distance (torso height 30–70% of frame). Show "Move back / Move closer / Turn side-on for bowling" prompts instead of silently producing bad scores.
- [ ] Show a **confidence indicator** with every score (derived from avg landmark visibility + frames-in-window + classifier agreement). Low confidence → gray out the number and explain why.
- [ ] Update the footer privacy claim to be precise: "Your video never leaves your device. Only anonymous joint coordinates are sent for scoring." (Landmarks ARE sent to the backend; the current "never uploaded" wording overclaims.)
- [ ] Update `ARCHITECTURE.md` documenting: world landmarks, filtering params, reference data pipeline, phase segmentation, classifier training + eval numbers.

---

## Phase 5 — Regression safety net

- [ ] `pytest` suite in `api/tests/`:
  - `test_angles.py`: 3D angle math on synthetic landmarks with known angles (90°, 135°, 180°), including rotated/foreshortened variants that must still be exact.
  - `test_dtw.py`: length-invariance test (Phase 1.3), identical sequences score 100.
  - `test_bowling.py`: synthetic sequences — locked arm → extension < 5°; scripted 25° extension → detected within ±5°; window detection picks the correct frames.
  - `test_evaluator.py`: sitting-detection, motion score on still vs moving fixtures, missing-landmark (None) handling.
- [ ] Record 3–5 real webcam fixture clips (landmark JSONs, committed — they're small) as golden files; snapshot-test the full pipeline output.
- [ ] GitHub Action: lint (eslint + ruff) + pytest on every PR.

---

## Execution notes for the agent

- **Order matters:** Phase 1 changes the numbers every later phase is tuned against. Do not tune thresholds (stability, gauge colors in `getGaugeColor`, motion-score bands) until 1.1 + 1.2 are merged — then re-tune them once, empirically, and document the values.
- **Backwards compatibility:** old clients may still send 2D landmarks. Version the API payload (`landmark_space: "world" | "screen"`, default `"screen"`) and keep a degraded legacy path for one release.
- **Don't touch:** branding, landing page copy (except the privacy line in Phase 4), the auto-record state machine structure (only its thresholds).
- **Definition of done per phase:** code + tests pass + verification steps executed with results noted in the PR description.
