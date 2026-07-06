# Agent Brief: cricket-shadow-coach — Full Fix & Improvement Pass

Repo: https://github.com/bhasan26/cricket-shadow-coach
Stack: React 19 + Vite (frontend, Vercel), FastAPI (api/, Vercel serverless + render.yaml/fly.toml), MediaPipe Pose in-browser.

Work through the phases in order. Each phase should be a separate commit (or PR). Run `npm run lint` and `npm run build` after every frontend change; run the Python test suite (Phase 6) after every backend change. Do not change public API response shapes unless a task says so.

---

## Phase 1 — Bug fixes (frontend)

### 1.1 Fix invalid CSS filter (src/App.jsx)
The hero backdrop uses `filter: 'blue-shift contrast(1.25) brightness(0.75)'`. `blue-shift` is not a CSS filter function, so the whole declaration is dropped. Replace with `filter: 'hue-rotate(180deg) contrast(1.25) brightness(0.75)'` or simply `'contrast(1.25) brightness(0.75)'` — check visually and pick whichever matches the intended look.

### 1.2 Stop recreating the pose detector mid-session (src/CameraFeed.jsx)
`handlePoseLandmarks` is a `useCallback` with deps `[autoRecordEnabled, ghostEnabled, selectedShot, isAnalyzing, handleStart, handleStop, availableShots, history]`. The detector-creation `useEffect` depends on `handlePoseLandmarks`, so every history/isAnalyzing/selectedShot change destroys and recreates the MediaPipe detector.

Fix:
- Store `autoRecordEnabled`, `ghostEnabled`, `selectedShot`, `isAnalyzing` in refs (mirror pattern already used for `isRecordingRef`), updated via small effects.
- Route the landmarks callback through a ref: `const handlePoseLandmarksRef = useRef(); handlePoseLandmarksRef.current = handlePoseLandmarks;` and pass a stable wrapper `(lm) => handlePoseLandmarksRef.current(lm)` to `createPoseDetector`.
- The detector effect should depend only on `[cameraReady]`.
- Remove `history` from any callback deps — it isn't read inside the callback.

### 1.3 Throttle per-frame React state updates (src/CameraFeed.jsx)
`setFrameCount` and the five `setLive*` angle setters fire on every pose frame (30–60 fps), re-rendering the whole component. Fix:
- Keep canvas drawing on every frame (it doesn't need React).
- Batch the telemetry state (one object, not 5 states) and update it at most every 100 ms (use a `lastUiUpdateRef` timestamp guard).
- Replace `frameCount` state with a ref; expose it in UI (if shown at all) via the same throttled update.

### 1.4 Fix broken footer links in analysis view (src/App.jsx)
Footer uses `<a href="#privacy">` and `<a href="#contact">` but navigation is `setActiveTab` state. Either convert them to buttons/anchors calling `setActiveTab('privacy'|'contact')`, or complete Phase 4 (routing) first and make them real links. Reuse the existing `src/components/Footer.jsx` if appropriate instead of the inline footer.

### 1.5 Cap localStorage history (src/CameraFeed.jsx)
`shadow_drills_history` grows forever. In the `setHistory` updater, `const updated = [newHistoryItem, ...prev].slice(0, 200);`. Also wrap `localStorage.setItem` in try/catch (quota errors on iOS private mode).

### 1.6 Fix fragile JS hover handlers (src/App.jsx)
`onMouseEnter={(e) => e.target.style.color = ...}` breaks when the cursor enters child `<svg>`/`<span>` (e.target is the child). Replace with CSS classes and `:hover` rules in App.css. While there, extract the nav button into a small `NavButton` component to kill the triplicated inline-style blocks.

### 1.7 Delete dead code
`src/usePoseAnalysis.js` is unused (CameraFeed implements its own flow) and contains a stale-closure bug (`frameCount` in deps). Delete it, plus any unused exports in `src/api.js` (`batchAnalyzeFrames`, `analyzeFrame`, `retryWithBackoff` — verify with grep before removing).

---

## Phase 2 — Backend correctness & security (api/)

### 2.1 Fix requirements.txt
`dtw_utils.py` imports `fastdtw`; `ball_tracker.py` imports `cv2` and `ultralytics` — none are in `api/requirements.txt`. Decide per deployment target:
- Vercel serverless: add `fastdtw`. Do NOT add ultralytics/opencv (too large for serverless). Guard `/api/track-ball` behind a feature flag env var; return 501 with a clear message when disabled.
- Render/Fly (Dockerfile): create `requirements-full.txt` including `fastdtw`, `opencv-python-headless`, `ultralytics`, and reference it from the Dockerfile.

### 2.2 Proper error responses
Endpoints currently catch exceptions and return HTTP 200 with `feedback=f"Error: {str(e)}"` — leaks internals and looks like a successful analysis. Replace with `raise HTTPException(status_code=500, detail="Analysis failed")` (log the real exception server-side with `logging`, not `print`). Update `src/api.js` to surface a friendly message on non-2xx.

### 2.3 Validate payloads with Pydantic
`Landmark` model exists but payloads are `List[Dict]`. Change `FramePayload.poseLandmarks: List[Landmark]` and `ShotSequencePayload.shot_sequence: List[List[Landmark]]`. Add bounds: sequence length ≤ 600 frames, each frame exactly 33 landmarks (reject otherwise with 422). Convert to dicts internally where existing utils expect dicts (`[lm.model_dump() for lm in ...]`).

### 2.4 Secure /api/track-ball
- Temp file: `temp_path = f"/tmp/{uuid.uuid4()}.mp4"` — never use the user-supplied filename.
- Enforce a max upload size (e.g., 50 MB) by checking `video.size` / streaming with a byte counter; reject with 413.
- Validate content type starts with `video/`.
- Use try/finally so the temp file is always removed.

### 2.5 CORS
Production frontend is https://www.cricketcoach.online (same-origin via Vercel rewrite, so CORS mostly moot there), but the standalone Render/Fly deployment needs it. Add `https://www.cricketcoach.online` and `https://cricketcoach.online` to defaults, keep the vercel.app regex, keep env override.

---

## Phase 3 — Scoring/model accuracy improvements (api/)

### 3.1 Length-normalize DTW score (api/dtw_utils.py)
`normalized = 100 - min(100, distance)` uses raw DTW distance, which grows with sequence length — longer recordings always score worse. Fix: get the warping path from fastdtw (`distance, path = fastdtw(...)`) and use `per_step = distance / max(1, len(path))`, then map: `score = max(0, 100 - per_step * K)` with K calibrated so a typical good rep lands 80–95 (start with K≈4 and tune against synthetic sequences in tests).

### 3.2 Resample sequences before comparison
User recordings vary from ~30 to 300+ frames while ideal models are ~10 keyframes. Before DTW, resample the user angle sequence to a fixed length (e.g., 50 points, `np.interp` per angle channel) and linearly upsample the ideal sequence to the same length. This makes scores comparable across recording durations and frame rates.

### 3.3 Smooth landmarks before angle extraction
MediaPipe jitter of a few degrees is normal. Apply a moving-average or One-Euro filter over each angle channel (window 5) in `evaluate_shot` before motion scoring and DTW. The bowling evaluator already median-filters — unify this into a shared `smooth_sequence()` helper in angle_utils.py used everywhere.

### 3.4 Handedness support for batting
Batting evaluation assumes right-handed (front knee = left). Add `is_right_handed: bool = True` to `ShotSequencePayload`, plumb through to `evaluate_shot`/`evaluate_batting_biomechanics`, and mirror the ideal model angle keys (swap left/right) for lefties. Frontend: add a left/right toggle in Controls.jsx, persisted to localStorage.

### 3.5 Visibility gating
Frames where key landmarks have `visibility < 0.5` produce garbage angles that pollute scores. In `extract_shot_angles`, return `None` (or omit the key) for any angle whose three landmarks aren't all ≥ 0.5 visibility; downstream code must skip missing values (it already uses `.get(key, 0)` — change those paths to filter out zeros/None consistently). Add a "tracking quality" percentage to the response (`frames_with_full_visibility / total`), and have the frontend warn when < 60%.

### 3.6 Honest confidence in bowling legality output
The ICC 15° check from a single 2D camera cannot match lab-grade 3D motion capture (elbow extension measured in the arm's plane, not the image plane; perspective foreshortening can add/remove tens of degrees). Do NOT present it as an official legality verdict:
- Rename response copy to "indicative screen" language; add a `disclaimer` field to the bowling response and render it in Feedback.jsx.
- Add a `camera_angle_warning` when detected shoulder width (|left_shoulder_x − right_shoulder_x|) is small (< ~0.08 normalized), meaning the user is side-on and elbow angles are unreliable — instruct them to film front-on/45°.

### 3.7 Use MediaPipe world landmarks (frontend, src/poseUtils.js + CameraFeed)
Currently only `results.poseLandmarks` (2D normalized image coordinates) are used, so all backend "3D" angles are effectively 2D projections. MediaPipe Pose also returns `results.poseWorldLandmarks` (metric 3D, hip-centered). Send both: keep 2D for canvas drawing, add `world_landmarks` to the analyze-shot payload and compute backend angles from world coordinates. This is the single biggest accuracy win available without new models. Keep backward compatibility: if world landmarks absent, fall back to 2D.

### 3.8 Calibration/eval harness (see Phase 6 for tests)
Create `api/eval/` with:
- `synthetic.py` — generates synthetic angle sequences: perfect ideal replays, time-stretched replays (0.5×–2×), noisy replays (±3° gaussian), and "sitting still" / "random flailing" sequences.
- `run_eval.py` — runs evaluate_shot over the suite and prints a score table. Acceptance targets: ideal replay ≥ 90; time-stretched ideal ≥ 85; noisy ideal ≥ 75; still/flailing ≤ 30. Tune K (3.1) and thresholds until targets pass. Commit the table output into the README's accuracy section.

---

## Phase 4 — Routing & structure (frontend)

### 4.1 Add react-router-dom
Routes: `/` (LandingPage), `/live` (CameraFeed), `/dashboard` (VideoDashboard), `/privacy`, `/terms`, `/contact`. Replace `activeTab` state with routes; keep lazy loading + Suspense. `vercel.json` SPA rewrite already handles deep links. Update all `onNavigate` props to `<Link>`/`useNavigate`. Verify back button, deep links, and that Helmet titles update per route.

### 4.2 Component extraction
Split App.jsx inline blocks into `components/Header.jsx`, `components/Hero.jsx`; reuse `components/Footer.jsx` everywhere. Move repeated inline styles to CSS classes. Target: App.jsx < 100 lines. CameraFeed.jsx: extract `TelemetryGauges`, `HistoryPanel`, `HudBanner`, `ShotSelector` subcomponents (aim < 400 lines in the main file). No visual changes.

---

## Phase 5 — PWA, privacy copy, branding

### 5.1 Fix offline support
sw.js precaches only `/`, index.html, manifest, icons — not the hashed Vite bundles, so offline launch renders a blank page. Replace hand-rolled sw.js with `vite-plugin-pwa` (generateSW, precache build assets, `navigateFallback: '/index.html'`, runtime NetworkOnly for `/api/*` and cross-origin CDN). Remove the manual registration in main.jsx (plugin handles it) and delete public/sw.js.

### 5.2 Make the privacy claim precise
Footer says "Camera data is processed locally — never uploaded", but pose landmark coordinates ARE sent to /api/analyze-shot. Change copy to: "Video never leaves your device — only anonymous joint coordinates are sent for scoring." Update PrivacyPolicy.jsx to state exactly what is transmitted (33 landmark coordinates per frame, no images/video), retention, and analytics (Google Analytics is loaded in index.html — disclose it).

### 5.3 Branding cleanup
- Remove or rename "// BIOTECH.AI" (biotech ≠ biomechanics; reads inflated). Suggest "SHADOWCOACH" alone or "SHADOWCOACH // BIOMECHANICS".
- Footer "© 2026 Sports Biomechanics Laboratory" — replace with "© 2026 Bilal Hasan" unless that entity exists.

---

## Phase 6 — Tests & CI

### 6.1 Backend tests (pytest)
Add `api/tests/` with `pip install pytest httpx`. Cover:
- angle_utils: known landmark triplets → expected angles (0°, 90°, 180° cases); low-visibility gating.
- dtw_utils: identical sequences score ≥ 95; length-doubled identical sequences score within 5 pts of original (regression for 3.1/3.2); empty input handling.
- shot_evaluator: sitting sequence scores ≤ 30; motion score monotonicity; bowling arm detection picks the high-variance arm; delivery-phase filtering.
- index.py via FastAPI TestClient: /api/health, /api/shots, 422 on malformed landmarks, 200 happy path on a synthetic good sequence.

### 6.2 Frontend
Fix any `npm run lint` errors introduced/existing. Optionally add vitest + a smoke test rendering App.

### 6.3 GitHub Actions
`.github/workflows/ci.yml`: two jobs — node (install, lint, build) and python (install requirements + pytest). Run on push/PR.

---

## Phase 7 — Repo hygiene & README

### 7.1 Remove large binaries
- `bowling_model.pt` (15 MB): if unused at runtime (grep confirms only train_action_model.py produces/loads it), remove from git and attach to a GitHub Release; document the link. Use `git rm` (history rewrite optional — skip filter-repo unless asked).
- Delete `Gemini_Generated_Image_*.png` (6.3 MB) and move `Cricket Coaching Website Feature Enhancement Report.pdf` out of the repo root (delete or /docs).

### 7.2 Rewrite README.md
Replace the default Vite template with: one-line pitch, live link, screenshot/GIF of the skeleton overlay, feature list (5 batting drills + ICC bowling screen, hands-free auto-record, PWA), architecture diagram (browser MediaPipe → landmarks → FastAPI DTW scoring), local dev quickstart (frontend + api), accuracy & limitations section (paste eval table from 3.8 and the 2D-camera caveats from 3.6), links to ARCHITECTURE.md / API_REFERENCE.md, license.

### 7.3 Consolidate docs
Root has 9 markdown docs. Move all except README into `/docs`, fix relative links, keep INDEX.md as the docs TOC.

---

## Acceptance checklist (agent must verify before finishing)
- [ ] `npm run build` and `npm run lint` pass
- [ ] `pytest api/tests` passes; eval harness meets targets in 3.8
- [ ] No detector recreation on analysis completion (verify: add temporary console.log in createPoseDetector, run a drill, confirm single init)
- [ ] Deep link to /live works after deploy preview; back button works
- [ ] Offline: build + `vite preview`, load page, go offline in devtools, reload — app shell renders
- [ ] /api/track-ball returns 501 (flagged off) on serverless, works on Docker deployment
- [ ] Repo clone size reduced (no .pt/.png/.pdf blobs at root)
- [ ] README shows screenshot, accuracy table, and limitations
