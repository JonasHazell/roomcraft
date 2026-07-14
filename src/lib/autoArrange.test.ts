import { describe, expect, it } from 'vitest';
import type { Design, FurnitureItem, FurnitureKind, WallOpening } from '../types';
import { floorPolygon, wallsFromPolygon } from './polygon';
import { furnitureFits, furnitureObstacles } from './collision';
import { runValidation } from './validation/engine';
import { autoArrange } from './autoArrange';

/** 4×5 m room with a door on the south wall and a window on the north wall. */
function makeDesign(furniture: FurnitureItem[]): Design {
  let n = 0;
  const walls = wallsFromPolygon(
    [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 5 },
      { x: 0, z: 5 },
    ],
    () => `w${n++}`,
  );
  const openings: WallOpening[] = [
    { id: 'o0', kind: 'door', wallId: walls[2].id, offset: 1.5, width: 0.9, height: 2.1, elevation: 0 },
    { id: 'o1', kind: 'window', wallId: walls[0].id, offset: 1.2, width: 1.4, height: 1.2, elevation: 0.9 },
  ];
  return {
    id: 'r0',
    name: 'Test',
    updatedAt: '2026-01-01T00:00:00.000Z',
    room: { height: 2.5 },
    floorColor: '#c9a878',
    wallColor: '#efe8da',
    floorMaterial: 'matte',
    wallMaterial: 'matte',
    walls,
    openings,
    furniture,
    proposals: [
      {
        id: 'p0',
        name: 'Proposal 1',
        furniture,
        floorColor: '#c9a878',
        wallColor: '#efe8da',
        floorMaterial: 'matte',
        wallMaterial: 'matte',
      },
    ],
    activeProposalId: 'p0',
  };
}

let seq = 0;
function piece(
  kind: FurnitureKind,
  x: number,
  z: number,
  opts: Partial<Pick<FurnitureItem, 'rotationY'>> & { width?: number; depth?: number; height?: number } = {},
): FurnitureItem {
  return {
    id: `f${seq++}`,
    kind,
    name: kind,
    position: { x, z },
    rotationY: opts.rotationY ?? 0,
    size: { width: opts.width ?? 1, depth: opts.depth ?? 1, height: opts.height ?? 0.8 },
    elevation: 0,
    color: '#888888',
  };
}

const scoreOf = (design: Design, furniture: FurnitureItem[]) =>
  runValidation({ ...design, furniture }).total ?? 0;

describe('autoArrange', () => {
  it('raises the design score for a badly placed bedroom', () => {
    // A double bed marooned in the middle of the room, and a nightstand off in a
    // corner — many rules (headboard against a wall, command position, bed access,
    // nightstand beside the bed) fail as placed.
    const bed = piece('bed', 2, 2.5, { width: 1.6, depth: 2 });
    const nightstand = piece('nightstand', 0.5, 4.5, { width: 0.5, depth: 0.4, height: 0.5 });
    const design = makeDesign([bed, nightstand]);

    const before = scoreOf(design, design.furniture);
    const arranged = autoArrange(design);

    expect(arranged).not.toBe(design.furniture); // it found an improvement
    expect(scoreOf(design, arranged)).toBeGreaterThan(before);
  });

  it('keeps the exact set of pieces and their ids', () => {
    const design = makeDesign([
      piece('bed', 2, 2.5, { width: 1.6, depth: 2 }),
      piece('nightstand', 0.5, 4.5, { width: 0.5, depth: 0.4, height: 0.5 }),
      piece('wardrobe', 2, 0.5, { width: 1.2, depth: 0.6, height: 2 }),
    ]);
    const arranged = autoArrange(design);
    expect(arranged.map((f) => f.id).sort()).toEqual(design.furniture.map((f) => f.id).sort());
    for (const f of arranged) {
      const src = design.furniture.find((s) => s.id === f.id)!;
      expect(f.kind).toBe(src.kind); // only pose changes, never the piece itself
      expect(f.size).toEqual(src.size);
    }
  });

  it('never produces an overlapping or out-of-bounds layout', () => {
    const design = makeDesign([
      piece('sofa', 2, 2.5, { width: 2, depth: 0.9 }),
      piece('table', 2, 3.5, { width: 1.1, depth: 0.6, height: 0.45 }),
      piece('bookshelf', 1, 1, { width: 0.8, depth: 0.3, height: 1.8 }),
      piece('plant', 3, 1, { width: 0.4, depth: 0.4, height: 1.4 }),
    ]);
    const arranged = autoArrange(design);
    const poly = floorPolygon(design.walls);
    for (const f of arranged) {
      const obstacles = furnitureObstacles(arranged, f.kind, f.id);
      expect(furnitureFits(f, poly, design.walls, obstacles)).toBe(true);
    }
  });

  it('is a no-op (same reference) when there is no furniture', () => {
    const design = makeDesign([]);
    expect(autoArrange(design)).toBe(design.furniture);
  });
});
