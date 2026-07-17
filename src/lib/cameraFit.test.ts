import { describe, expect, it } from 'vitest';
import type { Point } from '../types';
import { initialCameraPosition } from './cameraFit';
import { polygonCenter } from './polygon';

/** An axis-aligned rectangular floor w×d metres, centred at (cx, cz). */
function rect(w: number, d: number, cx = 0, cz = 0): Point[] {
  return [
    { x: cx - w / 2, z: cz - d / 2 },
    { x: cx + w / 2, z: cz - d / 2 },
    { x: cx + w / 2, z: cz + d / 2 },
    { x: cx - w / 2, z: cz + d / 2 },
  ];
}

function place(floor: Point[]) {
  const center = polygonCenter(floor);
  return { center, pos: initialCameraPosition(floor, center) };
}

const distFromCenter = (pos: [number, number, number], c: Point) =>
  Math.hypot(pos[0] - c.x, pos[1], pos[2] - c.z);

describe('initialCameraPosition', () => {
  it('keeps the original framing for a small/typical room', () => {
    // A 4×5 room (extent 5 = the reference) uses scale 1: the historical offset.
    const { pos } = place(rect(4, 5));
    expect(pos[0]).toBeCloseTo(7, 5);
    expect(pos[1]).toBeCloseTo(5.5, 5);
    expect(pos[2]).toBeCloseTo(8.5, 5);
  });

  it('does not move closer than the original for a tiny room', () => {
    // A 3×3 room would scale to 0.6 but is clamped to 1 — no regression.
    const { pos } = place(rect(3, 3));
    expect(pos[0]).toBeCloseTo(7, 5);
    expect(pos[1]).toBeCloseTo(5.5, 5);
    expect(pos[2]).toBeCloseTo(8.5, 5);
  });

  it('pulls the camera farther back for a larger room', () => {
    const small = place(rect(4, 5));
    const large = place(rect(12, 12));
    // 12/5 = 2.4× the base offset.
    expect(large.pos[0]).toBeCloseTo(7 * 2.4, 5);
    expect(large.pos[1]).toBeCloseTo(5.5 * 2.4, 5);
    expect(large.pos[2]).toBeCloseTo(8.5 * 2.4, 5);
    expect(distFromCenter(large.pos, large.center)).toBeGreaterThan(
      distFromCenter(small.pos, small.center),
    );
  });

  it('scales off the longer side for an elongated room', () => {
    const { pos } = place(rect(3, 10)); // extent 10 → 2× base
    expect(pos[0]).toBeCloseTo(7 * 2, 5);
    expect(pos[2]).toBeCloseTo(8.5 * 2, 5);
  });

  it('caps the pull-back for a very large room (stays within maxDistance)', () => {
    const { pos, center } = place(rect(40, 40)); // would be 8× → clamped to 3×
    expect(pos[0]).toBeCloseTo(21, 5);
    expect(pos[1]).toBeCloseTo(16.5, 5);
    expect(pos[2]).toBeCloseTo(25.5, 5);
    expect(distFromCenter(pos, center)).toBeLessThan(40); // OrbitControls maxDistance
  });

  it('preserves the viewing direction (offset ratio) at every size', () => {
    for (const floor of [rect(3, 3), rect(4, 5), rect(12, 12), rect(40, 40)]) {
      const { pos, center } = place(floor);
      expect((pos[0] - center.x) / (pos[2] - center.z)).toBeCloseTo(7 / 8.5, 5);
    }
  });

  it('offsets from the room centre, wherever the room sits', () => {
    const { pos, center } = place(rect(4, 5, 10, -3));
    expect(center.x).toBeCloseTo(10, 5);
    expect(center.z).toBeCloseTo(-3, 5);
    expect(pos[0]).toBeCloseTo(10 + 7, 5);
    expect(pos[2]).toBeCloseTo(-3 + 8.5, 5);
  });
});
