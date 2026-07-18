import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Design, FurnitureLibraryEntry, Project, Proposal, Wall } from '../types';
import { DEFAULT_FLOOR_COLOR, DEFAULT_WALL_COLOR, HEX_COLOR_RE, SCHEMA_VERSION } from '../types';
import { isAxisParallel, validateExteriorLoop } from './polygon';
import { FURNITURE_KINDS } from './furnitureCatalog';
import { normalizeOptions } from './furnitureOptions';
import { DEFAULT_MATERIAL, normalizeMaterial } from './materials';
import { normalizeColors, normalizeMaterials } from './furnitureParts';
import { normalizeProduct } from './furnitureProduct';

const color = z.string().regex(HEX_COLOR_RE, 'invalid color code (expected #rrggbb)');
const meters = (max: number) => z.number().min(0).max(max);
// A surface finish id; unknown/missing ids normalize to the default matte finish,
// so saves made before materials existed load unchanged.
const material = z
  .string()
  .optional()
  .transform((v) => normalizeMaterial(v));

const furnitureSizeSchema = z.object({
  width: z.number().min(0.01).max(100),
  depth: z.number().min(0.01).max(100),
  height: z.number().min(0.01).max(20),
});

/** Raw per-type options as stored; coerced to the kind's valid set by the transform below. */
const furnitureOptionsSchema = z.record(
  z.string(),
  z.union([z.number(), z.boolean(), z.string()]),
);

const furnitureSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(FURNITURE_KINDS),
    name: z.string().max(100),
    position: z.object({ x: z.number().min(-100).max(100), z: z.number().min(-100).max(100) }),
    rotationY: z.number().min(-100).max(100),
    size: furnitureSizeSchema,
    /** Missing in saves made before the field existed — falls back to the floor. */
    elevation: meters(20).default(0),
    color,
    /** Sparse per-part colour overrides; invalid entries are dropped on load. */
    colors: z.record(z.string(), z.string()).optional(),
    /** Legacy whole-piece finish — superseded by per-part `materials`. */
    material: z.string().optional(),
    /** Missing in saves made before parts existed — seeded from the part defaults or `material`. */
    materials: z.record(z.string(), z.string()).optional(),
    /** Missing in saves made before the field existed — normalized to the kind's defaults. */
    options: furnitureOptionsSchema.optional(),
    /** Optional product link; missing/malformed data degrades to no product on load. */
    product: z.unknown().optional(),
  })
  // Normalize options/materials/colours/product against the kind so stored data is always sound.
  .transform((f) => ({
    ...f,
    colors: normalizeColors(f.kind, f.colors),
    material: normalizeMaterial(f.material),
    materials: normalizeMaterials(f.kind, f.materials, f.material),
    options: normalizeOptions(f.kind, f.options),
    product: normalizeProduct(f.product),
  }));

// ---- v1 (older format: rectangular room, walls by compass direction) ----

const openingSchemaV1 = z.object({
  id: z.string().min(1),
  kind: z.enum(['door', 'window']),
  wall: z.enum(['north', 'south', 'east', 'west']),
  offset: meters(100),
  width: z.number().min(0.05).max(100),
  height: z.number().min(0.05).max(20),
  elevation: meters(20),
});

const designSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  name: z.string().max(200),
  updatedAt: z.string(),
  room: z.object({
    width: z.number().min(0.5).max(100),
    length: z.number().min(0.5).max(100),
    height: z.number().min(1).max(20),
    floorColor: color,
    wallColor: color,
  }),
  openings: z.array(openingSchemaV1).max(200),
  furniture: z.array(furnitureSchema).max(500),
});

type DesignV1 = z.infer<typeof designSchemaV1>;

// ---- v2 (current format: walls as segments) ----

const pointSchema = z.object({
  x: z.number().min(-100).max(100),
  z: z.number().min(-100).max(100),
});

const wallSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['exterior', 'interior']),
  a: pointSchema,
  b: pointSchema,
});

const openingSchemaV2 = z.object({
  id: z.string().min(1),
  kind: z.enum(['door', 'window']),
  wallId: z.string().min(1),
  offset: meters(100),
  width: z.number().min(0.05).max(100),
  height: z.number().min(0.05).max(20),
  elevation: meters(20),
});

const roomSchema = z.object({
  height: z.number().min(1).max(20),
  floorColor: color,
  wallColor: color,
});

const designSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  name: z.string().max(200),
  updatedAt: z.string(),
  room: roomSchema,
  walls: z.array(wallSchema).max(400),
  openings: z.array(openingSchemaV2).max(200),
  furniture: z.array(furnitureSchema).max(500),
});

type DesignV2 = z.infer<typeof designSchemaV2>;

// ---- v3 (single room with several furnishing proposals) ----

const proposalSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(100),
  furniture: z.array(furnitureSchema).max(500),
});

const designSchemaV3 = z.object({
  schemaVersion: z.literal(3),
  name: z.string().max(200),
  updatedAt: z.string(),
  room: roomSchema,
  walls: z.array(wallSchema).max(400),
  openings: z.array(openingSchemaV2).max(200),
  furniture: z.array(furnitureSchema).max(500),
  proposals: z.array(proposalSchema).min(1).max(50),
  activeProposalId: z.string().min(1),
});

type DesignV3 = z.infer<typeof designSchemaV3>;

// ---- v4 (current format: a project holding several rooms) ----

/** One room inside a project — the v3 room body plus a stable id. */
const roomSchemaV4 = z.object({
  id: z.string().min(1).default(() => nanoid(8)),
  name: z.string().max(200),
  updatedAt: z.string().default(''),
  room: roomSchema,
  walls: z.array(wallSchema).max(400),
  openings: z.array(openingSchemaV2).max(200),
  furniture: z.array(furnitureSchema).max(500),
  proposals: z.array(proposalSchema).min(1).max(50),
  activeProposalId: z.string().min(1),
});

const projectSchemaV4 = z.object({
  schemaVersion: z.literal(4),
  name: z.string().max(200),
  updatedAt: z.string(),
  rooms: z.array(roomSchemaV4).min(1).max(50),
  activeRoomId: z.string().min(1),
});

type ProjectV4 = z.infer<typeof projectSchemaV4>;

// ---- v5 (current format: floor/wall colour moves onto each proposal) ----

/** The room now only carries what is shared across proposals: the ceiling height. */
const roomSchemaV5 = z.object({
  height: z.number().min(1).max(20),
});

/** A furnishing variant: its furniture plus its own floor/wall colours. */
const proposalSchemaV5 = z.object({
  id: z.string().min(1),
  name: z.string().max(100),
  furniture: z.array(furnitureSchema).max(500),
  floorColor: color.default(DEFAULT_FLOOR_COLOR),
  wallColor: color.default(DEFAULT_WALL_COLOR),
  floorMaterial: material,
  wallMaterial: material,
});

const roomSchemaEntryV5 = z.object({
  id: z.string().min(1).default(() => nanoid(8)),
  name: z.string().max(200),
  updatedAt: z.string().default(''),
  room: roomSchemaV5,
  walls: z.array(wallSchema).max(400),
  openings: z.array(openingSchemaV2).max(200),
  furniture: z.array(furnitureSchema).max(500),
  // Live mirror of the active proposal; normalizeProposals overwrites it on load.
  floorColor: color.default(DEFAULT_FLOOR_COLOR),
  wallColor: color.default(DEFAULT_WALL_COLOR),
  floorMaterial: material,
  wallMaterial: material,
  proposals: z.array(proposalSchemaV5).min(1).max(50),
  activeProposalId: z.string().min(1),
});

const projectSchemaV5 = z.object({
  schemaVersion: z.literal(5),
  name: z.string().max(200),
  updatedAt: z.string(),
  // A workspace may be empty (a new user has not created a room yet).
  rooms: z.array(roomSchemaEntryV5).max(50),
  // Empty while no room is active (empty workspace / sitting in the lobby).
  activeRoomId: z.string(),
});

/** Structural post-validation of a single room that the zod schema cannot express. */
function validateRoom(d: Design): Design {
  const exterior = d.walls.filter((w) => w.kind === 'exterior');
  // A room with no exterior walls is a not-yet-drawn room (created in the lobby,
  // outline still to be sketched) — a valid intermediate state, not a broken loop.
  if (exterior.length > 0) {
    const loop = validateExteriorLoop(exterior);
    if (!loop.ok) throw new Error(`Invalid room shape: ${loop.reason}`);
  }
  for (const w of d.walls) {
    if (w.kind === 'interior' && !isAxisParallel(w.a, w.b)) {
      throw new Error('Invalid room shape: Walls must be horizontal or vertical.');
    }
  }
  const wallIds = new Set(d.walls.map((w) => w.id));
  for (const o of d.openings) {
    if (!wallIds.has(o.wallId)) {
      throw new Error('A door or window points to a wall that does not exist.');
    }
  }
  return d;
}

/** The v1 room becomes four exterior walls in canonical loop order; offset semantics are preserved. */
export function migrateV1toV2(d: DesignV1): DesignV2 {
  const { width: w, length: l, height, floorColor, wallColor } = d.room;
  const mkWall = (a: Wall['a'], b: Wall['b']): Wall => ({
    id: nanoid(8),
    kind: 'exterior',
    a,
    b,
  });
  const north = mkWall({ x: -w / 2, z: -l / 2 }, { x: w / 2, z: -l / 2 });
  const east = mkWall({ x: w / 2, z: -l / 2 }, { x: w / 2, z: l / 2 });
  const south = mkWall({ x: w / 2, z: l / 2 }, { x: -w / 2, z: l / 2 });
  const west = mkWall({ x: -w / 2, z: l / 2 }, { x: -w / 2, z: -l / 2 });
  const idByCompass = { north: north.id, east: east.id, south: south.id, west: west.id };
  return {
    schemaVersion: 2,
    name: d.name,
    updatedAt: d.updatedAt,
    room: { height, floorColor, wallColor },
    walls: [north, east, south, west],
    openings: d.openings.map(({ wall, ...o }) => ({ ...o, wallId: idByCompass[wall] })),
    furniture: d.furniture,
  };
}

/** The single furnishing of a v2 design becomes the room's first proposal. */
export function migrateV2toV3(d: DesignV2): DesignV3 {
  // v3 proposals carry no colours yet — those are added in migrateV4toV5.
  const proposal = { id: nanoid(8), name: 'Proposal 1', furniture: d.furniture };
  return {
    ...d,
    schemaVersion: 3,
    proposals: [proposal],
    activeProposalId: proposal.id,
  };
}

/** A single (v3) room design becomes a project holding just that one room. */
export function migrateV3toV4(d: DesignV3): ProjectV4 {
  const room = {
    id: nanoid(8),
    name: d.name,
    updatedAt: d.updatedAt,
    room: d.room,
    walls: d.walls,
    openings: d.openings,
    furniture: d.furniture,
    proposals: d.proposals,
    activeProposalId: d.activeProposalId,
  };
  return {
    schemaVersion: 4,
    name: d.name,
    updatedAt: d.updatedAt,
    rooms: [room],
    activeRoomId: room.id,
  };
}

/**
 * The room's shared floor/wall colours move onto every furnishing proposal (and
 * the live mirror), so each variant can then be recoloured independently.
 */
export function migrateV4toV5(p: ProjectV4): Project {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: p.name,
    updatedAt: p.updatedAt,
    activeRoomId: p.activeRoomId,
    rooms: p.rooms.map((r) => {
      const { floorColor, wallColor } = r.room;
      // v4 had no materials — every surface starts on the default matte finish.
      const floorMaterial = DEFAULT_MATERIAL;
      const wallMaterial = DEFAULT_MATERIAL;
      return {
        id: r.id,
        name: r.name,
        updatedAt: r.updatedAt,
        room: { height: r.room.height },
        walls: r.walls,
        openings: r.openings,
        furniture: r.furniture,
        floorColor,
        wallColor,
        floorMaterial,
        wallMaterial,
        proposals: r.proposals.map((pr) => ({
          ...pr,
          floorColor,
          wallColor,
          floorMaterial,
          wallMaterial,
        })),
        activeProposalId: r.activeProposalId,
      };
    }),
  };
}

/**
 * Writes the live `furniture` and floor/wall colours back into their proposal so
 * the stored proposal snapshot matches what is on screen. Called before
 * persisting/exporting and before switching proposals.
 */
export function syncActiveProposal(d: Design): Design {
  return {
    ...d,
    proposals: d.proposals.map((p) =>
      p.id === d.activeProposalId
        ? {
            ...p,
            furniture: d.furniture,
            floorColor: d.floorColor,
            wallColor: d.wallColor,
            floorMaterial: d.floorMaterial,
            wallMaterial: d.wallMaterial,
          }
        : p,
    ),
  };
}

/**
 * Guarantees the proposal invariants: at least one proposal, a valid active id,
 * and `furniture`/colours mirroring the active proposal. Runs after every load so
 * older or hand-edited data can't leave the room in an inconsistent state.
 */
export function normalizeProposals(d: Design): Design {
  if (d.proposals.length === 0) {
    const proposal: Proposal = {
      id: nanoid(8),
      name: 'Proposal 1',
      furniture: d.furniture ?? [],
      floorColor: d.floorColor ?? DEFAULT_FLOOR_COLOR,
      wallColor: d.wallColor ?? DEFAULT_WALL_COLOR,
      floorMaterial: normalizeMaterial(d.floorMaterial),
      wallMaterial: normalizeMaterial(d.wallMaterial),
    };
    return {
      ...d,
      proposals: [proposal],
      activeProposalId: proposal.id,
      furniture: proposal.furniture,
      floorColor: proposal.floorColor,
      wallColor: proposal.wallColor,
      floorMaterial: proposal.floorMaterial,
      wallMaterial: proposal.wallMaterial,
    };
  }
  const active = d.proposals.find((p) => p.id === d.activeProposalId) ?? d.proposals[0];
  return {
    ...d,
    activeProposalId: active.id,
    furniture: active.furniture,
    floorColor: active.floorColor,
    wallColor: active.wallColor,
    floorMaterial: active.floorMaterial,
    wallMaterial: active.wallMaterial,
  };
}

/** The active room — the one the store's live `design` mirrors. */
export function activeRoom(p: Project): Design {
  return p.rooms.find((r) => r.id === p.activeRoomId) ?? p.rooms[0];
}

/**
 * Writes the live active room back into the project's `rooms` so the stored
 * snapshot matches what is on screen. Called before persisting/exporting and
 * before switching rooms — the room counterpart of {@link syncActiveProposal}.
 */
export function syncActiveRoom(p: Project, room: Design): Project {
  return {
    ...p,
    updatedAt: new Date().toISOString(),
    rooms: p.rooms.map((r) => (r.id === p.activeRoomId ? room : r)),
  };
}

/**
 * Guarantees the project invariants: at least one room, unique room ids, a
 * valid active room id, and every room's proposals normalized. Runs after every
 * load so older or hand-edited data can't leave the project inconsistent.
 */
export function normalizeProject(p: Project): Project {
  const seen = new Set<string>();
  const rooms = p.rooms.map((r) => {
    let id = r.id;
    while (seen.has(id)) id = nanoid(8);
    seen.add(id);
    const room = normalizeProposals(id === r.id ? r : { ...r, id });
    return room.updatedAt ? room : { ...room, updatedAt: p.updatedAt };
  });
  const active = rooms.find((r) => r.id === p.activeRoomId) ?? rooms[0];
  return { ...p, rooms, activeRoomId: active?.id ?? '' };
}

/** The single entry point for all untrusted project data (import, saves, rehydration). */
export function parseProject(raw: unknown): Project {
  const version = (raw as { schemaVersion?: unknown } | null)?.schemaVersion;
  let project: Project;
  if (version === 1) {
    project = migrateV4toV5(migrateV3toV4(migrateV2toV3(migrateV1toV2(designSchemaV1.parse(raw)))));
  } else if (version === 2) {
    project = migrateV4toV5(migrateV3toV4(migrateV2toV3(designSchemaV2.parse(raw))));
  } else if (version === 3) {
    project = migrateV4toV5(migrateV3toV4(designSchemaV3.parse(raw)));
  } else if (version === 4) {
    project = migrateV4toV5(projectSchemaV4.parse(raw));
  } else if (version === SCHEMA_VERSION) {
    project = projectSchemaV5.parse(raw);
  } else {
    throw new Error(
      `The file has schema version ${String(version)}, but the app supports version ${SCHEMA_VERSION}.`,
    );
  }
  project.rooms.forEach(validateRoom);
  return normalizeProject(project);
}

export function parseProjectSafe(raw: unknown): Project | null {
  try {
    return parseProject(raw);
  } catch {
    return null;
  }
}

// ---- Furniture library in localStorage ----

const LIBRARY_KEY = 'roomcraft:furniture-library';

const libraryEntrySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().max(100),
    kind: z.enum(FURNITURE_KINDS),
    size: furnitureSizeSchema,
    elevation: meters(20).default(0),
    color,
    colors: z.record(z.string(), z.string()).optional(),
    material: z.string().optional(),
    materials: z.record(z.string(), z.string()).optional(),
    options: furnitureOptionsSchema.optional(),
    product: z.unknown().optional(),
  })
  .transform((e) => ({
    ...e,
    colors: normalizeColors(e.kind, e.colors),
    material: normalizeMaterial(e.material),
    materials: normalizeMaterials(e.kind, e.materials, e.material),
    options: normalizeOptions(e.kind, e.options),
    product: normalizeProduct(e.product),
  }));

/** Reads the library; invalid entries are filtered out instead of throwing. */
export function listFurnitureLibrary(): FurnitureLibraryEntry[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: FurnitureLibraryEntry[] = [];
    for (const item of parsed) {
      const r = libraryEntrySchema.safeParse(item);
      if (r.success) out.push(r.data);
    }
    return out;
  } catch {
    return [];
  }
}

function writeLibrary(entries: FurnitureLibraryEntry[]) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries));
}

export function saveFurnitureToLibrary(
  entry: Omit<FurnitureLibraryEntry, 'id'>,
): FurnitureLibraryEntry {
  const saved: FurnitureLibraryEntry = { ...entry, id: nanoid(8) };
  writeLibrary([saved, ...listFurnitureLibrary()]);
  return saved;
}

export function deleteFurnitureFromLibrary(id: string) {
  writeLibrary(listFurnitureLibrary().filter((e) => e.id !== id));
}

export function renameFurnitureInLibrary(id: string, name: string) {
  writeLibrary(listFurnitureLibrary().map((e) => (e.id === id ? { ...e, name } : e)));
}
