import { describe, expect, it } from 'vitest';
import { migrateV1toV2, parseDesign, parseDesignSafe } from './persistence';
import { signedArea, validateExteriorLoop } from './polygon';

/** Matches the old default design (schema v1). */
const V1_DESIGN = {
  schemaVersion: 1,
  name: 'My room',
  updatedAt: '2026-01-01T00:00:00.000Z',
  room: {
    width: 4,
    length: 5,
    height: 2.5,
    floorColor: '#c9a878',
    wallColor: '#efe8da',
  },
  openings: [
    { id: 'op-door', kind: 'door', wall: 'south', offset: 0.7, width: 0.9, height: 2.1, elevation: 0 },
    { id: 'op-win', kind: 'window', wall: 'north', offset: 1.2, width: 1.4, height: 1.2, elevation: 0.9 },
  ],
  furniture: [
    {
      id: 'f1',
      kind: 'bed',
      name: 'Bed',
      position: { x: 0.5, z: 1 },
      rotationY: 0,
      size: { width: 1.6, depth: 2, height: 0.5 },
      color: '#aabbcc',
    },
  ],
} as const;

describe('migrateV1toV2', () => {
  const d = parseDesign(V1_DESIGN);

  it('builds four chained exterior walls with positive winding', () => {
    expect(d.schemaVersion).toBe(2);
    expect(d.walls).toHaveLength(4);
    expect(d.walls.every((w) => w.kind === 'exterior')).toBe(true);
    expect(validateExteriorLoop(d.walls)).toEqual({ ok: true });
    expect(signedArea(d.walls.map((w) => w.a))).toBeCloseTo(20);
  });

  it('preserves the room dimensions via the walls', () => {
    // The north wall: (-2,-2.5) → (2,-2.5).
    expect(d.walls[0].a).toEqual({ x: -2, z: -2.5 });
    expect(d.walls[0].b).toEqual({ x: 2, z: -2.5 });
  });

  it('maps openings to the right wall with preserved offset', () => {
    const door = d.openings.find((o) => o.id === 'op-door');
    const win = d.openings.find((o) => o.id === 'op-win');
    // South is wall index 2 in the chain north→east→south→west.
    expect(door?.wallId).toBe(d.walls[2].id);
    expect(door?.offset).toBe(0.7);
    expect(win?.wallId).toBe(d.walls[0].id);
    expect(win?.offset).toBe(1.2);
  });

  it('keeps ceiling height, colors, furniture and name', () => {
    expect(d.room).toEqual({ height: 2.5, floorColor: '#c9a878', wallColor: '#efe8da' });
    expect(d.furniture).toHaveLength(1);
    expect(d.name).toBe('My room');
  });
});

describe('parseDesign', () => {
  it('accepts v2 and survives a JSON round trip', () => {
    const v2 = parseDesign(V1_DESIGN);
    const roundTripped = parseDesign(JSON.parse(JSON.stringify(v2)));
    expect(roundTripped).toEqual(v2);
  });

  it('rejects unknown schema version', () => {
    expect(() => parseDesign({ ...V1_DESIGN, schemaVersion: 99 })).toThrow(/schema version 99/);
  });

  it('rejects garbage and broken structures', () => {
    expect(parseDesignSafe(null)).toBeNull();
    expect(parseDesignSafe('hello')).toBeNull();
    expect(parseDesignSafe({ schemaVersion: 2 })).toBeNull();
  });

  it('rejects v2 with an opening on a nonexistent wall', () => {
    const v2 = parseDesign(V1_DESIGN);
    const broken = {
      ...v2,
      openings: [{ ...v2.openings[0], wallId: 'does-not-exist' }],
    };
    expect(parseDesignSafe(broken)).toBeNull();
  });

  it('rejects v2 with a broken exterior wall chain', () => {
    const v2 = parseDesign(V1_DESIGN);
    const broken = {
      ...v2,
      walls: v2.walls.slice(0, 3),
      openings: [],
    };
    expect(parseDesignSafe(broken)).toBeNull();
  });

  it('migrates directly via migrateV1toV2 without parse', () => {
    const migrated = migrateV1toV2(structuredClone(V1_DESIGN) as never);
    expect(migrated.walls).toHaveLength(4);
    expect(migrated.openings).toHaveLength(2);
  });
});
