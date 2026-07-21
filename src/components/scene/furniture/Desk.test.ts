import { describe, expect, it } from 'vitest';
import { deskScreenWidth } from './Desk';

describe('deskScreenWidth', () => {
  it('sizes screens normally for a typical desk width', () => {
    // Unclamped case: (1.2 * 0.9) / 1 - 0.08 = 1 -> capped at the 0.6 max.
    expect(deskScreenWidth(1.2, 1)).toBeCloseTo(0.6);
    // Two monitors split the same desk: (1.2 * 0.9) / 2 - 0.08 = 0.46.
    expect(deskScreenWidth(1.2, 2)).toBeCloseTo(0.46);
  });

  it('never goes negative for a narrow desk with multiple monitors', () => {
    // A desk at (or below) its 5cm declared minimum width with 2 monitors would,
    // unclamped, drive screenW negative — the same degenerate-geometry failure
    // mode fixed in Nightstand's drawerH (see #349/64849c5).
    expect(deskScreenWidth(0.05, 2)).toBeGreaterThan(0);
    expect(deskScreenWidth(0.18, 2)).toBeGreaterThan(0);
    expect(deskScreenWidth(0, 2)).toBeGreaterThan(0);
  });
});
