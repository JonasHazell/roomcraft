import { describe, expect, it } from 'vitest';
import type { FurnitureItem, Point, Wall } from '../types';
import { clampFurniture, findClearSpot, furnitureCorners, furnitureFits, slideFurniture } from './collision';

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

describe('clampFurniture', () => {
  /** A full FurnitureItem near the room's centre, clear of every wall. */
  function furnitureItem(elevation: number, height: number): FurnitureItem {
    return {
      id: 'f1',
      kind: 'wardrobe',
      name: 'Wardrobe',
      position: { x: 2, z: 2.5 },
      rotationY: 0,
      size: { width: 1, depth: 0.6, height },
      elevation,
      color: '#fff',
    };
  }

  it('leaves elevation/height untouched when comfortably under the ceiling', () => {
    const item = furnitureItem(0, 1.8);
    const clamped = clampFurniture(item, square, 2.5);
    expect(clamped.elevation).toBe(0);
    expect(clamped.size.height).toBe(1.8);
    expect(clamped).toBe(item); // no-op returns the same reference
  });

  // Mirrors clampOpening's `clamp(o.height, 0.1, roomHeight - elevation)` pattern
  // (see #422): a piece whose top would poke through the ceiling gets its height
  // reduced instead of the edit being rejected or the piece left oversized.
  it('shrinks height so the top no longer pokes through a lower ceiling', () => {
    const item = furnitureItem(0, 3.5); // taller than a 2.5m ceiling
    const clamped = clampFurniture(item, square, 2.5);
    expect(clamped.elevation).toBe(0);
    expect(clamped.size.height).toBeLessThanOrEqual(2.5);
    expect(clamped.elevation + clamped.size.height).toBeLessThanOrEqual(2.5);
  });

  it('shrinks height (not elevation) when a mounted piece would otherwise top out over the ceiling', () => {
    // A shelf mounted at 2.2m with a 0.6m height would top out at 2.8m — over
    // a 2.5m ceiling — even though its own height alone would fit; elevation
    // (where it's mounted) is left as-is and only height gives way, mirroring
    // clampOpening's own elevation-then-height clamp order.
    const item = furnitureItem(2.2, 0.6);
    const clamped = clampFurniture(item, square, 2.5);
    expect(clamped.elevation).toBe(2.2);
    expect(clamped.size.height).toBeCloseTo(0.3, 5);
    expect(clamped.elevation + clamped.size.height).toBeLessThanOrEqual(2.5);
  });

  it('clamps elevation itself when it alone would leave no room for even the minimum height', () => {
    // Mounted above the ceiling entirely — elevation itself must give way, not
    // just height, since there is no valid height left to clamp to otherwise.
    const item = furnitureItem(3.0, 0.6);
    const clamped = clampFurniture(item, square, 2.5);
    expect(clamped.elevation).toBeLessThan(2.5);
    expect(clamped.elevation + clamped.size.height).toBeLessThanOrEqual(2.5);
  });

  it('never forces an already-valid thin piece (e.g. a rug) taller', () => {
    const item = furnitureItem(0, 0.02);
    const clamped = clampFurniture(item, square, 2.5);
    expect(clamped.size.height).toBe(0.02);
  });

  it('still clamps the position into the floor polygon alongside the height clamp', () => {
    const item = { ...furnitureItem(0, 1.8), position: { x: -1, z: 2.5 } }; // outside the square
    const clamped = clampFurniture(item, square, 2.5);
    expect(clamped.position.x).toBeGreaterThanOrEqual(0);
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
});
