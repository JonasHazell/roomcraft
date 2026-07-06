import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Design, FurnitureLibraryEntry, Proposal, Wall } from '../types';
import { SCHEMA_VERSION } from '../types';
import { isAxisParallel, validateExteriorLoop } from './polygon';
import { FURNITURE_KINDS } from './furnitureCatalog';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'invalid color code (expected #rrggbb)');
const meters = (max: number) => z.number().min(0).max(max);

const furnitureSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(FURNITURE_KINDS),
  name: z.string().max(100),
  position: z.object({ x: z.number().min(-100).max(100), z: z.number().min(-100).max(100) }),
  rotationY: z.number().min(-100).max(100),
  size: z.object({
    width: z.number().min(0.01).max(100),
    depth: z.number().min(0.01).max(100),
    height: z.number().min(0.01).max(20),
  }),
  /** Missing in saves made before the field existed — falls back to the floor. */
  elevation: meters(20).default(0),
  color,
});

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

// ---- v3 (current format: several furnishing proposals per room) ----

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

/** Structural post-validation that the zod schema cannot express. */
function validateDesign(d: Design): Design {
  const exterior = d.walls.filter((w) => w.kind === 'exterior');
  const loop = validateExteriorLoop(exterior);
  if (!loop.ok) throw new Error(`Invalid room shape: ${loop.reason}`);
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
export function migrateV2toV3(d: DesignV2): Design {
  const proposal: Proposal = { id: nanoid(8), name: 'Proposal 1', furniture: d.furniture };
  return {
    ...d,
    schemaVersion: SCHEMA_VERSION,
    proposals: [proposal],
    activeProposalId: proposal.id,
  };
}

/**
 * Writes the live `furniture` back into its proposal so the stored proposal
 * snapshot matches what is on screen. Called before persisting/exporting and
 * before switching proposals.
 */
export function syncActiveProposal(d: Design): Design {
  return {
    ...d,
    proposals: d.proposals.map((p) =>
      p.id === d.activeProposalId ? { ...p, furniture: d.furniture } : p,
    ),
  };
}

/**
 * Guarantees the proposal invariants: at least one proposal, a valid active id,
 * and `furniture` mirroring the active proposal. Runs after every load so older
 * or hand-edited data can't leave the design in an inconsistent state.
 */
export function normalizeProposals(d: Design): Design {
  if (d.proposals.length === 0) {
    const proposal: Proposal = { id: nanoid(8), name: 'Proposal 1', furniture: d.furniture ?? [] };
    return { ...d, proposals: [proposal], activeProposalId: proposal.id, furniture: proposal.furniture };
  }
  const active = d.proposals.find((p) => p.id === d.activeProposalId) ?? d.proposals[0];
  return { ...d, activeProposalId: active.id, furniture: active.furniture };
}

/** The single entry point for all untrusted design data (import, saves, rehydration). */
export function parseDesign(raw: unknown): Design {
  const version = (raw as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (version === 1) {
    return normalizeProposals(validateDesign(migrateV2toV3(migrateV1toV2(designSchemaV1.parse(raw)))));
  }
  if (version === 2) {
    return normalizeProposals(validateDesign(migrateV2toV3(designSchemaV2.parse(raw))));
  }
  if (version === SCHEMA_VERSION) {
    return normalizeProposals(validateDesign(designSchemaV3.parse(raw)));
  }
  throw new Error(
    `The file has schema version ${String(version)}, but the app supports version ${SCHEMA_VERSION}.`,
  );
}

export function parseDesignSafe(raw: unknown): Design | null {
  try {
    return parseDesign(raw);
  } catch {
    return null;
  }
}

export async function importDesign(file: File): Promise<Design> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  try {
    return parseDesign(parsed);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const issues = e.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      throw new Error(`The file could not be read as a room design — ${issues}`);
    }
    throw e;
  }
}

export function exportDesign(design: Design) {
  const blob = new Blob([JSON.stringify(syncActiveProposal(design), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${design.name.trim() || 'room'}.room.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Named saves in localStorage ----

const SAVES_KEY = 'roomcraft:saves';

/** Values may be older schemas; they are validated/migrated first in loadSave. */
type SavesMap = Record<string, { name: string; updatedAt: string }>;

function readSaves(): SavesMap {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    return raw ? (JSON.parse(raw) as SavesMap) : {};
  } catch {
    return {};
  }
}

function writeSaves(saves: SavesMap) {
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
}

export interface SaveInfo {
  name: string;
  updatedAt: string;
}

export function listSaves(): SaveInfo[] {
  return Object.values(readSaves())
    .map((d) => ({ name: d.name, updatedAt: d.updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveAs(name: string, design: Design) {
  const saves = readSaves();
  saves[name] = { ...syncActiveProposal(design), name, updatedAt: new Date().toISOString() };
  writeSaves(saves);
}

export function loadSave(name: string): Design | null {
  const raw = readSaves()[name];
  return raw ? parseDesignSafe(raw) : null;
}

export function deleteSave(name: string) {
  const saves = readSaves();
  delete saves[name];
  writeSaves(saves);
}

// ---- Furniture library in localStorage ----

const LIBRARY_KEY = 'roomcraft:furniture-library';

const libraryEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().max(100),
  kind: z.enum(FURNITURE_KINDS),
  size: z.object({
    width: z.number().min(0.01).max(100),
    depth: z.number().min(0.01).max(100),
    height: z.number().min(0.01).max(20),
  }),
  elevation: meters(20).default(0),
  color,
});

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
