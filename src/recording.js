// Keep the frame cap aligned with MAX_SEQUENCE_FRAMES in api/index.py.
export const MAX_RECORDING_FRAMES = 600;
export const MAX_RECORDING_MS = 15_000;

export function copyLandmarks(landmarks) {
  return landmarks.map(({ x, y, z, visibility }) => ({
    x, y, z, visibility: visibility ?? 1.0,
  }));
}
