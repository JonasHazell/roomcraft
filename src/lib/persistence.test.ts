import { describe, expect, it } from 'vitest';
import {
  activeRoom,
  migrateV1toV2,
  parseProject,
  parseProjectSafe,
  syncActiveRoom,
} from './persistence';
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

describe('migration to the project schema', () => {
  const p = parseProject(V1_DESIGN);
  const room = activeRoom(p);

  it('wraps a legacy single design into a one-room project', () => {
    expect(p.schemaVersion).toBe(5);
    expect(p.rooms).toHaveLength(1);
    expect(p.activeRoomId).toBe(room.id);
    expect(room.id).toBeTruthy();
  });

  it('builds four chained exterior walls with positive winding', () => {
    expect(room.walls).toHaveLength(4);
    expect(room.walls.every((w) => w.kind === 'exterior')).toBe(true);
    expect(validateExteriorLoop(room.walls)).toEqual({ ok: true });
    expect(signedArea(room.walls.map((w) => w.a))).toBeCloseTo(20);
  });

  it('preserves the room dimensions via the walls', () => {
    expect(room.walls[0].a).toEqual({ x: -2, z: -2.5 });
    expect(room.walls[0].b).toEqual({ x: 2, z: -2.5 });
  });

  it('maps openings to the right wall with preserved offset', () => {
    const door = room.openings.find((o) => o.id === 'op-door');
    const win = room.openings.find((o) => o.id === 'op-win');
    // South is wall index 2 in the chain north→east→south→west.
    expect(door?.wallId).toBe(room.walls[2].id);
    expect(door?.offset).toBe(0.7);
    expect(win?.wallId).toBe(room.walls[0].id);
    expect(win?.offset).toBe(1.2);
  });

  it('keeps ceiling height, furniture and name; moves colours onto the proposal', () => {
    expect(room.room).toEqual({ height: 2.5 });
    expect(room.floorColor).toBe('#c9a878');
    expect(room.wallColor).toBe('#efe8da');
    expect(room.furniture).toHaveLength(1);
    expect(room.name).toBe('My room');
    expect(p.name).toBe('My room');
  });

  it('wraps the furnishing into a single active proposal carrying the colours', () => {
    expect(room.proposals).toHaveLength(1);
    expect(room.activeProposalId).toBe(room.proposals[0].id);
    expect(room.proposals[0].furniture).toEqual(room.furniture);
    expect(room.proposals[0].floorColor).toBe('#c9a878');
    expect(room.proposals[0].wallColor).toBe('#efe8da');
  });

  it('defaults every surface to the matte finish for saves made before materials', () => {
    expect(room.floorMaterial).toBe('matte');
    expect(room.wallMaterial).toBe('matte');
    expect(room.proposals[0].floorMaterial).toBe('matte');
    expect(room.proposals[0].wallMaterial).toBe('matte');
    expect(room.furniture[0].material).toBe('matte');
  });
});

describe('rooms', () => {
  it('round-trips several rooms and keeps design in sync with the active one', () => {
    const base = parseProject(V1_DESIGN);
    const roomB = { ...base.rooms[0], id: 'r2', name: 'Bedroom' };
    const withTwo = { ...base, rooms: [base.rooms[0], roomB], activeRoomId: 'r2' };
    const parsed = parseProject(JSON.parse(JSON.stringify(withTwo)));
    expect(parsed.rooms).toHaveLength(2);
    expect(parsed.activeRoomId).toBe('r2');
    expect(activeRoom(parsed).name).toBe('Bedroom');
  });

  it('falls back to the first room when the active id is unknown', () => {
    const base = parseProject(V1_DESIGN);
    const broken = { ...base, activeRoomId: 'nope' };
    const parsed = parseProjectSafe(JSON.parse(JSON.stringify(broken)));
    expect(parsed?.activeRoomId).toBe(base.rooms[0].id);
  });

  it('accepts an empty workspace (no rooms yet)', () => {
    // A new user starts with no rooms; the lobby shows its create-first-room state.
    const base = parseProject(V1_DESIGN);
    const empty = { ...base, rooms: [], activeRoomId: '' };
    const parsed = parseProjectSafe(JSON.parse(JSON.stringify(empty)));
    expect(parsed?.rooms).toHaveLength(0);
    expect(parsed?.activeRoomId).toBe('');
  });

  it('syncActiveRoom folds the live room back into the project', () => {
    const base = parseProject(V1_DESIGN);
    const edited = { ...base.rooms[0], name: 'Renamed live' };
    const synced = syncActiveRoom(base, edited);
    expect(activeRoom(synced).name).toBe('Renamed live');
  });
});

describe('proposals within a room', () => {
  it('round-trips several proposals and keeps furniture in sync with the active one', () => {
    const base = parseProject(V1_DESIGN);
    const room = base.rooms[0];
    const withTwo = {
      ...base,
      rooms: [
        {
          ...room,
          proposals: [
            room.proposals[0],
            { id: 'p2', name: 'Dark', furniture: [], floorColor: '#222222', wallColor: '#333333' },
          ],
          activeProposalId: 'p2',
          furniture: [],
          floorColor: '#222222',
          wallColor: '#333333',
        },
      ],
    };
    const parsed = parseProject(JSON.parse(JSON.stringify(withTwo)));
    const parsedRoom = activeRoom(parsed);
    expect(parsedRoom.proposals).toHaveLength(2);
    expect(parsedRoom.activeProposalId).toBe('p2');
    expect(parsedRoom.furniture).toHaveLength(0);
    // Each proposal keeps its own palette, and the live colours mirror the active one.
    expect(parsedRoom.proposals[0].wallColor).toBe('#efe8da');
    expect(parsedRoom.proposals[1].wallColor).toBe('#333333');
    expect(parsedRoom.wallColor).toBe('#333333');
    expect(parsedRoom.floorColor).toBe('#222222');
  });

  it('falls back to the first proposal when the active id is unknown', () => {
    const base = parseProject(V1_DESIGN);
    const room = base.rooms[0];
    const broken = { ...base, rooms: [{ ...room, activeProposalId: 'nope' }] };
    const parsed = parseProjectSafe(JSON.parse(JSON.stringify(broken)));
    const parsedRoom = parsed ? activeRoom(parsed) : null;
    expect(parsedRoom?.activeProposalId).toBe(room.proposals[0].id);
    expect(parsedRoom?.furniture).toEqual(room.proposals[0].furniture);
  });

  it('rejects a room with no proposals', () => {
    const base = parseProject(V1_DESIGN);
    const broken = { ...base, rooms: [{ ...base.rooms[0], proposals: [] }] };
    expect(parseProjectSafe(JSON.parse(JSON.stringify(broken)))).toBeNull();
  });
});

describe('parseProject', () => {
  it('accepts a v5 project and survives a JSON round trip', () => {
    const v5 = parseProject(V1_DESIGN);
    const roundTripped = parseProject(JSON.parse(JSON.stringify(v5)));
    expect(roundTripped).toEqual(v5);
  });

  it('rejects unknown schema version', () => {
    expect(() => parseProject({ ...V1_DESIGN, schemaVersion: 99 })).toThrow(/schema version 99/);
  });

  it('backfills furniture options with the kind defaults for older saves', () => {
    // The v1 bed has no `options` field — it should load with the bed defaults.
    const room = activeRoom(parseProject(V1_DESIGN));
    expect(room.furniture[0].options).toEqual({ mattresses: 1 });
  });

  it('normalizes stored options: clamps counts, keeps valid ones, drops unknown keys', () => {
    const base = parseProject(V1_DESIGN);
    const room = base.rooms[0];
    const bookshelf = {
      ...room.furniture[0],
      kind: 'bookshelf',
      options: { shelves: 99, doors: true, bogus: 'x' },
    };
    const withOptions = {
      ...base,
      rooms: [
        {
          ...room,
          furniture: [bookshelf],
          // The active proposal mirrors the live furniture, so put it there too.
          proposals: [{ ...room.proposals[0], furniture: [bookshelf] }],
        },
      ],
    };
    const parsed = activeRoom(parseProject(JSON.parse(JSON.stringify(withOptions))));
    expect(parsed.furniture[0].options).toEqual({ shelves: 6, doors: true });
  });

  it('keeps a valid surface material and normalizes unknown ones to matte', () => {
    const base = parseProject(V1_DESIGN);
    const room = base.rooms[0];
    const metalBed = { ...room.furniture[0], material: 'metal' };
    const bogusBed = { ...room.furniture[0], id: 'f2', material: 'unobtanium' };
    const withMaterials = {
      ...base,
      rooms: [
        {
          ...room,
          furniture: [metalBed, bogusBed],
          floorMaterial: 'wood',
          wallMaterial: 'not-a-material',
          proposals: [
            {
              ...room.proposals[0],
              furniture: [metalBed, bogusBed],
              floorMaterial: 'wood',
              wallMaterial: 'not-a-material',
            },
          ],
        },
      ],
    };
    const parsed = activeRoom(parseProject(JSON.parse(JSON.stringify(withMaterials))));
    expect(parsed.furniture[0].material).toBe('metal');
    expect(parsed.furniture[1].material).toBe('matte');
    expect(parsed.floorMaterial).toBe('wood');
    expect(parsed.wallMaterial).toBe('matte');
  });

  it('rejects garbage and broken structures', () => {
    expect(parseProjectSafe(null)).toBeNull();
    expect(parseProjectSafe('hello')).toBeNull();
    expect(parseProjectSafe({ schemaVersion: 4 })).toBeNull();
  });

  it('rejects a room with an opening on a nonexistent wall', () => {
    const base = parseProject(V1_DESIGN);
    const room = base.rooms[0];
    const broken = {
      ...base,
      rooms: [{ ...room, openings: [{ ...room.openings[0], wallId: 'does-not-exist' }] }],
    };
    expect(parseProjectSafe(broken)).toBeNull();
  });

  it('rejects a room with a broken exterior wall chain', () => {
    const base = parseProject(V1_DESIGN);
    const room = base.rooms[0];
    const broken = {
      ...base,
      rooms: [{ ...room, walls: room.walls.slice(0, 3), openings: [] }],
    };
    expect(parseProjectSafe(broken)).toBeNull();
  });

  it('migrates directly via migrateV1toV2 without parse', () => {
    const migrated = migrateV1toV2(structuredClone(V1_DESIGN) as never);
    expect(migrated.walls).toHaveLength(4);
    expect(migrated.openings).toHaveLength(2);
  });
});

describe('imported furniture models', () => {
  const withModel = (model: unknown): unknown => {
    const p = parseProject(V1_DESIGN); // a valid one-room v5 project
    const piece = {
      id: 'm1',
      kind: 'box',
      name: 'Custom model',
      position: { x: 0, z: 0 },
      rotationY: 0,
      size: { width: 1, depth: 1, height: 1 },
      color: '#aabbcc',
      model,
    };
    const room = p.rooms[0];
    // Both the live mirror and the active proposal carry the piece.
    return {
      ...p,
      rooms: [{ ...room, furniture: [piece], proposals: [{ ...room.proposals[0], furniture: [piece] }] }],
    };
  };

  it('round-trips an imported model on a box piece', () => {
    const model = { src: 'data:model/gltf-binary;base64,AAAA', name: 'thing.glb' };
    const parsed = parseProject(withModel(model));
    expect(activeRoom(parsed).furniture[0].model).toEqual(model);
  });

  it('drops an oversized model instead of failing the whole load', () => {
    const parsed = parseProject(withModel({ src: 'x'.repeat(8_000_001), name: 'huge.glb' }));
    // The piece survives as a plain box; only the unusable model is dropped.
    expect(activeRoom(parsed).furniture[0].model).toBeUndefined();
    expect(activeRoom(parsed).furniture[0].kind).toBe('box');
  });
});
