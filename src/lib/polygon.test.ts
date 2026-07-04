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

// L-form med konkavt hörn i (2,2).
const L_SHAPE: Point[] = [
  { x: 0, z: 0 },
  { x: 4, z: 0 },
  { x: 4, z: 2 },
  { x: 2, z: 2 },
  { x: 2, z: 4 },
  { x: 0, z: 4 },
];

describe('snap/axisLock', () => {
  it('snappar till rutnätet utan flyttalsbrus', () => {
    expect(snap(0.34)).toBe(0.3);
    expect(snap(0.36)).toBe(0.4);
    expect(snap(3.0000001)).toBe(3);
    expect(snapPoint({ x: 1.23, z: -0.97 })).toEqual({ x: 1.2, z: -1 });
  });

  it('låser mot närmsta axel', () => {
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

  it('snappar den fria x-koordinaten till närmsta hörn inom tolerans', () => {
    const r = snapToCornerAxis({ x: 0.2, z: 3 }, corners, true);
    expect(r.point).toEqual({ x: 0, z: 3 });
    expect(r.guide).toEqual({ x: 0, z: 0 });
  });

  it('snappar den fria z-koordinaten vid lodrätt segment', () => {
    const r = snapToCornerAxis({ x: 4, z: 0.1 }, corners, false);
    expect(r.point).toEqual({ x: 4, z: 0 });
    expect(r.guide).toEqual({ x: 0, z: 0 });
  });

  it('lämnar punkten orörd utanför toleransen', () => {
    const r = snapToCornerAxis({ x: 1.5, z: 3 }, corners, true);
    expect(r.point).toEqual({ x: 1.5, z: 3 });
    expect(r.guide).toBeNull();
  });

  it('väljer hörnet med minst avstånd', () => {
    const r = snapToCornerAxis({ x: 3.9, z: 2 }, corners, true);
    expect(r.point).toEqual({ x: 4, z: 2 });
    expect(r.guide).toEqual({ x: 4, z: 0 });
  });
});

describe('signedArea/normalizeWinding', () => {
  it('ger positiv area för kanonisk winding', () => {
    expect(signedArea(RECT)).toBeCloseTo(20);
    expect(signedArea(L_SHAPE)).toBeCloseTo(12);
  });

  it('vänder negativ winding', () => {
    const reversed = [...RECT].reverse();
    expect(signedArea(reversed)).toBeCloseTo(-20);
    expect(signedArea(normalizeWinding(reversed))).toBeCloseTo(20);
    expect(normalizeWinding(RECT)).toBe(RECT);
  });
});

describe('bounds/center', () => {
  it('beräknar bbox och mitt', () => {
    expect(polygonBounds(L_SHAPE)).toEqual({ minX: 0, maxX: 4, minZ: 0, maxZ: 4 });
    expect(polygonCenter(L_SHAPE)).toEqual({ x: 2, z: 2 });
  });
});

describe('pointInPolygon', () => {
  it('hanterar rektangel', () => {
    expect(pointInPolygon({ x: 0, z: 0 }, RECT)).toBe(true);
    expect(pointInPolygon({ x: 3, z: 0 }, RECT)).toBe(false);
  });

  it('hanterar L-formens urtag', () => {
    expect(pointInPolygon({ x: 1, z: 1 }, L_SHAPE)).toBe(true);
    expect(pointInPolygon({ x: 3, z: 1 }, L_SHAPE)).toBe(true);
    expect(pointInPolygon({ x: 3, z: 3 }, L_SHAPE)).toBe(false);
    expect(pointInPolygon({ x: -1, z: 1 }, L_SHAPE)).toBe(false);
  });
});

describe('clampToPolygon', () => {
  it('lämnar inre punkter orörda', () => {
    const p = { x: 1, z: 1 };
    expect(clampToPolygon(p, L_SHAPE)).toBe(p);
  });

  it('projicerar yttre punkter till strax innanför randen', () => {
    const clamped = clampToPolygon({ x: 3, z: 3 }, L_SHAPE);
    expect(pointInPolygon(clamped, L_SHAPE)).toBe(true);
    expect(clamped.x).toBeCloseTo(3);
    expect(clamped.z).toBeCloseTo(1.99);
  });
});

describe('validateExteriorLoop', () => {
  const ids = makeIds();

  it('godkänner rektangel och L-form', () => {
    expect(validateExteriorLoop(wallsFromPolygon(RECT, ids))).toEqual({ ok: true });
    expect(validateExteriorLoop(wallsFromPolygon(L_SHAPE, ids))).toEqual({ ok: true });
  });

  it('avvisar för få hörn', () => {
    const tri = wallsFromPolygon(RECT.slice(0, 3), ids);
    expect(validateExteriorLoop(tri)).toMatchObject({ ok: false });
  });

  it('avvisar öppen kedja', () => {
    const walls = wallsFromPolygon(RECT, ids);
    walls[3] = { ...walls[3], b: { x: -2, z: 2 } };
    expect(validateExteriorLoop(walls)).toEqual({ ok: false, reason: 'Konturen är inte sluten.' });
  });

  it('avvisar sneda väggar', () => {
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
      reason: 'Väggarna måste vara vågräta eller lodräta.',
    });
  });

  it('avvisar för korta väggar', () => {
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
      reason: 'En vägg är för kort (minst 10 cm).',
    });
  });

  it('avvisar självkorsande kontur', () => {
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
      reason: 'Väggarna korsar varandra.',
    });
  });

  it('avvisar kant som viker tillbaka längs samma linje', () => {
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
      reason: 'Väggarna korsar varandra.',
    });
  });
});

describe('väggsegment', () => {
  it('utåtnormal pekar ut ur rummet i kanonisk winding', () => {
    const walls = wallsFromPolygon(RECT, makeIds());
    // Norrväggen (-z-sidan) har utåtnormal (0,-1).
    expect(outwardNormal(walls[0])).toEqual({ x: 0, z: -1 });
    expect(outwardNormal(walls[1])).toEqual({ x: 1, z: 0 });
  });

  it('floorPolygon ger startpunkterna i ordning', () => {
    const walls = wallsFromPolygon(RECT, makeIds());
    expect(floorPolygon(walls)).toEqual(RECT);
    expect(wallLen(walls[0])).toBeCloseTo(4);
  });
});

describe('exteriorEndExtension', () => {
  it('förlänger vid konvexa hörn och kortar vid konkava', () => {
    const rectWalls = wallsFromPolygon(RECT, makeIds());
    for (let i = 0; i < 4; i++) {
      expect(exteriorEndExtension(rectWalls, i)).toBe(WALL_T);
    }
    const lWalls = wallsFromPolygon(L_SHAPE, makeIds());
    // Vägg 2 slutar i det konkava hörnet (2,2).
    expect(exteriorEndExtension(lWalls, 2)).toBe(-WALL_T);
    expect(exteriorEndExtension(lWalls, 0)).toBe(WALL_T);
    expect(exteriorEndExtension(lWalls, 5)).toBe(WALL_T);
  });
});

describe('segmentsIntersect', () => {
  it('upptäcker korsning och kolinjär överlappning', () => {
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
  it('omvandlar meter till cm och formaterar med svenska tusentalsavgränsare', () => {
    expect(formatCm(2.4)).toBe('240 cm');
    expect(formatCm(3)).toBe('300 cm');
    expect(formatCm(1.256)).toBe('126 cm');
    expect(formatCm(10)).toBe('1 000 cm');
  });
});

describe('GRID', () => {
  it('är 0,1 m', () => {
    expect(GRID).toBe(0.1);
  });
});
