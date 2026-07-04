import { describe, expect, it } from 'vitest';
import type { Point, Wall } from '../types';
import { furnitureFits, slideFurniture } from './geometry';

/** 4×5 m room with a corner at the origin, canonical winding. */
const square: Point[] = [
  { x: 0, z: 0 },
  { x: 4, z: 0 },
  { x: 4, z: 5 },
  { x: 0, z: 5 },
];

const noWalls: Wall[] = [];

function item(x: number, z: number, width = 1, depth = 1, rotationY = 0) {
  return { position: { x, z }, rotationY, size: { width, depth, height: 1 } };
}

describe('furnitureFits', () => {
  it('accepts furniture in the middle of the room', () => {
    expect(furnitureFits(item(2, 2.5), square, noWalls)).toBe(true);
  });

  it('accepts flush against a wall', () => {
    expect(furnitureFits(item(0.5, 2.5), square, noWalls)).toBe(true);
  });

  it('rejects furniture sticking through an exterior wall', () => {
    expect(furnitureFits(item(0.3, 2.5), square, noWalls)).toBe(false);
  });

  it('takes rotation into account', () => {
    // 2 m wide piece 0.6 m from the wall: fine untouched, but rotated 90° it sticks out.
    expect(furnitureFits(item(2, 0.6, 2, 0.8), square, noWalls)).toBe(true);
    expect(furnitureFits(item(2, 0.6, 2, 0.8, Math.PI / 2), square, noWalls)).toBe(false);
  });

  it('rejects furniture cutting across a notch in an L-shaped room', () => {
    const lShape: Point[] = [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 2 },
      { x: 2, z: 2 },
      { x: 2, z: 5 },
      { x: 0, z: 5 },
    ];
    // Wide piece whose corners sit in separate arms but whose edge crosses the notch.
    expect(furnitureFits(item(2, 1.9, 3.8, 0.4), lShape, noWalls)).toBe(false);
  });

  it('rejects furniture overlapping an interior wall', () => {
    const wall: Wall = { id: 'iw', kind: 'interior', a: { x: 2, z: 0 }, b: { x: 2, z: 5 } };
    expect(furnitureFits(item(2, 2.5), square, [wall])).toBe(false);
    expect(furnitureFits(item(1, 2.5), square, [wall])).toBe(true);
  });
});

describe('slideFurniture', () => {
  it('moves freely when the target fits', () => {
    const p = slideFurniture(item(2, 2.5), { x: 3, z: 3 }, square, noWalls);
    expect(p).toEqual({ x: 3, z: 3 });
  });

  it('stops against the wall in the drag direction but slides along it', () => {
    // Target far outside the left wall and a bit downward: x stops near 0.5
    // (half the width), z follows all the way.
    const p = slideFurniture(item(2, 2.5), { x: -3, z: 3.5 }, square, noWalls);
    expect(p.x).toBeGreaterThan(0.4);
    expect(p.x).toBeLessThan(0.7);
    expect(p.z).toBeCloseTo(3.5, 5);
    expect(furnitureFits(item(p.x, p.z), square, noWalls)).toBe(true);
  });

  it('does not let the furniture through an interior wall', () => {
    const wall: Wall = { id: 'iw', kind: 'interior', a: { x: 2, z: 0 }, b: { x: 2, z: 5 } };
    const p = slideFurniture(item(1, 2.5), { x: 3, z: 2.5 }, square, [wall]);
    // Wall face at 1.94 (thickness 0.12) minus half the width → center ~1.45.
    expect(p.x).toBeGreaterThan(1.3);
    expect(p.x).toBeLessThan(1.5);
    expect(furnitureFits(item(p.x, p.z), square, [wall])).toBe(true);
  });
});
