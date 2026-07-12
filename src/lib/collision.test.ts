import { describe, expect, it } from 'vitest';
import type { Point, Wall } from '../types';
import { furnitureCorners, furnitureFits, slideFurniture } from './collision';

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

  it('rejects furniture overlapping another piece', () => {
    const other = furnitureCorners(item(2, 2.5), 0);
    // Directly on top of the other piece → overlap.
    expect(furnitureFits(item(2, 2.5), square, noWalls, [other])).toBe(false);
    // A whole metre away → clear.
    expect(furnitureFits(item(2, 3.6), square, noWalls, [other])).toBe(true);
  });

  it('treats flush-against another piece as fitting', () => {
    const other = furnitureCorners(item(2, 2.5), 0);
    // Two 1 m pieces exactly edge-to-edge (centres 1 m apart) — touching, not overlapping.
    expect(furnitureFits(item(2, 3.5), square, noWalls, [other])).toBe(true);
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

  it('stops against another piece instead of overlapping it', () => {
    // A 1 m piece at x=1 dragged right toward a piece centred at x=3: it should
    // stop roughly edge-to-edge (centres ~1 m apart) and never overlap.
    const other = furnitureCorners(item(3, 2.5), 0);
    const p = slideFurniture(item(1, 2.5), { x: 3, z: 2.5 }, square, noWalls, [other]);
    expect(p.x).toBeGreaterThan(1.5);
    expect(p.x).toBeLessThan(2.05);
    expect(furnitureFits(item(p.x, p.z), square, noWalls, [other])).toBe(true);
  });

  it('slides along another piece (moves on the free axis)', () => {
    // Blocked in x by a piece at x=3, but free to travel in z.
    const other = furnitureCorners(item(3, 2.5), 0);
    const p = slideFurniture(item(1, 2.5), { x: 3, z: 4 }, square, noWalls, [other]);
    expect(p.z).toBeCloseTo(4, 5);
    expect(furnitureFits(item(p.x, p.z), square, noWalls, [other])).toBe(true);
  });
});
