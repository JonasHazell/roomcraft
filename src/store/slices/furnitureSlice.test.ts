import { beforeEach, describe, expect, it } from 'vitest';
import { useDesignStore } from '../useDesignStore';
import { floorPolygon } from '../../lib/polygon';
import { furnitureFits, furnitureObstacles } from '../../lib/collision';

const store = () => useDesignStore.getState();

/** The default room is a 4×5 m rectangle: x in [-2, 2], z in [-2.5, 2.5]. */
function furniture(id: string) {
  const item = store().design.furniture.find((f) => f.id === id);
  if (!item) throw new Error(`no furniture ${id}`);
  return item;
}

function fits(id: string) {
  const d = store().design;
  const poly = floorPolygon(d.walls);
  const item = furniture(id);
  const obstacles = furnitureObstacles(d.furniture, item.kind, id);
  return furnitureFits(item, poly, d.walls, obstacles);
}

describe('updateFurniture collision guarantee (resize/rotate)', () => {
  beforeEach(() => {
    store().newProject();
  });

  it('does not move a piece when a resize or rotation still has room to grow', () => {
    const id = store().addFurnitureConfigured({
      kind: 'chair',
      name: 'Chair',
      size: { width: 0.45, depth: 0.45, height: 0.9 },
      elevation: 0,
      color: '#fff',
    });
    // Away from every wall, alone in the room.
    store().updateFurniture(id, { position: { x: 0, z: -1 } });
    const before = furniture(id).position;

    // Grow it — still well clear of every wall.
    store().updateFurniture(id, { size: { width: 1.2, depth: 0.6 } });
    expect(furniture(id).position).toEqual(before);
    expect(furniture(id).size).toEqual({ width: 1.2, depth: 0.6, height: 0.9 });

    // Rotate it — the new footprint (extents swapped) is still well clear.
    store().updateFurniture(id, { rotationY: Math.PI / 2 });
    expect(furniture(id).position).toEqual(before);
    expect(furniture(id).rotationY).toBe(Math.PI / 2);
  });

  it('slides a resize that would newly poke through a wall back into the room', () => {
    const id = store().addFurnitureConfigured({
      kind: 'chair',
      name: 'Chair',
      size: { width: 0.4, depth: 0.4, height: 0.9 },
      elevation: 0,
      color: '#fff',
    });
    // 0.1 m clearance from the north wall (z = -2.5) with the starting size.
    store().updateFurniture(id, { position: { x: 0, z: -2.2 } });
    expect(fits(id)).toBe(true);

    // Grow the depth so the old position would poke through the north wall.
    store().updateFurniture(id, { size: { depth: 1.0 } });

    // The size change is honoured, but the position is corrected so the piece
    // still fits inside the walls, instead of being committed overlapping.
    expect(furniture(id).size).toEqual({ width: 0.4, depth: 1.0, height: 0.9 });
    expect(fits(id)).toBe(true);
    expect(furniture(id).position).not.toEqual({ x: 0, z: -2.2 });
  });

  it('slides a rotation that would newly overlap a neighbor clear of it', () => {
    const a = store().addFurnitureConfigured({
      kind: 'desk',
      name: 'A',
      size: { width: 0.5, depth: 1.6, height: 0.75 },
      elevation: 0,
      color: '#fff',
    });
    // Deliberately off the room's centre (0, 0) — a resize/rotation correction
    // needs a real direction to slide in, which a piece sitting exactly on the
    // room's centre wouldn't give it.
    store().updateFurniture(a, { position: { x: -0.3, z: 0 } });
    const b = store().addFurnitureConfigured({
      kind: 'table',
      name: 'B',
      size: { width: 0.6, depth: 0.6, height: 0.75 },
      elevation: 0,
      color: '#fff',
    });
    store().updateFurniture(b, { position: { x: 0.7, z: 0 } });

    // Narrow side facing the neighbor — no overlap yet.
    expect(fits(a)).toBe(true);
    expect(fits(b)).toBe(true);

    // Rotating A 90° swaps its footprint extents, which would newly overlap B
    // at the same center.
    store().updateFurniture(a, { rotationY: Math.PI / 2 });

    expect(furniture(a).rotationY).toBe(Math.PI / 2);
    expect(fits(a)).toBe(true);
    expect(fits(b)).toBe(true);
    expect(furniture(a).position).not.toEqual({ x: -0.3, z: 0 });
  });

  it('leaves position untouched for edits that do not affect the footprint', () => {
    const id = store().addFurnitureConfigured({
      kind: 'chair',
      name: 'Chair',
      size: { width: 0.45, depth: 0.45, height: 0.9 },
      elevation: 0,
      color: '#fff',
    });
    store().updateFurniture(id, { position: { x: 0, z: -2.0 } });
    const before = furniture(id).position;

    store().updateFurniture(id, { color: '#123456' });
    expect(furniture(id).position).toEqual(before);
    expect(furniture(id).color).toBe('#123456');
  });
});
