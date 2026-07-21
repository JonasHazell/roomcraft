import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activeProject,
  activeRoom,
  deleteFurnitureFromLibrary,
  migrateV1toV2,
  parseDesign,
  parseProject,
  parseProjectSafe,
  parseWorkspace,
  parseWorkspaceSafe,
  saveFurnitureToLibrary,
  syncActiveRoom,
  syncActiveWorkspace,
} from './persistence';
import { signedArea, validateExteriorLoop } from './polygon';
import { useStorageStatus } from '../store/useStorageStatus';

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
    expect(p.schemaVersion).toBe(6);
    expect(p.id).toBeTruthy();
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

  it('accepts an empty home project (no rooms yet)', () => {
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
  it('accepts a current (v6) project and survives a JSON round trip', () => {
    const current = parseProject(V1_DESIGN);
    const roundTripped = parseProject(JSON.parse(JSON.stringify(current)));
    expect(roundTripped).toEqual(current);
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

  it('keeps a valid https product link and drops a malformed one', () => {
    const base = parseProject(V1_DESIGN);
    const room = base.rooms[0];
    const linkedBed = {
      ...room.furniture[0],
      product: { url: 'https://example.com/bed', priceCents: 12999, retailer: 'Example Co' },
    };
    const badBed = {
      ...room.furniture[0],
      id: 'f2',
      // Not https — must be dropped rather than rejecting the whole piece.
      product: { url: 'http://example.com/bed' },
    };
    const withProducts = {
      ...base,
      rooms: [
        {
          ...room,
          furniture: [linkedBed, badBed],
          proposals: [{ ...room.proposals[0], furniture: [linkedBed, badBed] }],
        },
      ],
    };
    const parsed = activeRoom(parseProject(JSON.parse(JSON.stringify(withProducts))));
    expect(parsed.furniture[0].product).toEqual({
      url: 'https://example.com/bed',
      priceCents: 12999,
      retailer: 'Example Co',
    });
    expect(parsed.furniture[1].product).toBeUndefined();
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

describe('parseDesign', () => {
  // A standalone room snapshot — one project room entry on its own, the shape a
  // shared-room link posts to the server (#353, server/share.ts).
  const room = activeRoom(parseProject(V1_DESIGN));

  it('accepts a valid single room and survives a JSON round trip', () => {
    const parsed = parseDesign(JSON.parse(JSON.stringify(room)));
    expect(parsed).toEqual(room);
  });

  it('rejects a malformed room (bad colour, out-of-range furniture position)', () => {
    expect(() => parseDesign({ ...room, floorColor: 'not-a-colour' })).toThrow();
    expect(() =>
      parseDesign({
        ...room,
        furniture: [{ ...room.furniture[0], position: { x: 9999, z: 0 } }],
      }),
    ).toThrow();
  });

  it('rejects a room with a broken exterior wall chain, same as parseProject', () => {
    expect(() => parseDesign({ ...room, walls: room.walls.slice(0, 3), openings: [] })).toThrow(
      /Invalid room shape/,
    );
  });

  it('rejects a room with an opening on a nonexistent wall', () => {
    expect(() =>
      parseDesign({ ...room, openings: [{ ...room.openings[0], wallId: 'does-not-exist' }] }),
    ).toThrow(/does not exist/);
  });

  it('rejects non-object input', () => {
    expect(() => parseDesign(null)).toThrow();
    expect(() => parseDesign('hello')).toThrow();
  });
});

describe('workspace: several home projects on one device (#382)', () => {
  it('migrates the pre-#382 single-project shape into a one-item workspace, preserving the home intact', () => {
    // The exact shape `roomcraft:current` held before this issue: `{ project: <v5 blob> }`,
    // no `workspace` wrapper at all.
    const legacyProject = { ...parseProject(V1_DESIGN), schemaVersion: 5 as const };
    const workspace = parseWorkspace(JSON.parse(JSON.stringify({ project: legacyProject })));

    expect(workspace.projects).toHaveLength(1);
    expect(workspace.activeProjectId).toBe(workspace.projects[0].id);
    // The room, its shape and its furniture all survive the migration untouched.
    const room = activeRoom(workspace.projects[0]);
    expect(room.name).toBe('My room');
    expect(room.furniture).toHaveLength(1);
    expect(room.walls).toHaveLength(4);
  });

  it('also migrates a bare pre-project design (no `project` wrapper at all)', () => {
    const workspace = parseWorkspace(JSON.parse(JSON.stringify({ design: V1_DESIGN })));
    expect(workspace.projects).toHaveLength(1);
    expect(activeRoom(workspace.projects[0]).name).toBe('My room');
  });

  it('round-trips an already-multi-home workspace and keeps each home independent', () => {
    const home1 = { ...parseProject(V1_DESIGN), name: 'Main place' };
    const home2 = { ...parseProject(V1_DESIGN), id: 'home-2', name: 'Cabin' };
    const raw = { workspace: { projects: [home1, home2], activeProjectId: 'home-2' } };

    const workspace = parseWorkspace(JSON.parse(JSON.stringify(raw)));

    expect(workspace.projects.map((p) => p.name)).toEqual(['Main place', 'Cabin']);
    expect(workspace.activeProjectId).toBe('home-2');
    expect(activeProject(workspace).name).toBe('Cabin');
    // Each home's own room is untouched by the other's presence in the list.
    expect(activeRoom(workspace.projects[0]).furniture).toHaveLength(1);
    expect(activeRoom(workspace.projects[1]).furniture).toHaveLength(1);
  });

  it('falls back to the first home when the active id is unknown', () => {
    const home1 = parseProject(V1_DESIGN);
    const raw = { workspace: { projects: [home1], activeProjectId: 'nope' } };
    const workspace = parseWorkspaceSafe(JSON.parse(JSON.stringify(raw)));
    expect(workspace?.activeProjectId).toBe(home1.id);
  });

  it('drops one corrupt home rather than failing the whole workspace', () => {
    const good = parseProject(V1_DESIGN);
    // A broken exterior wall chain — the same shape the single-project
    // "rejects a room with a broken exterior wall chain" test below uses.
    const brokenRoom = { ...good.rooms[0], walls: good.rooms[0].walls.slice(0, 3) };
    const broken = { ...good, id: 'broken-home', rooms: [brokenRoom] };
    const raw = { workspace: { projects: [broken, good], activeProjectId: good.id } };

    const workspace = parseWorkspaceSafe(JSON.parse(JSON.stringify(raw)));

    expect(workspace?.projects).toHaveLength(1);
    expect(workspace?.projects[0].name).toBe(good.name);
  });

  it('falls back to a fresh default home when every home is corrupt', () => {
    const good = parseProject(V1_DESIGN);
    const brokenRoom = { ...good.rooms[0], walls: good.rooms[0].walls.slice(0, 3) };
    const broken = { ...good, rooms: [brokenRoom] };
    const raw = { workspace: { projects: [broken], activeProjectId: broken.id } };

    expect(parseWorkspaceSafe(JSON.parse(JSON.stringify(raw)))).toBeNull();
  });

  it('syncActiveWorkspace folds the live home back into the workspace', () => {
    const home1 = parseProject(V1_DESIGN);
    const home2 = { ...parseProject(V1_DESIGN), id: 'home-2', name: 'Cabin' };
    const workspace = { projects: [home1, home2], activeProjectId: home1.id };

    const edited = { ...home1, name: 'Renamed live' };
    const synced = syncActiveWorkspace(workspace, edited);

    expect(activeProject(synced).name).toBe('Renamed live');
    // The other home is untouched.
    expect(synced.projects[1].name).toBe('Cabin');
  });
});

describe('furniture library storage failures', () => {
  // This suite runs under Node (no jsdom), which has no `localStorage` global
  // at all, so stub one in rather than relying on a real browser API.
  function createMockStorage() {
    const data = new Map<string, string>();
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
      removeItem: (key: string) => {
        data.delete(key);
      },
    };
  }

  beforeEach(() => {
    useStorageStatus.setState({ saveFailed: false });
    vi.stubGlobal('localStorage', createMockStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not throw when localStorage.setItem fails, and flags the failure', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() =>
      saveFurnitureToLibrary({
        name: 'Chair',
        kind: 'chair',
        size: { width: 0.5, depth: 0.5, height: 0.8 },
        elevation: 0,
        color: '#aabbcc',
      }),
    ).not.toThrow();

    expect(useStorageStatus.getState().saveFailed).toBe(true);
  });

  it('clears the failure flag once a save succeeds again', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    const saved = saveFurnitureToLibrary({
      name: 'Chair',
      kind: 'chair',
      size: { width: 0.5, depth: 0.5, height: 0.8 },
      elevation: 0,
      color: '#aabbcc',
    });
    expect(useStorageStatus.getState().saveFailed).toBe(true);

    deleteFurnitureFromLibrary(saved.id);
    expect(useStorageStatus.getState().saveFailed).toBe(false);
  });
});
