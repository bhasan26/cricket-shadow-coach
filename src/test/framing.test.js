import { describe, it, expect } from 'vitest';
import { getFramingHint } from '../framing';

// 33 visible landmarks with shoulders/hips at the given normalized y positions.
const pose = ({ shoulderY, hipY, visibility = 0.9 }) =>
  Array.from({ length: 33 }, (_, i) => {
    let y = 0.5;
    if (i === 11 || i === 12) y = shoulderY;
    if (i === 23 || i === 24) y = hipY;
    return { x: 0.5, y, visibility };
  });

describe('getFramingHint', () => {
  it('accepts a well-framed body', () => {
    // Torso spans 30% of the frame — inside [0.15, 0.50].
    expect(getFramingHint(pose({ shoulderY: 0.3, hipY: 0.6 }))).toBe('');
  });

  it('asks to move back when too close', () => {
    expect(getFramingHint(pose({ shoulderY: 0.1, hipY: 0.75 }))).toMatch(/move back/i);
  });

  it('asks to move closer when too far', () => {
    expect(getFramingHint(pose({ shoulderY: 0.45, hipY: 0.55 }))).toMatch(/move closer/i);
  });

  it('asks for full body when landmarks are occluded', () => {
    const occluded = pose({ shoulderY: 0.3, hipY: 0.6 }).map((lm, i) =>
      i >= 25 ? { ...lm, visibility: 0.2 } : lm // legs out of frame
    );
    expect(getFramingHint(occluded)).toMatch(/whole body/i);
  });
});
