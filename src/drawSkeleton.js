export function drawSkeleton(ctx, poseLandmarks) {
  if (!ctx || !poseLandmarks) {
    return;
  }

  const { canvas } = ctx;
  const width = canvas.width;
  const height = canvas.height;

  const segments = [
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
    [23, 25],
    [25, 27],
    [24, 26],
    [26, 28],
  ];

  ctx.beginPath();

  for (const [startIndex, endIndex] of segments) {
    const start = poseLandmarks[startIndex];
    const end = poseLandmarks[endIndex];

    if (!start || !end) {
      continue;
    }

    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
  }

  ctx.stroke();
}
