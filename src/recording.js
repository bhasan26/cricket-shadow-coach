// Keep the frame cap aligned with MAX_SEQUENCE_FRAMES in api/index.py.
export const MAX_RECORDING_FRAMES = 600;
export const MAX_RECORDING_MS = 15_000;

export function copyLandmarks(landmarks) {
  return landmarks.map(({ x, y, z, visibility }) => ({
    x, y, z, visibility: visibility ?? 1.0,
  }));
}

export function appendRecordingFrame(frames, landmarks, world, timestampMs = performance.now()) {
  if (frames.length >= MAX_RECORDING_FRAMES) return true;
  const missing = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
  frames.push({
    // Unknown coordinates are explicitly untracked, never measured zeroes.
    // Keep these frames so losing the whole pose does not inflate quality.
    landmarks: copyLandmarks(landmarks || missing),
    world: world ? copyLandmarks(world) : (!landmarks ? copyLandmarks(missing) : null),
    timestamp: Math.max(timestampMs, (frames.at(-1)?.timestamp ?? timestampMs - 1) + 0.001),
  });
  return frames.length >= MAX_RECORDING_FRAMES;
}
