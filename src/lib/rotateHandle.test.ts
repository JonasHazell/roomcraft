import { describe, expect, it } from 'vitest';
import { rotateHandleRadius } from './rotateHandle';

describe('rotateHandleRadius', () => {
  it('adds a 0.22 m margin to the larger half-extent for a fine pointer', () => {
    // max(1.6, 2) / 2 = 1.0, + 0.22
    expect(rotateHandleRadius(1.6, 2, false)).toBeCloseTo(1.22, 5);
  });

  it('widens the margin to 0.34 m for a coarse (touch) pointer', () => {
    expect(rotateHandleRadius(1.6, 2, true)).toBeCloseTo(1.34, 5);
  });

  it('uses the larger of width/depth for the base radius', () => {
    expect(rotateHandleRadius(0.4, 1.2, false)).toBeCloseTo(0.82, 5); // 1.2/2 + 0.22
    expect(rotateHandleRadius(1.2, 0.4, false)).toBeCloseTo(0.82, 5); // symmetric
  });

  it('keeps exactly the PlanCorners 0.34 / 0.22 coarse-vs-fine gap', () => {
    expect(rotateHandleRadius(1, 1, true) - rotateHandleRadius(1, 1, false)).toBeCloseTo(0.12, 5);
  });
});
