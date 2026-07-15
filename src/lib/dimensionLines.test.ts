import { describe, expect, it } from 'vitest';
import type { Point, Wall } from '../types';
import { dimensionLines } from './dimensionLines';

/** 4×5 m room with a corner at the origin, canonical winding — same fixture shape as collision.test.ts. */
const square: Point[] = [
  { x: 0, z: 0 },
  { x: 4, z: 0 },
  { x: 4, z: 5 },
  { x: 0, z: 5 },
];

const walls: Wall[] = square.map((a, i) => ({
  id: `w${i}`,
  kind: 'exterior',
  a,
  b: square[(i + 1) % square.length],
}));

function item(x: number, z: number, width = 1, depth = 1, rotationY = 0) {
  return { position: { x, z }, rotationY, size: { width, depth, height: 1 } };
}

describe('dimensionLines', () => {
  it('draws a run to each wall for a piece centered in an empty room', () => {
    const lines = dimensionLines(item(2, 2.5), walls, []);
    // Four sides, four walls, none flush → four wall runs.
    expect(lines).toHaveLength(4);
    expect(lines.every((l) => l.target === 'wall')).toBe(true);
    // A 1×1 piece centered at (2, 2.5): 1.5 m to the near walls in x, 2 m in z.
    const dists = lines.map((l) => l.distance).sort((a, b) => a - b);
    expect(dists[0]).toBeCloseTo(1.5, 2);
    expect(dists[1]).toBeCloseTo(1.5, 2);
    expect(dists[2]).toBeCloseTo(2, 2);
    expect(dists[3]).toBeCloseTo(2, 2);
  });

  it('drops the side flush against a wall', () => {
    // 1×1 piece centered at x=0.5 sits flush on the west wall (left edge at x=0).
    const lines = dimensionLines(item(0.5, 2.5), walls, []);
    expect(lines).toHaveLength(3);
    expect(lines.every((l) => l.distance >= 0.02)).toBe(true);
  });

  it('measures to a neighbouring piece when one is nearer than the wall', () => {
    // A second piece 2 m north (center-to-center) → 1 m edge-to-edge gap, which is
    // nearer than the 2.5 m to the far wall on that side.
    const other = item(2, 4.5);
    const lines = dimensionLines(item(2, 2.5), walls, [other]);
    const toPiece = lines.filter((l) => l.target === 'furniture');
    expect(toPiece).toHaveLength(1);
    expect(toPiece[0].distance).toBeCloseTo(1, 2);
    // Its run reaches the neighbour's near edge (z = 4).
    expect(toPiece[0].to.z).toBeCloseTo(4, 2);
  });

  it('has each run start on the piece and end at its measured distance', () => {
    const lines = dimensionLines(item(2, 2.5), walls, []);
    for (const l of lines) {
      expect(Math.hypot(l.to.x - l.from.x, l.to.z - l.from.z)).toBeCloseTo(l.distance, 6);
    }
  });

  it('returns nothing when the room has no walls and no other furniture', () => {
    expect(dimensionLines(item(2, 2.5), [], [])).toEqual([]);
  });
});
