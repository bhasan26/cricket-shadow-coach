export function calculateAngleJS(a, b, c) {
  if (!a || !b || !c) return 0;
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const normBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y + ba.z * ba.z);
  const normBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z);
  if (normBA === 0 || normBC === 0) return 0;
  let cosine = dot / (normBA * normBC);
  cosine = Math.max(-1.0, Math.min(1.0, cosine));
  const rad = Math.acos(cosine);
  return Math.round(rad * (180 / Math.PI));
}

export function calculateSpineTiltJS(landmarks) {
  if (!landmarks[11] || !landmarks[12] || !landmarks[23] || !landmarks[24]) return 0;
  const midShoulder = {
    x: (landmarks[11].x + landmarks[12].x) / 2,
    y: (landmarks[11].y + landmarks[12].y) / 2,
    z: (landmarks[11].z + landmarks[12].z) / 2
  };
  const midHip = {
    x: (landmarks[23].x + landmarks[24].x) / 2,
    y: (landmarks[23].y + landmarks[24].y) / 2,
    z: (landmarks[23].z + landmarks[24].z) / 2
  };
  const torso = {
    x: midShoulder.x - midHip.x,
    y: midShoulder.y - midHip.y,
    z: midShoulder.z - midHip.z
  };
  const vertical = { x: 0, y: -1, z: 0 };
  const dot = torso.x * vertical.x + torso.y * vertical.y + torso.z * vertical.z;
  const normTorso = Math.sqrt(torso.x * torso.x + torso.y * torso.y + torso.z * torso.z);
  if (normTorso === 0) return 0;
  let cosine = dot / normTorso;
  cosine = Math.max(-1.0, Math.min(1.0, cosine));
  const rad = Math.acos(cosine);
  return Math.round(rad * (180 / Math.PI));
}

function getAngleColor(type, value) {
  if (type.includes('elbow')) {
    if (value >= 145 && value <= 175) return '#10b981'; // Green
    if (value >= 130 && value <= 180) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  }
  if (type.includes('knee')) {
    if (value >= 120 && value <= 150) return '#10b981';
    if (value >= 110 && value <= 165) return '#f59e0b';
    return '#ef4444';
  }
  if (type === 'spine') {
    if (value >= 5 && value <= 22) return '#10b981';
    if (value >= 0 && value <= 32) return '#f59e0b';
    return '#ef4444';
  }
  return '#10b981';
}

function drawPulsingRing(ctx, x, y, color) {
  const time = performance.now() / 1000;
  const pulse = Math.abs(Math.sin(time * Math.PI * 1.5)); // 1.5Hz pulse
  const radius = 10 + pulse * 18; 
  const opacity = 0.6 - pulse * 0.6;
  
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(239, 68, 68, ${opacity})`; 
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawAngleArc(ctx, center, pA, pC, color, width, height) {
    if (!center || !pA || !pC) return;
    const cx = center.x * width, cy = center.y * height;
    const ax = pA.x * width, ay = pA.y * height;
    const cx2 = pC.x * width, cy2 = pC.y * height;

    const angleA = Math.atan2(ay - cy, ax - cx);
    const angleC = Math.atan2(cy2 - cy, cx2 - cx);
    
    let diff = angleC - angleA;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 28, angleA, angleA + diff, diff < 0);
    
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
    } else {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    }
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
}

function drawJointBadge(ctx, text, x, y, color) {
  ctx.save();
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  const textWidth = ctx.measureText(text).width;
  const paddingX = 8;
  const paddingY = 4;
  const badgeWidth = textWidth + paddingX * 2;
  const badgeHeight = 16 + paddingY * 2;
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  
  const rx = x - badgeWidth / 2;
  const ry = y - badgeHeight - 10;
  
  ctx.beginPath();
  ctx.roundRect(rx, ry, badgeWidth, badgeHeight, 6);
  ctx.fill();
  ctx.stroke();
  
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(text, rx + paddingX, ry + 15);
  ctx.restore();
}

// Vector blueprint footprint drawer
function drawFootprint(ctx, x, y, width, height, isRight, isAligned) {
  ctx.save();
  ctx.strokeStyle = isAligned ? '#10b981' : '#0ea5e9'; // Green if locked, blue if tracking
  ctx.fillStyle = isAligned ? 'rgba(16, 185, 129, 0.15)' : 'rgba(14, 165, 233, 0.08)';
  ctx.lineWidth = 2;
  ctx.shadowColor = isAligned ? '#10b981' : '#0ea5e9';
  ctx.shadowBlur = isAligned ? 12 : 6;
  
  // 1. Draw Sole capsule
  ctx.beginPath();
  ctx.ellipse(x, y + height * 0.1, width * 0.7, height * 0.8, isRight ? 0.08 : -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // 2. Draw Heel circle
  ctx.beginPath();
  ctx.arc(x, y + height * 0.5, width * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Draw 5 vector toes
  const toeY = y - height * 0.5;
  const toeSpacing = width * 0.22;
  ctx.fillStyle = isAligned ? '#10b981' : '#0ea5e9';
  ctx.shadowBlur = 0;
  
  for (let i = 0; i < 5; i++) {
    const toeRadius = (i === 0) ? width * 0.22 : (width * (0.18 - i * 0.02));
    const toeXOffset = isRight 
      ? (-width * 0.45 + i * toeSpacing) 
      : (width * 0.45 - i * toeSpacing);
    
    ctx.beginPath();
    ctx.arc(x + toeXOffset, toeY + Math.abs(i - 2) * 1.5, toeRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const GHOST_POSES = {
  cover_drive: {
    11: { x: 0.58, y: 0.38 }, 12: { x: 0.44, y: 0.38 },
    13: { x: 0.65, y: 0.46 }, 14: { x: 0.38, y: 0.44 },
    15: { x: 0.70, y: 0.60 }, 16: { x: 0.56, y: 0.58 },
    23: { x: 0.56, y: 0.63 }, 24: { x: 0.44, y: 0.63 },
    25: { x: 0.63, y: 0.78 }, 26: { x: 0.42, y: 0.75 },
    27: { x: 0.66, y: 0.94 }, 28: { x: 0.40, y: 0.92 }
  },
  straight_drive: {
    11: { x: 0.56, y: 0.36 }, 12: { x: 0.44, y: 0.36 },
    13: { x: 0.58, y: 0.48 }, 14: { x: 0.42, y: 0.46 },
    15: { x: 0.52, y: 0.68 }, 16: { x: 0.48, y: 0.66 },
    23: { x: 0.55, y: 0.62 }, 24: { x: 0.45, y: 0.62 },
    25: { x: 0.58, y: 0.78 }, 26: { x: 0.43, y: 0.76 },
    27: { x: 0.60, y: 0.94 }, 28: { x: 0.42, y: 0.94 }
  },
  pull_shot: {
    11: { x: 0.54, y: 0.38 }, 12: { x: 0.42, y: 0.38 },
    13: { x: 0.66, y: 0.34 }, 14: { x: 0.30, y: 0.36 },
    15: { x: 0.74, y: 0.38 }, 16: { x: 0.22, y: 0.40 },
    23: { x: 0.54, y: 0.62 }, 24: { x: 0.42, y: 0.62 },
    25: { x: 0.57, y: 0.75 }, 26: { x: 0.38, y: 0.74 },
    27: { x: 0.56, y: 0.92 }, 28: { x: 0.40, y: 0.92 }
  },
  defensive_block: {
    11: { x: 0.58, y: 0.40 }, 12: { x: 0.46, y: 0.40 },
    13: { x: 0.60, y: 0.50 }, 14: { x: 0.42, y: 0.48 },
    15: { x: 0.54, y: 0.65 }, 16: { x: 0.48, y: 0.63 },
    23: { x: 0.57, y: 0.65 }, 24: { x: 0.46, y: 0.65 },
    25: { x: 0.62, y: 0.78 }, 26: { x: 0.44, y: 0.76 },
    27: { x: 0.64, y: 0.94 }, 28: { x: 0.43, y: 0.92 }
  },
  flick_shot: {
    11: { x: 0.55, y: 0.36 }, 12: { x: 0.43, y: 0.36 },
    13: { x: 0.62, y: 0.46 }, 14: { x: 0.36, y: 0.44 },
    15: { x: 0.58, y: 0.62 }, 16: { x: 0.48, y: 0.60 },
    23: { x: 0.54, y: 0.62 }, 24: { x: 0.42, y: 0.62 },
    25: { x: 0.59, y: 0.78 }, 26: { x: 0.38, y: 0.74 },
    27: { x: 0.62, y: 0.94 }, 28: { x: 0.36, y: 0.92 }
  },
  bowling_action: {
    11: { x: 0.53, y: 0.34 }, 12: { x: 0.41, y: 0.34 },
    13: { x: 0.58, y: 0.38 }, 14: { x: 0.36, y: 0.16 },
    15: { x: 0.62, y: 0.50 }, 16: { x: 0.33, y: 0.02 },
    23: { x: 0.52, y: 0.60 }, 24: { x: 0.40, y: 0.60 },
    25: { x: 0.55, y: 0.76 }, 26: { x: 0.36, y: 0.74 },
    27: { x: 0.57, y: 0.94 }, 28: { x: 0.34, y: 0.92 }
  }
};

export function drawSkeleton(ctx, poseLandmarks, ghostType = null, trails = []) {
  if (!ctx) return;

  const { canvas } = ctx;
  const width = canvas.width;
  const height = canvas.height;

  // 0. Draw Fading Movement Trails
  if (trails && trails.length > 0) {
    ctx.save();
    // Key joints to track: wrists (15, 16) and ankles (27, 28)
    const trackedJoints = [15, 16, 27, 28];
    for (const jointIdx of trackedJoints) {
      ctx.beginPath();
      let first = true;
      for (let i = 0; i < trails.length; i++) {
        const frame = trails[i];
        if (!frame[jointIdx]) continue;
        const x = frame[jointIdx].x * width;
        const y = frame[jointIdx].y * height;
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4;
      // Fading orange trail
      ctx.strokeStyle = `rgba(255, 159, 13, 0.45)`;
      ctx.shadowColor = '#ff9f0d';
      ctx.shadowBlur = 10;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 1. Draw Footprint Blueprints at the bottom of the canvas
  if (ghostType) {
    const isRightDrill = ghostType !== 'pull_shot'; // Pull has open stance
    const targetLeftFoot = { x: 0.58 * width, y: 0.94 * height };
    const targetRightFoot = { x: 0.42 * width, y: 0.92 * height };
    
    let leftAligned = false;
    let rightAligned = false;
    
    if (poseLandmarks) {
      const leftAnkle = poseLandmarks[27];
      const rightAnkle = poseLandmarks[28];
      
      // Check if player's live ankles align with blueprints (threshold 0.07 fraction)
      if (leftAnkle && Math.abs(leftAnkle.x - 0.58) < 0.07 && Math.abs(leftAnkle.y - 0.94) < 0.07) {
        leftAligned = true;
      }
      if (rightAnkle && Math.abs(rightAnkle.x - 0.42) < 0.07 && Math.abs(rightAnkle.y - 0.92) < 0.07) {
        rightAligned = true;
      }
    }
    
    // Draw vector soles (18px wide, 35px high)
    drawFootprint(ctx, targetLeftFoot.x, targetLeftFoot.y, 18, 36, false, leftAligned);
    drawFootprint(ctx, targetRightFoot.x, targetRightFoot.y, 18, 36, true, rightAligned);
  }

  // 2. Draw Ghost Silhouette if enabled
  if (ghostType && GHOST_POSES[ghostType]) {
    const ghost = GHOST_POSES[ghostType];
    const ghostSegments = [
      [11, 13], [13, 15], [12, 14], [14, 16],
      [23, 25], [25, 27], [24, 26], [26, 28],
      [11, 12], [23, 24], [11, 23], [12, 24]
    ];
    
    ctx.save();
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.3)'; 
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.setLineDash([5, 5]); 
    ctx.shadowColor = '#0ea5e9';
    ctx.shadowBlur = 12;

    for (const [startIdx, endIdx] of ghostSegments) {
      const start = ghost[startIdx];
      const end = ghost[endIdx];
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }
    }
    
    ctx.fillStyle = 'rgba(14, 165, 233, 0.4)';
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    for (const key of Object.keys(ghost)) {
      const pt = ghost[key];
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  if (!poseLandmarks) return;

  // 3. Draw live user skeleton
  const anglesToCalculate = [
    { type: 'left_elbow', indices: [11, 13, 15], label: 'L-Elbow' },
    { type: 'right_elbow', indices: [12, 14, 16], label: 'R-Elbow' },
    { type: 'left_knee', indices: [23, 25, 27], label: 'L-Knee' },
    { type: 'right_knee', indices: [24, 26, 28], label: 'R-Knee' }
  ];

  const boneSegments = [
    { start: 11, end: 13, type: 'left_elbow' },
    { start: 13, end: 15, type: 'left_elbow' },
    { start: 12, end: 14, type: 'right_elbow' },
    { start: 14, end: 16, type: 'right_elbow' },
    { start: 23, end: 25, type: 'left_knee' },
    { start: 25, end: 27, type: 'left_knee' },
    { start: 24, end: 26, type: 'right_knee' },
    { start: 26, end: 28, type: 'right_knee' },
    { start: 11, end: 12, type: 'spine' },
    { start: 23, end: 24, type: 'spine' },
    { start: 11, end: 23, type: 'spine' },
    { start: 12, end: 24, type: 'spine' }
  ];

  const angleValues = {};
  for (const item of anglesToCalculate) {
    const [a, b, c] = item.indices.map(idx => poseLandmarks[idx]);
    if (a && b && c) {
      angleValues[item.type] = calculateAngleJS(a, b, c);
    }
  }
  const liveSpineTilt = calculateSpineTiltJS(poseLandmarks);
  angleValues['spine'] = liveSpineTilt;

  for (const seg of boneSegments) {
    const start = poseLandmarks[seg.start];
    const end = poseLandmarks[seg.end];
    if (!start || !end) continue;
    
    const visStart = start.visibility !== undefined ? start.visibility : 1.0;
    const visEnd = end.visibility !== undefined ? end.visibility : 1.0;
    if (visStart < 0.35 || visEnd < 0.35) continue;

    ctx.save();
    const liveVal = angleValues[seg.type];
    const color = getAngleColor(seg.type, liveVal);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    
    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
    ctx.restore();
  }

  for (const item of anglesToCalculate) {
    const vertexIdx = item.indices[1];
    const ptA = poseLandmarks[item.indices[0]];
    const vertex = poseLandmarks[vertexIdx];
    const ptC = poseLandmarks[item.indices[2]];
    const val = angleValues[item.type];
    
    if (vertex && ptA && ptC && val !== undefined) {
      const vis = vertex.visibility !== undefined ? vertex.visibility : 1.0;
      if (vis > 0.45) {
        const color = getAngleColor(item.type, val);
        
        // Draw the visual angle arc
        drawAngleArc(ctx, vertex, ptA, ptC, color, width, height);
        
        // Draw pulsing ring for errors
        if (color === '#ef4444') {
          drawPulsingRing(ctx, vertex.x * width, vertex.y * height, color);
        }
        
        drawJointBadge(ctx, `${item.label}: ${val}°`, vertex.x * width, vertex.y * height, color);
      }
    }
  }

  const shL = poseLandmarks[11];
  const shR = poseLandmarks[12];
  if (shL && shR && (shL.visibility > 0.45 && shR.visibility > 0.45)) {
    const midX = ((shL.x + shR.x) / 2) * width;
    const midY = ((shL.y + shR.y) / 2) * height;
    const color = getAngleColor('spine', liveSpineTilt);
    drawJointBadge(ctx, `Balance: ${liveSpineTilt}°`, midX, midY, color);
  }
}
