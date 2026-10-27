# Shot calculation corrections

Scoring method: `2`. Earlier practice summaries without a method are labelled
`legacy`. These methods should not be combined into one progress trend or a
two-set comparison.

The dot-product joint-angle formula and path-length normalization of DTW were
correct. The audit corrected the surrounding geometry and signal processing.

| Case | Previous result | Corrected calculation |
| --- | --- | --- |
| Image-space 45° joint in a 1280×720 frame | About 60.6° when normalized x/y were treated as equal units | 45° after converting y into width units |
| Resample `[10, missing, 30, 40]` to four points | `[10, 23.3, 33.3, 40]` | `[10, 20, 30, 40]`; observed frame positions remain fixed |
| Resample `[0, 10, 20]` | `[10, 15, 20]` | `[0, 10, 20]`; a genuine zero is retained |
| Average nine upright 0° frames and one 30° frame | 30°, because zeroes were discarded | 3° |
| Missing/zero-length bone | Reported as 0° | Unavailable, distinct from a real 0° angle |
| 25° image-space bowling extension | 5°, after subtracting a fixed 20° | 25°, with low confidence for image-space geometry |
| Elbow only flexes from 170° to 145° | 25° “extension” from max-minus-min | 0° straightening in time order |
| No DTW alignment path | Could map zero distance to 100 | 0 score for an invalid alignment |

## Processing changes

- The browser sends image dimensions and monotonic frame timestamps. The API
  validates frame alignment and strictly increasing finite timestamps.
- Whole-pose tracking failures remain explicitly untracked frames. They no
  longer disappear from the tracking-quality denominator.
- Joint angles use float64 on the backend. Missing, non-finite, or zero-length
  geometry stays unavailable rather than becoming a measured angle.
- Batting is resampled to a fixed 50-point timeline before smoothing. Motion
  differences are also measured on a fixed timeline so raw frame rate does not
  determine the erratic-motion penalty.
- Smoothing preserves tracking gaps when used on sparse input and clamps fitted
  joint angles to 0–180°. Interpolation uses the original sample positions or
  supplied capture timestamps, rather than concatenating surviving values.
- Bowling isolates the first observed delivery arc before filtering; gather,
  follow-through, and a later delivery cannot redefine its extension range.
  Only tracked arm samples define its wrist-high release proxy.
- A fixed perspective “leniency” is removed. Perspective uncertainty lowers
  confidence rather than subtracting degrees from a measurement.
- Feedback describes measured movement without inferring injury diagnoses from
  a single joint-flexion angle or an estimated torso axis.

## Evidence and remaining limits

Regression tests cover analytic 0°/45°/90°/180° geometry, square/landscape/portrait
images, missing samples, genuine zeroes, real capture times, repeated frames,
directed extension, separate delivery windows, and invalid alignments. The
synthetic scoring harness remains a consistency check, not real-player accuracy.

[MediaPipe's Pose documentation](https://chuoling.github.io/mediapipe/solutions/pose.html#pose_landmarks)
defines x/y normalization by width/height and z on roughly the x scale. World
landmarks use metres and are not aspect-scaled. Correcting image aspect ratio
does not make image depth a calibrated 3D measurement.

The [ICC definition](https://www.icc-cricket.com/about/cricket/rules-and-regulations/illegal-bowling-actions)
uses elbow extension between arm-horizontal and actual ball release. The app
does not detect the ball release or reproduce an accredited lab assessment; its
bowling output remains an indicative screen. The batting references, tolerance
bands, calibration offset, and 60/25/15 scoring weights are heuristics that still
need independent recordings and coach review. A mathematically sound computation
does not establish that its score measures cricket ability.
