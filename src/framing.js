/**
 * Pre-drill camera framing check.
 *
 * Analysis validity depends on the whole body being tracked at a sensible
 * distance. Torso = mid-shoulder → mid-hip in normalized image space. Bounds
 * chosen from typical MediaPipe framing; verify on a real camera before
 * tightening.
 */

const FRAMING_TORSO_MIN = 0.15; // smaller ⇒ too far away
const FRAMING_TORSO_MAX = 0.50; // larger ⇒ too close, limbs will leave frame
const FRAMING_MIN_VISIBLE = 30; // of 33 landmarks at visibility > 0.5

// How long a hint must persist before showing (debounce, no flicker).
export const FRAMING_HINT_HOLD_MS = 800;

// Compute a framing hint ('' = well framed) from raw screen landmarks.
export const getFramingHint = (landmarks) => {
  const visible = landmarks.filter(lm => (lm.visibility ?? 1) > 0.5).length;
  if (visible < FRAMING_MIN_VISIBLE) {
    return 'Step back — make sure your whole body is in frame';
  }
  const torso = Math.abs(
    (landmarks[11].y + landmarks[12].y) / 2 - (landmarks[23].y + landmarks[24].y) / 2
  );
  if (torso > FRAMING_TORSO_MAX) return 'Move back from the camera';
  if (torso < FRAMING_TORSO_MIN) return 'Move closer to the camera';
  return '';
};
