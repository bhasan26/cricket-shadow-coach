# Real-player validation

The synthetic scoring harness is a regression check. It does not establish
coaching accuracy, playing ability, or bowling legality. Do not present its
scores as measured real-player accuracy.

## Collect an independent evaluation set

Begin with the [3–5 player cover-drive pilot](PILOT_PROTOCOL.md) to check the
practice flow and coach feedback before expanding the evaluation set.

Start with 100–200 consented recordings across the five batting drills. Include
multiple players, handedness, phones, lighting conditions, and camera positions,
plus incomplete swings, occlusion, and deliberately incorrect movements.

Keep evaluation players and recording sessions separate from the reference data
and any data used to tune thresholds. Record device, view, handedness, intended
shot, and whether the full swing was visible alongside each clip.

Have a qualified cricket coach label the performed shot, whether the attempt
is assessable, and the single most useful correction. Ask a second coach to
review a subset so disagreements are visible rather than treated as model errors.

The existing fixture runner evaluates shot identity and reports scores:

```bash
cd api
python -m eval.run_fixtures fixtures/ --save-landmarks fixture-cache/
python -m eval.run_fixtures fixture-cache/
```

Coach annotations and feedback-agreement metrics still need to be added to the
fixture runner. Never use reference takes themselves as the held-out evaluation.

## Report evidence before changing scoring

- Shot identification: per-shot confusion matrix and confident false matches.
- Coaching: proportion of assessable attempts where the primary correction
  agrees with a coach; report disagreements and harmful/misleading cues.
- Tracking: lost-pose frames and missing joints over the full recording,
  including frames that currently never enter the captured sequence.
- Repeatability: spread across repeated equivalent strokes with an unchanged
  camera setup. Separate tracking variation from technique variation.
- Device experience: time to first usable tracking, observed FPS, and analysis
  response latency, split by device class.

Choose release thresholds after collecting baseline measurements. More generous
template tolerance is not evidence of better real-world coaching.

## Device acceptance before release

Automated regression tests cover recording caps, failed requests, cancellation,
retry identity, denied camera access, and failed model initialization. They use
simulated browser APIs and do not replace these physical-device checks:

1. On iOS Safari and Android Chrome, allow camera access, switch cameras, and
   record a full stroke. Verify video and skeleton stay aligned.
2. Deny access, then allow it and use Retry Camera. Recording must remain
   disabled until the model initializes successfully.
3. Block the model CDN, confirm the loading error, then restore access and retry.
4. Let a recording run to its limit; also step out of view during recording.
   Both must stop without exceeding the API frame cap.
5. Disconnect during analysis, reconnect, and retry the saved attempt. Confirm
   the original drill/handedness and exactly one history entry after success.
6. Cancel an analysis and navigate away during loading. Verify camera tracks
   stop on navigation and no abandoned loop restarts.
7. Install the PWA and open it offline. The shell should load; images are only
   available if previously viewed, and live scoring/model downloads need a
   connection.

## Subsequent implementation

- Extract camera capture and recording/analysis lifecycle from `CameraFeed`.
- Preserve full-recording detection coverage and timestamps through the API
  before adding confidence-based score suppression or changing interpolation.
- Extend the implemented five-repetition cover-drive flow to other shots only
  after the pilot establishes that the cues and session comparison are useful.
- Store scoring/reference version and setup context with history so scores from
  different algorithms or camera setups are not treated as directly comparable.
