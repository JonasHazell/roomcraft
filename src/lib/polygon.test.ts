import { describe, expect, it } from 'vitest';
import type { Point } from '../types';
import {
  GRID,
  WALL_T,
  axisLock,
  clampToPolygon,
  exteriorEndExtension,
  floorPolygon,
  formatCm,
  normalizeWinding,
  outwardNormal,
  pointInPolygon,
  polygonBounds,
  polygonCenter,
  segmentsIntersect,
  signedArea,
  snap,
  snapPoint,
  snapToCornerAxis,
  validateExteriorLoop,
  wallLen,
  wallsFromPolygon,
} from './polygon';

function makeIds() {
  let n = 0;
  return () => `w${n++}`;
}

const RECT: Point[] = [
  { x: -2, z: -2.5 },
  { x: 2, z: -2.5 },
  { x: 2, z: 2.5 },
  { x: -2, z: 2.5 },
];

// L shape with a concave corner at (2,2).
const L_SHAPE: Point[] = [
  { x: 0, z: 0 },
  { x: 4, z: 0 },
  { x: 4, z: 2 },
  { x: 2, z: 2 },
  { x: 2, z: 4 },
  { x: 0, z: 4 },
];

describe('snap/axisLock', () => {
  it('snaps to the grid without floating point noise', () => {
    expect(snap(0.34)).toBe(0.3);
    expect(snap(0.36)).toBe(0.4);
    expect(snap(3.0000001)).toBe(3);
    expect(snapPoint({ x: 1.23, z: -0.97 })).toEqual({ x: 1.2, z: -1 });
  });

  it('locks to the nearest axis', () => {
    const prev = { x: 0, z: 0 };
    expect(axisLock(prev, { x: 3, z: 1 })).toEqual({ x: 3, z: 0 });
    expect(axisLock(prev, { x: 1, z: 3 })).toEqual({ x: 0, z: 3 });
  });
});

describe('snapToCornerAxis', () => {
  const corners: Point[] = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
  ];

  it('snaps the free x coordinate to the nearest corner within tolerance', () => {
    const r = snapToCornerAxis({ x: 0.2, z: 3 }, corners, true);
    expect(r.point).toEqual({ x: 0, z: 3 });
    expect(r.guide).toEqual({ x: 0, z: 0 });
  });

  it('snaps the free z coordinate for a vertical segment', () => {
    const r = snapToCornerAxis({ x: 4, z: 0.1 }, corners, false);
    expect(r.point).toEqual({ x: 4, z: 0 });
    expect(r.guide).toEqual({ x: 0, z: 0 });
  });

  it('leaves the point untouched outside the tolerance', () => {
    const r = snapToCornerAxis({ x: 1.5, z: 3 }, corners, true);
    expect(r.point).toEqual({ x: 1.5, z: 3 });
    expect(r.guide).toBeNull();
  });

  it('picks the corner with the smallest distance', () => {
    const r = snapToCornerAxis({ x: 3.9, z: 2 }, corners, true);
    expect(r.point).toEqual({ x: 4, z: 2 });
    expect(r.guide).toEqual({ x: 4, z: 0 });
  });
});

describe('signedArea/normalizeWinding', () => {
  it('gives positive area for canonical winding', () => {
    expect(signedArea(RECT)).toBeCloseTo(20);
    expect(signedArea(L_SHAPE)).toBeCloseTo(12);
  });

  it('reverses negative winding', () => {
    const reversed = [...RECT].reverse();
    expect(signedArea(reversed)).toBeCloseTo(-20);
    expect(signedArea(normalizeWinding(reversed))).toBeCloseTo(20);
    expect(normalizeWinding(RECT)).toBe(RECT);
  });
});

describe('bounds/center', () => {
  it('computes bbox and center', () => {
    expect(polygonBounds(L_SHAPE)).toEqual({ minX: 0, maxX: 4, minZ: 0, maxZ: 4 });
    expect(polygonCenter(L_SHAPE)).toEqual({ x: 2, z: 2 });
  });
});

describe('pointInPolygon', () => {
  it('handles a rectangle', () => {
    expect(pointInPolygon({ x: 0, z: 0 }, RECT)).toBe(true);
    expect(pointInPolygon({ x: 3, z: 0 }, RECT)).toBe(false);
  });

  it('handles the L shape notch', () => {
    expect(pointInPolygon({ x: 1, z: 1 }, L_SHAPE)).toBe(true);
    expect(pointInPolygon({ x: 3, z: 1 }, L_SHAPE)).toBe(true);
    expect(pointInPolygon({ x: 3, z: 3 }, L_SHAPE)).toBe(false);
    expect(pointInPolygon({ x: -1, z: 1 }, L_SHAPE)).toBe(false);
  });
});

describe('clampToPolygon', () => {
  it('leaves interior points untouched', () => {
    const p = { x: 1, z: 1 };
    expect(clampToPolygon(p, L_SHAPE)).toBe(p);
  });

  it('projects exterior points to just inside the boundary', () => {
    const clamped = clampToPolygon({ x: 3, z: 3 }, L_SHAPE);
    expect(pointInPolygon(clamped, L_SHAPE)).toBe(true);
    expect(clamped.x).toBeCloseTo(3);
    expect(clamped.z).toBeCloseTo(1.99);
  });
});

describe('validateExteriorLoop', () => {
  const ids = makeIds();

  it('accepts rectangle and L shape', () => {
    expect(validateExteriorLoop(wallsFromPolygon(RECT, ids))).toEqual({ ok: true });
    expect(validateExteriorLoop(wallsFromPolygon(L_SHAPE, ids))).toEqual({ ok: true });
  });

  it('rejects too few corners', () => {
    const tri = wallsFromPolygon(RECT.slice(0, 3), ids);
    expect(validateExteriorLoop(tri)).toMatchObject({ ok: false });
  });

  it('rejects an open chain', () => {
    const walls = wallsFromPolygon(RECT, ids);
    walls[3] = { ...walls[3], b: { x: -2, z: 2 } };
    expect(validateExteriorLoop(walls)).toEqual({ ok: false, reason: 'The outline is not closed.' });
  });

  it('rejects slanted walls', () => {
    const walls = wallsFromPolygon(
      [
        { x: 0, z: 0 },
        { x: 4, z: 1 },
        { x: 4, z: 4 },
        { x: 0, z: 4 },
      ],
      ids,
    );
    expect(validateExteriorLoop(walls)).toEqual({
      ok: false,
      reason: 'Walls must be horizontal or vertical.',
    });
  });

  it('rejects too short walls', () => {
    const walls = wallsFromPolygon(
      [
        { x: 0, z: 0 },
        { x: 4, z: 0 },
        { x: 4, z: 0.05 },
        { x: 0, z: 0.05 },
      ],
      ids,
    );
    expect(validateExteriorLoop(walls)).toEqual({
      ok: false,
      reason: 'A wall is too short (at least 10 cm).',
    });
  });

  it('rejects a self-intersecting outline', () => {
    const walls = wallsFromPolygon(
      [
        { x: 0, z: 0 },
        { x: 3, z: 0 },
        { x: 3, z: 2 },
        { x: 1, z: 2 },
        { x: 1, z: -1 },
        { x: 0, z: -1 },
      ],
      ids,
    );
    expect(validateExteriorLoop(walls)).toEqual({
      ok: false,
      reason: 'The walls cross each other.',
    });
  });

  it('rejects an edge that folds back along the same line', () => {
    const walls = wallsFromPolygon(
      [
        { x: 0, z: 0 },
        { x: 4, z: 0 },
        { x: 3, z: 0 },
        { x: 3, z: 4 },
        { x: 0, z: 4 },
      ],
      ids,
    );
    expect(validateExteriorLoop(walls)).toEqual({
      ok: false,
      reason: 'The walls cross each other.',
    });
  });
});

describe('wall segments', () => {
  it('outward normal points out of the room in canonical winding', () => {
    const walls = wallsFromPolygon(RECT, makeIds());
    // The north wall (-z side) has outward normal (0,-1).
    expect(outwardNormal(walls[0])).toEqual({ x: 0, z: -1 });
    expect(outwardNormal(walls[1])).toEqual({ x: 1, z: 0 });
  });

  it('floorPolygon gives the start points in order', () => {
    const walls = wallsFromPolygon(RECT, makeIds());
    expect(floorPolygon(walls)).toEqual(RECT);
    expect(wallLen(walls[0])).toBeCloseTo(4);
  });
});

describe('exteriorEndExtension', () => {
  it('extends at convex corners and shortens at concave ones', () => {
    const rectWalls = wallsFromPolygon(RECT, makeIds());
    for (let i = 0; i < 4; i++) {
      expect(exteriorEndExtension(rectWalls, i)).toBe(WALL_T);
    }
    const lWalls = wallsFromPolygon(L_SHAPE, makeIds());
    // Wall 2 ends at the concave corner (2,2).
    expect(exteriorEndExtension(lWalls, 2)).toBe(-WALL_T);
    expect(exteriorEndExtension(lWalls, 0)).toBe(WALL_T);
    expect(exteriorEndExtension(lWalls, 5)).toBe(WALL_T);
  });
});

describe('segmentsIntersect', () => {
  it('detects crossing and collinear overlap', () => {
    expect(
      segmentsIntersect({ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 2, z: -1 }, { x: 2, z: 1 }),
    ).toBe(true);
    expect(
      segmentsIntersect({ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 2, z: 1 }, { x: 2, z: 3 }),
    ).toBe(false);
    expect(
      segmentsIntersect({ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 3, z: 0 }, { x: 6, z: 0 }),
    ).toBe(true);
  });
});

describe('formatCm', () => {
  it('converts meters to cm and formats with Swedish thousands separators', () => {
    expect(formatCm(2.4)).toBe('240 cm');
    expect(formatCm(3)).toBe('300 cm');
    expect(formatCm(1.256)).toBe('126 cm');
    expect(formatCm(10)).toBe('1 000 cm');
  });
});

describe('GRID', () => {
  it('is 0.1 m', () => {
    expect(GRID).toBe(0.1);
  });
});
