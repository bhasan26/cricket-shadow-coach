# Cover-drive practice pilot

Status: ready to run; no physical-device or player results have been collected.

This pilot checks whether people can complete the practice flow and whether a
coach finds the selected focus useful. Three to five players are enough to find
early problems, not to establish accuracy or training effectiveness.

## Before inviting players

Run the physical-device checks in [VALIDATION_PLAN.md](VALIDATION_PLAN.md) on an
iPhone with Safari and an Android phone with Chrome. Record phone model, OS,
browser version, test date, and pass/fail for each check. Also verify:

- Start cover-drive practice from `/live` and finish both sets using the controls
  above the camera, without depending on desktop-only controls.
- After the first five, recording pauses until Start second set is selected.
  Hands-free recording must also pause at this boundary.
- A tracking failure or interrupted request keeps the same attempt number.
- The drill, batting hand, and camera selection stay fixed during both sets.
- Reload midway and verify progress restores. Camera permission may be needed
  again; place the phone in its original position before continuing.
- After ten accepted attempts, the comparison displays and the downloadable
  summary contains scores and setup information, with no video or landmarks.
- Open Progress, start a new practice, and return to Progress. The previous
  completed comparison must still be present. Verify hand/camera filters and
  past-session downloads on both phone browsers.

Do not report these checks as passed until they have been run on real devices.

## Run one session per player

1. Assign a participant code such as P01. Avoid putting names in test artifacts.
   Explain what the app sends (joint coordinates for scoring), what it stores
   locally, and whether you plan to separately record video for review.
2. Record the setup: device/browser, lighting, camera view and distance, and
   batting hand. Keep this setup unchanged for both sets.
3. Ask the player to complete the first five cover drives. Log rejected attempts,
   retries, and any places where they needed help using the app.
4. Have the coach independently note one practice focus before reading the app's
   focus. Then record whether the app's cue is reasonable, unrelated, unclear,
   or misleading. Do not treat a different wording as automatic disagreement.
5. Let the player read the cue and complete the second five. Ask whether they
   understood the cue and could apply it without further explanation.
6. Download the practice summary. If the player chooses to share it with you,
   associate the file with the participant code and session notes. The app does
   not upload summaries automatically.

## Session notes

Copy this table for each session; leave unknown and untested fields explicit.

| Field | Observation |
| --- | --- |
| Participant code / practice ID | |
| Phone / OS / browser | |
| Batting hand / camera view / distance / lighting | |
| Completed ten accepted attempts without help? | |
| Rejected attempts / network retries / unexpected counts | |
| Coach's independent focus | |
| App focus | |
| Coach assessment: reasonable / unrelated / unclear / misleading | |
| Player understood and could try the cue? | |
| First / second average match and score spread | |
| Any setup changes, tracking problems, or confusing UI | |

## Review before the next release

Summarize completion counts, common points of confusion, rejected-attempt counts,
and coach assessments. Keep scores separate from usability and coaching evidence:
a higher second-set match alone does not prove improved technique. Do not tune
thresholds just to make the second set look better.

Fix recurring completion problems first. Revise a cue only with coach feedback.
Then grow the independent evaluation set described in VALIDATION_PLAN.md before
making accuracy claims or expanding the guided flow to other strokes.
