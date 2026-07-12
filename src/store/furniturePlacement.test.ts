import { beforeEach, describe, expect, it } from 'vitest';
import { useDesignStore } from './useDesignStore';
import type { FurnitureSpec } from './designModel';

const store = () => useDesignStore.getState();

const spec: FurnitureSpec = {
  kind: 'chair',
  name: 'Chair',
  size: { width: 0.5, depth: 0.5, height: 0.9 },
  elevation: 0,
  color: '#cccccc',
};

const find = (id: string) => store().design.furniture.find((f) => f.id === id)!;

describe('addFurnitureConfiguredAt (drag-and-drop placement)', () => {
  beforeEach(() => {
    store().newProject(); // default 4×5 m room centred on the origin
  });

  it('places the piece at the dropped floor point', () => {
    const id = store().addFurnitureConfiguredAt(spec, { x: 1, z: 1 });
    const item = find(id);
    expect(item.position.x).toBeCloseTo(1, 5);
    expect(item.position.z).toBeCloseTo(1, 5);
  });

  it('falls back to the room centre when dropped outside the floor', () => {
    const id = store().addFurnitureConfiguredAt(spec, { x: 100, z: 100 });
    const item = find(id);
    // Not left at the off-floor drop point…
    expect(item.position.x).toBeLessThan(2);
    expect(item.position.z).toBeLessThan(2.5);
    // …and inside the room bounds instead.
    expect(item.position.x).toBeGreaterThan(-2);
    expect(item.position.z).toBeGreaterThan(-2.5);
  });
});
