import { describe, expect, it } from 'vitest';
import { bedPillowWidth } from './Bed';

describe('bedPillowWidth', () => {
  it('sizes the pillow normally for a typical mattress slot', () => {
    // Unclamped case: 0.9 - 0.12 = 0.78 -> capped at the 0.5 max.
    expect(bedPillowWidth(0.9)).toBeCloseTo(0.5);
    // A narrower single-mattress slot stays under the 0.5 cap: 0.4 - 0.12 = 0.28.
    expect(bedPillowWidth(0.4)).toBeCloseTo(0.28);
  });

  it('never goes negative for a narrow, multi-mattress bed', () => {
    // A bed at (or below) its 5cm declared minimum width, split across 2
    // mattresses, would — unclamped — drive slot.width, and so pillowW,
    // negative. mattresses: 2 is an exposed option; the generic size fields
    // allow width down to 0.05m, so slotW can drop well under the 0.12m
    // subtracted here.
    expect(bedPillowWidth(0.1)).toBeGreaterThan(0);
    expect(bedPillowWidth(0.05)).toBeGreaterThan(0);
    expect(bedPillowWidth(0)).toBeGreaterThan(0);
    expect(bedPillowWidth(-0.5)).toBeGreaterThan(0);
  });
});
