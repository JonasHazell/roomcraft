import { nanoid } from 'nanoid';
import type {
  Design,
  FurnitureItem,
  FurnitureKind,
  FurnitureLibraryEntry,
  FurnitureOptions,
  FurnitureSize,
  Point,
  Project,
  Proposal,
  Room,
  Wall,
  WallOpening,
} from '../types';
import { DEFAULT_FLOOR_COLOR, DEFAULT_WALL_COLOR, SCHEMA_VERSION } from '../types';
import { clampFurniture, clampOpening, findClearSpot, furnitureObstacles } from '../lib/collision';
import { normalizeOptions } from '../lib/furnitureOptions';
import { DEFAULT_MATERIAL, normalizeMaterial } from '../lib/materials';
import { normalizeColors, normalizeMaterials } from '../lib/furnitureParts';
import { floorPolygon, polygonCenter, type LoopValidation } from '../lib/polygon';
import { activeRoom, syncActiveProposal, syncActiveRoom } from '../lib/persistence';

// ---- Naming helpers ----

/** First free "Proposal N" name for a fresh proposal. */
export function nextProposalName(proposals: Proposal[]): string {
  const taken = new Set(proposals.map((p) => p.name));
  let n = proposals.length + 1;
  while (taken.has(`Proposal ${n}`)) n++;
  return `Proposal ${n}`;
}

/** First free "Room N" name for a fresh room. */
export function nextRoomName(rooms: Design[]): string {
  const taken = new Set(rooms.map((r) => r.name));
  let n = rooms.length + 1;
  while (taken.has(`Room ${n}`)) n++;
  return `Room ${n}`;
}

/** Deep-copies furniture with fresh ids — used when a new proposal starts from an existing one. */
export function cloneFurniture(items: FurnitureItem[]): FurnitureItem[] {
  return items.map((f) => ({
    ...f,
    id: nanoid(8),
    size: { ...f.size },
    position: { ...f.position },
    colors: f.colors ? { ...f.colors } : undefined,
    materials: f.materials ? { ...f.materials } : undefined,
    options: f.options ? { ...f.options } : undefined,
  }));
}

export type FurniturePatch = Partial<Omit<FurnitureItem, 'id' | 'size' | 'position' | 'colors'>> & {
  size?: Partial<FurnitureItem['size']>;
  position?: Partial<FurnitureItem['position']>;
  /**
   * Per-part colour changes, merged onto the piece's existing sparse `colors`
   * map (see {@link mergeColorOverrides}). A key set to `undefined` clears that
   * part's override so it resumes following the primary colour.
   */
  colors?: Record<string, string | undefined>;
};

/** The caller-supplied spec for a piece placed into the room (before it gets an id/position). */
export interface FurnitureSpec {
  kind: FurnitureKind;
  name: string;
  size: FurnitureSize;
  elevation: number;
  color: string;
  colors?: Record<string, string>;
  material?: string;
  materials?: Record<string, string>;
  options?: FurnitureOptions;
}

// ---- Factories ----

export function createDefaultRoom(name = 'Room 1'): Design {
  // The same 4×5 m room as earlier versions, expressed as an exterior wall chain.
  const north: Wall = { id: nanoid(8), kind: 'exterior', a: { x: -2, z: -2.5 }, b: { x: 2, z: -2.5 } };
  const east: Wall = { id: nanoid(8), kind: 'exterior', a: { x: 2, z: -2.5 }, b: { x: 2, z: 2.5 } };
  const south: Wall = { id: nanoid(8), kind: 'exterior', a: { x: 2, z: 2.5 }, b: { x: -2, z: 2.5 } };
  const west: Wall = { id: nanoid(8), kind: 'exterior', a: { x: -2, z: 2.5 }, b: { x: -2, z: -2.5 } };
  const proposalId = nanoid(8);
  return {
    id: nanoid(8),
    name,
    updatedAt: new Date().toISOString(),
    room: {
      height: 2.5,
    },
    floorColor: DEFAULT_FLOOR_COLOR,
    wallColor: DEFAULT_WALL_COLOR,
    floorMaterial: DEFAULT_MATERIAL,
    wallMaterial: DEFAULT_MATERIAL,
    walls: [north, east, south, west],
    proposals: [
      {
        id: proposalId,
        name: 'Proposal 1',
        furniture: [],
        floorColor: DEFAULT_FLOOR_COLOR,
        wallColor: DEFAULT_WALL_COLOR,
        floorMaterial: DEFAULT_MATERIAL,
        wallMaterial: DEFAULT_MATERIAL,
      },
    ],
    activeProposalId: proposalId,
    openings: [
      {
        id: nanoid(8),
        kind: 'door',
        wallId: south.id,
        offset: 0.7,
        width: 0.9,
        height: 2.1,
        elevation: 0,
      },
      {
        id: nanoid(8),
        kind: 'window',
        wallId: north.id,
        offset: 1.2,
        width: 1.4,
        height: 1.2,
        elevation: 0.9,
      },
    ],
    furniture: [],
  };
}

/** A fresh project holding a single default room. */
export function createDefaultProject(): Project {
  const room = createDefaultRoom('Room 1');
  return {
    schemaVersion: SCHEMA_VERSION,
    name: 'My project',
    updatedAt: room.updatedAt,
    rooms: [room],
    activeRoomId: room.id,
  };
}

/**
 * A brand-new room with no floor plan yet: no walls or openings and one empty
 * furnishing. Created from the lobby's "New room", which then drops the user
 * straight into the floor-plan editor to draw the outline.
 */
export function createEmptyRoom(name = 'Room 1'): Design {
  const proposalId = nanoid(8);
  return {
    id: nanoid(8),
    name,
    updatedAt: new Date().toISOString(),
    room: { height: 2.5 },
    floorColor: DEFAULT_FLOOR_COLOR,
    wallColor: DEFAULT_WALL_COLOR,
    floorMaterial: DEFAULT_MATERIAL,
    wallMaterial: DEFAULT_MATERIAL,
    walls: [],
    openings: [],
    proposals: [
      {
        id: proposalId,
        name: 'Proposal 1',
        furniture: [],
        floorColor: DEFAULT_FLOOR_COLOR,
        wallColor: DEFAULT_WALL_COLOR,
        floorMaterial: DEFAULT_MATERIAL,
        wallMaterial: DEFAULT_MATERIAL,
      },
    ],
    activeProposalId: proposalId,
    furniture: [],
  };
}

/** An empty workspace: no rooms yet. The lobby shows the "create your first room" state. */
export function createEmptyProject(): Project {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: 'My rooms',
    updatedAt: new Date().toISOString(),
    rooms: [],
    activeRoomId: '',
  };
}

/** The active room, or a throwaway placeholder while the workspace has no rooms. */
export function activeOrPlaceholder(p: Project): Design {
  return activeRoom(p) ?? createEmptyRoom();
}

/**
 * Deep-copies a room with fresh ids — used when a new room starts from an
 * existing one. Wall ids are remapped so openings keep pointing at their wall,
 * and every proposal (and its furniture) gets new ids too.
 */
export function cloneRoom(src: Design, name: string): Design {
  const wallIdMap = new Map<string, string>();
  const walls = src.walls.map((w) => {
    const id = nanoid(8);
    wallIdMap.set(w.id, id);
    return { ...w, id, a: { ...w.a }, b: { ...w.b } };
  });
  const openings = src.openings.map((o) => ({
    ...o,
    id: nanoid(8),
    wallId: wallIdMap.get(o.wallId) ?? o.wallId,
  }));
  const proposals = src.proposals.map((p) => {
    const isActive = p.id === src.activeProposalId;
    return {
      id: nanoid(8),
      name: p.name,
      furniture: cloneFurniture(isActive ? src.furniture : p.furniture),
      floorColor: isActive ? src.floorColor : p.floorColor,
      wallColor: isActive ? src.wallColor : p.wallColor,
      floorMaterial: isActive ? src.floorMaterial : p.floorMaterial,
      wallMaterial: isActive ? src.wallMaterial : p.wallMaterial,
    };
  });
  const activeIdx = Math.max(0, src.proposals.findIndex((p) => p.id === src.activeProposalId));
  const active = proposals[activeIdx] ?? proposals[0];
  return {
    id: nanoid(8),
    name,
    updatedAt: new Date().toISOString(),
    room: { ...src.room },
    floorColor: active.floorColor,
    wallColor: active.wallColor,
    floorMaterial: active.floorMaterial,
    wallMaterial: active.wallMaterial,
    walls,
    openings,
    proposals,
    activeProposalId: active.id,
    furniture: active.furniture,
  };
}

// ---- Live-mirror helpers ----

/** Refreshes a room's updatedAt stamp on every edit. */
export function touch(design: Design): Design {
  return { ...design, updatedAt: new Date().toISOString() };
}

export function wallById(d: Design, id: string): Wall | undefined {
  return d.walls.find((w) => w.id === id);
}

/** Clamps an opening to its wall; openings without a wall are left to validation. */
export function clampOpeningIn(d: Design, o: WallOpening): WallOpening {
  const wall = wallById(d, o.wallId);
  return wall ? clampOpening(o, wall, d.room.height) : o;
}

/**
 * The project with the on-screen room (and its active proposal) folded back in —
 * the snapshot that matches what is on screen. Called before adding, switching
 * or removing a room. Encapsulates the two-level live-mirror sync so no action
 * has to remember to run both {@link syncActiveRoom} and {@link syncActiveProposal}.
 */
export function syncedProject(project: Project, design: Design): Project {
  return syncActiveRoom(project, syncActiveProposal(design));
}

/**
 * Builds a furniture piece placed at the room centre with a small random nudge
 * (so several added pieces don't hide each other), steered clear of furniture
 * already in the room, and clamped inside the walls. Shared by every "add a piece
 * to the room" action.
 */
export function placeAtCenter(d: Design, spec: FurnitureSpec): FurnitureItem {
  const poly = floorPolygon(d.walls);
  const center = polygonCenter(poly);
  const nudge = () => (Math.random() - 0.5) * 0.6;
  const candidate = { x: center.x + nudge(), z: center.z + nudge() };
  const footprint = { position: candidate, rotationY: 0, size: spec.size };
  const obstacles = furnitureObstacles(d.furniture, spec.kind);
  const position = findClearSpot(footprint, candidate, poly, d.walls, obstacles);
  return clampFurniture(
    {
      id: nanoid(8),
      kind: spec.kind,
      name: spec.name,
      position,
      rotationY: 0,
      size: { ...spec.size },
      elevation: spec.elevation,
      color: spec.color,
      colors: normalizeColors(spec.kind, spec.colors),
      material: normalizeMaterial(spec.material),
      materials: normalizeMaterials(spec.kind, spec.materials, spec.material),
      options: normalizeOptions(spec.kind, spec.options),
    },
    poly,
  );
}

// ---- Store shape ----

/** The live document state every slice reads and writes. */
export interface DesignData {
  /** The whole document: all rooms + which one is active. */
  project: Project;
  /** The live active room; every wall/opening/furniture action reads and writes it. */
  design: Design;
}

export interface RoomActions {
  setProjectName: (name: string) => void;
  /**
   * Creates a new room and makes it active. `copyCurrent` duplicates the active
   * room (shape + furnishings); otherwise a fresh default room is added.
   */
  addRoom: (opts: { name?: string; copyCurrent: boolean }) => string;
  /**
   * Creates a new, undrawn room (no walls yet) and makes it active. Used by the
   * lobby's "New room", which then opens the floor-plan editor to draw it.
   */
  createRoom: (name?: string) => string;
  /** Snapshots the active room back into the project before returning to the lobby. */
  exitToLobby: () => void;
  /**
   * Snapshots the active room back into the project, then drops the given room if
   * it is still undrawn (no exterior walls). Used when leaving the plan editor so
   * a room created via "New room" but never drawn leaves no empty room behind.
   */
  discardRoomIfUndrawn: (id: string) => void;
  /** Duplicates a room by id (floor plan + furnishings) without leaving the lobby. */
  duplicateRoom: (id: string) => string;
  /** Activates another room; its floor plan and furnishings replace the live ones. */
  setActiveRoom: (id: string) => void;
  renameRoom: (id: string, name: string) => void;
  /** Removes a room; a project always keeps at least one. */
  removeRoom: (id: string) => void;
  setName: (name: string) => void;
  setRoom: (patch: Partial<Room>) => void;
  /**
   * Recolours and/or re-finishes the floor and walls of the active proposal.
   * Different proposals of the same room can therefore carry different palettes
   * and materials.
   */
  setColors: (patch: {
    floorColor?: string;
    wallColor?: string;
    floorMaterial?: string;
    wallMaterial?: string;
  }) => void;
}

export interface PlanActions {
  commitExteriorPolygon: (points: Point[]) => LoopValidation;
  addInteriorWall: (a: Point, b: Point) => string | null;
  removeWall: (id: string) => void;
  moveWall: (id: string, coord: number) => void;
  /**
   * Drags a corner of the exterior loop — the point shared by two adjacent walls
   * (one horizontal, one vertical) — so it lands at (x, z). Each wall slides
   * perpendicular, keeping the outline rectilinear and closed.
   */
  moveCorner: (wallAId: string, wallBId: string, x: number, z: number) => void;
  resizeWall: (id: string, newLen: number) => void;
  addOpening: (o: Omit<WallOpening, 'id'>) => string | null;
  updateOpening: (id: string, patch: Partial<Omit<WallOpening, 'id'>>) => void;
  removeOpening: (id: string) => void;
}

export interface FurnitureActions {
  addFurniture: (kind: FurnitureKind) => string;
  /** Places a piece with caller-supplied name/size/color/options at the room center (the "Add furniture" dialog). */
  addFurnitureConfigured: (config: FurnitureSpec) => string;
  /** Places a saved library furniture piece at the center of the room and returns its id. */
  addFurnitureFromLibrary: (entry: FurnitureLibraryEntry) => string;
  duplicateFurniture: (id: string) => string | null;
  updateFurniture: (id: string, patch: FurniturePatch) => void;
  moveFurniture: (id: string, x: number, z: number) => void;
  removeFurniture: (id: string) => void;
  /** Replaces the entire furnishing of the active proposal. */
  setFurniture: (items: Omit<FurnitureItem, 'id'>[]) => void;
  /**
   * Rearranges the existing pieces (move + rotate, same set and ids) to raise the
   * design score, in a single undoable step. Local and deterministic — no AI. Does
   * nothing and returns null when it can't improve on the current layout;
   * otherwise returns the before/after score (0–100) for optional feedback.
   */
  autoArrange: () => { before: number; after: number } | null;
}

export interface ProposalActions {
  /**
   * Creates a new furnishing proposal for the room and makes it active.
   * `copyCurrent` starts it from the active proposal's furniture; otherwise empty.
   */
  addProposal: (opts: { name?: string; copyCurrent: boolean }) => string;
  /**
   * Creates a new proposal from a given furnishing (e.g. an applied AI layout)
   * and activates it. Optional `colors` set the proposal's floor/wall palette;
   * anything omitted inherits the currently active proposal's colour.
   */
  addProposalFromFurniture: (
    name: string,
    items: Omit<FurnitureItem, 'id'>[],
    colors?: { floorColor?: string; wallColor?: string },
  ) => string;
  /** Activates another proposal; the room shape stays, only the furnishing swaps. */
  setActiveProposal: (id: string) => void;
  /** Renames a proposal; a blank name falls back to the next free "Proposal N". */
  renameProposal: (id: string, name: string) => void;
  /**
   * Reorders proposals, moving the dragged one so it lands at the target's
   * position (drag-to-sort in the switcher list).
   */
  reorderProposals: (fromId: string, toId: string) => void;
  /** Removes a proposal; a room always keeps at least one. */
  removeProposal: (id: string) => void;
}

export interface DocumentActions {
  loadProject: (p: Project) => void;
  newProject: () => void;
}

export type DesignState = DesignData &
  RoomActions &
  PlanActions &
  FurnitureActions &
  ProposalActions &
  DocumentActions;

/** The (set, get) a slice factory receives from the store. */
export type DesignSet = (partial: Partial<DesignState>) => void;
export type DesignGet = () => DesignState;

// Re-exported so slices and store consumers needn't reach into the polygon module.
export type { LoopValidation };
