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
    expect(p.schemaVersion).toBe(4);
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

  it('keeps ceiling height, colors, furniture and name', () => {
    expect(room.room).toEqual({ height: 2.5, floorColor: '#c9a878', wallColor: '#efe8da' });
    expect(room.furniture).toHaveLength(1);
    expect(room.name).toBe('My room');
    expect(p.name).toBe('My room');
  });

  it('wraps the furnishing into a single active proposal', () => {
    expect(room.proposals).toHaveLength(1);
    expect(room.activeProposalId).toBe(room.proposals[0].id);
    expect(room.proposals[0].furniture).toEqual(room.furniture);
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

  it('rejects a project with no rooms', () => {
    const base = parseProject(V1_DESIGN);
    const broken = { ...base, rooms: [] };
    expect(parseProjectSafe(JSON.parse(JSON.stringify(broken)))).toBeNull();
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
          proposals: [room.proposals[0], { id: 'p2', name: 'Empty', furniture: [] }],
          activeProposalId: 'p2',
          furniture: [],
        },
      ],
    };
    const parsed = parseProject(JSON.parse(JSON.stringify(withTwo)));
    const parsedRoom = activeRoom(parsed);
    expect(parsedRoom.proposals).toHaveLength(2);
    expect(parsedRoom.activeProposalId).toBe('p2');
    expect(parsedRoom.furniture).toHaveLength(0);
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
  it('accepts a v4 project and survives a JSON round trip', () => {
    const v4 = parseProject(V1_DESIGN);
    const roundTripped = parseProject(JSON.parse(JSON.stringify(v4)));
    expect(roundTripped).toEqual(v4);
  });

  it('rejects unknown schema version', () => {
    expect(() => parseProject({ ...V1_DESIGN, schemaVersion: 99 })).toThrow(/schema version 99/);
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
