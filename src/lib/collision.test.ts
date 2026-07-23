import { describe, expect, it } from 'vitest';
import type { Point, Wall } from '../types';
import { findClearSpot, furnitureCorners, furnitureFits, slideFurniture } from './collision';

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

describe('findClearSpot', () => {
  it('keeps the candidate spot when it already fits', () => {
    const p = findClearSpot(item(2, 2.5), { x: 2, z: 2.5 }, square, noWalls, []);
    expect(p).toEqual({ x: 2, z: 2.5 });
  });

  it('moves off a spot that overlaps another piece, landing somewhere clear', () => {
    const other = furnitureCorners(item(2, 2.5), 0);
    const p = findClearSpot(item(2, 2.5), { x: 2, z: 2.5 }, square, noWalls, [other]);
    expect(p).not.toEqual({ x: 2, z: 2.5 });
    expect(furnitureFits(item(p.x, p.z), square, noWalls, [other])).toBe(true);
  });

  it('falls back to the candidate spot when the room is too full to find a clear one', () => {
    // Fill the whole room with one giant obstacle — no ring candidate can fit.
    const other = furnitureCorners(item(2, 2.5, 4, 5), 0);
    const p = findClearSpot(item(2, 2.5), { x: 2, z: 2.5 }, square, noWalls, [other]);
    expect(p).toEqual({ x: 2, z: 2.5 });
  });

  it('lands with at least a breathing-room gap from an existing piece, not merely non-overlapping', () => {
    // A sofa-sized piece already sits at the room's center; a new chair-sized
    // piece is requested at the same spot, as happens via placeAtCenter.
    const other = furnitureCorners(item(2, 2.5, 1.8, 0.9), 0);
    const p = findClearSpot(item(2, 2.5, 0.6, 0.6), { x: 2, z: 2.5 }, square, noWalls, [other]);
    expect(p).not.toEqual({ x: 2, z: 2.5 });
    const gap = quadGap(furnitureCorners({ position: p, rotationY: 0, size: { width: 0.6, depth: 0.6, height: 1 } }, 0), other);
    expect(gap).toBeGreaterThanOrEqual(0.18 - 1e-6);
  });

  it('still finds a spot in a genuinely tight room where no full-margin candidate exists', () => {
    // A 4×2 m room with one obstacle spanning the full width and most of the
    // depth (z 0–1.4) leaves only a shallow top strip (z 1.4–2, only 0.6 m
    // deep) for a 0.5 m piece: room enough to fit without overlapping (a
    // plain, legitimate placement) but not room enough to also clear the
    // full 0.18 m margin from the obstacle everywhere in that strip.
    // Placement must not become impossible just because the margin can't be
    // fully satisfied — it should fall back to the merely-fitting candidate.
    const tightRoom: Point[] = [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 2 },
      { x: 0, z: 2 },
    ];
    const other = furnitureCorners(item(2, 0.7, 4, 1.4), 0);
    const from = { x: 2, z: 1.7 };
    // `from` itself already fits (without the extra margin) — confirm the room
    // really is this tight before asserting on findClearSpot's behavior.
    expect(furnitureFits(item(from.x, from.z, 0.5, 0.5), tightRoom, noWalls, [other])).toBe(true);
    const p = findClearSpot(item(from.x, from.z, 0.5, 0.5), from, tightRoom, noWalls, [other]);
    expect(p).toEqual(from);
    expect(furnitureFits(item(p.x, p.z, 0.5, 0.5), tightRoom, noWalls, [other])).toBe(true);
  });
});

/**
 * SAT separation gap between two convex quads (0 if touching or overlapping):
 * the largest per-axis projection gap across both quads' edge normals. Any
 * axis's gap is a lower bound on the true distance, and — for the
 * axis-aligned, non-rotated rectangles these tests use, where the closest
 * features are always parallel edges rather than diagonal corners — the best
 * axis gives the exact distance.
 */
function quadGap(a: Point[], b: Point[]): number {
  const axes = (poly: Point[]) =>
    poly.map((p, i) => {
      const q = poly[(i + 1) % poly.length];
      const len = Math.hypot(q.x - p.x, q.z - p.z) || 1;
      return { x: -(q.z - p.z) / len, z: (q.x - p.x) / len };
    });
  let maxGap = -Infinity;
  for (const axis of [...axes(a), ...axes(b)]) {
    const proj = (poly: Point[]) => poly.map((p) => p.x * axis.x + p.z * axis.z);
    const pa = proj(a);
    const pb = proj(b);
    const gap = Math.max(Math.min(...pb) - Math.max(...pa), Math.min(...pa) - Math.max(...pb));
    maxGap = Math.max(maxGap, gap);
  }
  return Math.max(maxGap, 0);
}
