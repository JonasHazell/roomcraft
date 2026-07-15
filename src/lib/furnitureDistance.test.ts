import { describe, expect, it } from 'vitest';
import type { Point, Wall } from '../types';
import { nearestDistances, nearestPieceDistance, nearestWallDistance } from './furnitureDistance';

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

describe('nearestWallDistance', () => {
  it('is null when the room has no walls', () => {
    expect(nearestWallDistance(item(2, 2.5), [])).toBeNull();
  });

  it('is ~0 for a piece flush against a wall', () => {
    // 1×1 piece centered at x=0.5 has its left edge at x=0, on the west wall.
    expect(nearestWallDistance(item(0.5, 2.5), walls)).toBeCloseTo(0, 2);
  });

  it('is larger for a piece centered in the room than one against a wall', () => {
    const centered = nearestWallDistance(item(2, 2.5), walls)!;
    const flush = nearestWallDistance(item(0.5, 2.5), walls)!;
    expect(centered).toBeGreaterThan(flush);
    // Centered piece's nearest edge is 1.5 m from the closest wall (x=0 or x=4).
    expect(centered).toBeCloseTo(1.5, 2);
  });
});

describe('nearestPieceDistance', () => {
  it('is null when there is no other piece', () => {
    expect(nearestPieceDistance(item(2, 2.5), [])).toBeNull();
  });

  it('measures the gap to a nearby piece', () => {
    // Two 1×1 pieces 2 m apart center-to-center → 1 m edge-to-edge gap.
    const other = item(2, 4.5);
    expect(nearestPieceDistance(item(2, 2.5), [other])).toBeCloseTo(1, 2);
  });

  it('is ~0 when pieces are touching', () => {
    const other = item(2, 3.5); // 1 m apart center-to-center, edges touching.
    expect(nearestPieceDistance(item(2, 2.5), [other])).toBeCloseTo(0, 2);
  });

  it('picks the closer of two other pieces', () => {
    const near = item(2, 3.6); // ~0.1 m gap
    const far = item(2, 4.6); // ~1.1 m gap
    expect(nearestPieceDistance(item(2, 2.5), [far, near])).toBeCloseTo(0.1, 2);
  });
});

describe('nearestDistances', () => {
  it('combines both distances for a piece near a wall with no other furniture yet', () => {
    const result = nearestDistances(item(0.5, 2.5), walls, []);
    expect(result.wall).toBeCloseTo(0, 2);
    expect(result.piece).toBeNull();
  });

  it('combines both distances once a second piece is in the room', () => {
    const other = item(2, 4.5);
    const result = nearestDistances(item(2, 2.5), walls, [other]);
    expect(result.wall).toBeCloseTo(1.5, 2);
    expect(result.piece).toBeCloseTo(1, 2);
  });
});
