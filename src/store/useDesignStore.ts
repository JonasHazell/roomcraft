import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  Design,
  FurnitureItem,
  FurnitureKind,
  FurnitureLibraryEntry,
  FurnitureSize,
  Point,
  Project,
  Proposal,
  Room,
  Wall,
  WallOpening,
} from '../types';
import { DEFAULT_FLOOR_COLOR, DEFAULT_WALL_COLOR, SCHEMA_VERSION } from '../types';
import { clampFurniture, clampOpening, furnitureFits, slideFurniture } from '../lib/geometry';
import {
  GRID,
  clampToPolygon,
  floorPolygon,
  isAxisParallel,
  normalizeWinding,
  polygonCenter,
  validateExteriorLoop,
  wallDir,
  wallLen,
  wallsFromPolygon,
  type LoopValidation,
} from '../lib/polygon';
import {
  activeRoom,
  normalizeProject,
  parseProjectSafe,
  syncActiveProposal,
  syncActiveRoom,
} from '../lib/persistence';
import { FURNITURE_CATALOG } from '../lib/furnitureCatalog';

/** First free "Proposal N" name for a fresh proposal. */
function nextProposalName(proposals: Proposal[]): string {
  const taken = new Set(proposals.map((p) => p.name));
  let n = proposals.length + 1;
  while (taken.has(`Proposal ${n}`)) n++;
  return `Proposal ${n}`;
}

/** First free "Room N" name for a fresh room. */
function nextRoomName(rooms: Design[]): string {
  const taken = new Set(rooms.map((r) => r.name));
  let n = rooms.length + 1;
  while (taken.has(`Room ${n}`)) n++;
  return `Room ${n}`;
}

/** Deep-copies furniture with fresh ids — used when a new proposal starts from an existing one. */
function cloneFurniture(items: FurnitureItem[]): FurnitureItem[] {
  return items.map((f) => ({
    ...f,
    id: nanoid(8),
    size: { ...f.size },
    position: { ...f.position },
  }));
}

export type FurniturePatch = Partial<Omit<FurnitureItem, 'id' | 'size' | 'position'>> & {
  size?: Partial<FurnitureItem['size']>;
  position?: Partial<FurnitureItem['position']>;
};

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
    walls: [north, east, south, west],
    proposals: [
      {
        id: proposalId,
        name: 'Proposal 1',
        furniture: [],
        floorColor: DEFAULT_FLOOR_COLOR,
        wallColor: DEFAULT_WALL_COLOR,
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
 * Deep-copies a room with fresh ids — used when a new room starts from an
 * existing one. Wall ids are remapped so openings keep pointing at their wall,
 * and every proposal (and its furniture) gets new ids too.
 */
function cloneRoom(src: Design, name: string): Design {
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
    walls,
    openings,
    proposals,
    activeProposalId: active.id,
    furniture: active.furniture,
  };
}

interface DesignState {
  /** The whole document: all rooms + which one is active. */
  project: Project;
  /** The live active room; every wall/opening/furniture action reads and writes it. */
  design: Design;
  setProjectName: (name: string) => void;
  /**
   * Creates a new room and makes it active. `copyCurrent` duplicates the active
   * room (shape + furnishings); otherwise a fresh default room is added.
   */
  addRoom: (opts: { name?: string; copyCurrent: boolean }) => string;
  /** Activates another room; its floor plan and furnishings replace the live ones. */
  setActiveRoom: (id: string) => void;
  renameRoom: (id: string, name: string) => void;
  /** Removes a room; a project always keeps at least one. */
  removeRoom: (id: string) => void;
  setName: (name: string) => void;
  setRoom: (patch: Partial<Room>) => void;
  /**
   * Recolours the floor and/or walls of the active proposal. Different proposals
   * of the same room can therefore carry different palettes.
   */
  setColors: (patch: { floorColor?: string; wallColor?: string }) => void;
  commitExteriorPolygon: (points: Point[]) => LoopValidation;
  addInteriorWall: (a: Point, b: Point) => string | null;
  removeWall: (id: string) => void;
  moveWall: (id: string, coord: number) => void;
  resizeWall: (id: string, newLen: number) => void;
  addOpening: (o: Omit<WallOpening, 'id'>) => void;
  updateOpening: (id: string, patch: Partial<Omit<WallOpening, 'id'>>) => void;
  removeOpening: (id: string) => void;
  addFurniture: (kind: FurnitureKind) => string;
  /** Places a piece with caller-supplied name/size/color at the room center (the "Add furniture" dialog). */
  addFurnitureConfigured: (config: {
    kind: FurnitureKind;
    name: string;
    size: FurnitureSize;
    elevation: number;
    color: string;
  }) => string;
  /** Places a saved library furniture piece at the center of the room and returns its id. */
  addFurnitureFromLibrary: (entry: FurnitureLibraryEntry) => string;
  duplicateFurniture: (id: string) => string | null;
  updateFurniture: (id: string, patch: FurniturePatch) => void;
  moveFurniture: (id: string, x: number, z: number) => void;
  removeFurniture: (id: string) => void;
  /** Replaces the entire furnishing of the active proposal. */
  setFurniture: (items: Omit<FurnitureItem, 'id'>[]) => void;
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
  renameProposal: (id: string, name: string) => void;
  /** Removes a proposal; a room always keeps at least one. */
  removeProposal: (id: string) => void;
  loadProject: (p: Project) => void;
  newProject: () => void;
}

function touch(design: Design): Design {
  return { ...design, updatedAt: new Date().toISOString() };
}

function wallById(d: Design, id: string): Wall | undefined {
  return d.walls.find((w) => w.id === id);
}

/** Clamps an opening to its wall; openings without a wall are left to validation. */
function clampOpeningIn(d: Design, o: WallOpening): WallOpening {
  const wall = wallById(d, o.wallId);
  return wall ? clampOpening(o, wall, d.room.height) : o;
}

const bootProject = createDefaultProject();

export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => ({
      project: bootProject,
      design: activeRoom(bootProject),

      setProjectName: (name) =>
        set({ project: { ...get().project, name, updatedAt: new Date().toISOString() } }),

      addRoom: ({ name, copyCurrent }) => {
        // Snapshot the current room into the project before adding a sibling.
        const project = syncActiveRoom(get().project, syncActiveProposal(get().design));
        const room = copyCurrent
          ? cloneRoom(get().design, name?.trim() || nextRoomName(project.rooms))
          : createDefaultRoom(name?.trim() || nextRoomName(project.rooms));
        set({
          project: { ...project, rooms: [...project.rooms, room], activeRoomId: room.id },
          design: room,
        });
        return room.id;
      },

      setActiveRoom: (id) => {
        const cur = get();
        if (id === cur.project.activeRoomId) return;
        // Persist the on-screen room before swapping in the target's.
        const project = syncActiveRoom(cur.project, syncActiveProposal(cur.design));
        const target = project.rooms.find((r) => r.id === id);
        if (!target) return;
        set({ project: { ...project, activeRoomId: id }, design: target });
      },

      renameRoom: (id, name) => {
        const { project, design } = get();
        const trimmed = name.trim() || nextRoomName(project.rooms.filter((r) => r.id !== id));
        set({
          project: {
            ...project,
            rooms: project.rooms.map((r) => (r.id === id ? { ...r, name: trimmed } : r)),
          },
          design: design.id === id ? { ...design, name: trimmed } : design,
        });
      },

      removeRoom: (id) => {
        const cur = get();
        if (cur.project.rooms.length <= 1) return; // keep at least one room per project
        const project = syncActiveRoom(cur.project, syncActiveProposal(cur.design));
        const idx = project.rooms.findIndex((r) => r.id === id);
        if (idx === -1) return;
        const rooms = project.rooms.filter((r) => r.id !== id);
        if (id !== project.activeRoomId) {
          set({ project: { ...project, rooms } });
          return;
        }
        // Removing the active room: fall back to the previous room in the list.
        const nextActive = rooms[Math.max(0, idx - 1)];
        set({ project: { ...project, rooms, activeRoomId: nextActive.id }, design: nextActive });
      },

      setName: (name) => set({ design: touch({ ...get().design, name }) }),

      setRoom: (patch) => {
        const d = get().design;
        const room = { ...d.room, ...patch };
        const next = { ...d, room };
        // Re-clamp the openings so a lowered ceiling never leaves anything outside.
        set({
          design: touch({
            ...next,
            openings: next.openings.map((o) => clampOpeningIn(next, o)),
          }),
        });
      },

      setColors: (patch) => {
        const d = get().design;
        set({ design: touch({ ...d, ...patch }) });
      },

      commitExteriorPolygon: (points) => {
        const pts = normalizeWinding(points);
        const walls = wallsFromPolygon(pts, () => nanoid(8));
        const check = validateExteriorLoop(walls);
        if (!check.ok) return check;
        const d = get().design;
        const oldExteriorIds = new Set(
          d.walls.filter((w) => w.kind === 'exterior').map((w) => w.id),
        );
        set({
          design: touch({
            ...d,
            walls: [...walls, ...d.walls.filter((w) => w.kind === 'interior')],
            openings: d.openings.filter((o) => !oldExteriorIds.has(o.wallId)),
            furniture: d.furniture.map((f) => clampFurniture(f, pts)),
          }),
        });
        return check;
      },

      addInteriorWall: (a, b) => {
        if (!isAxisParallel(a, b) || wallLen({ a, b }) < GRID) return null;
        const d = get().design;
        const wall: Wall = { id: nanoid(8), kind: 'interior', a, b };
        set({ design: touch({ ...d, walls: [...d.walls, wall] }) });
        return wall.id;
      },

      removeWall: (id) => {
        const d = get().design;
        const wall = wallById(d, id);
        if (!wall || wall.kind !== 'interior') return; // exterior walls are redrawn as an outline
        set({
          design: touch({
            ...d,
            walls: d.walls.filter((w) => w.id !== id),
            openings: d.openings.filter((o) => o.wallId !== id),
          }),
        });
      },

      moveWall: (id, coord) => {
        const d = get().design;
        const wall = wallById(d, id);
        if (!wall) return;
        const horizontal = wall.a.z === wall.b.z;
        const moved: Wall = horizontal
          ? { ...wall, a: { ...wall.a, z: coord }, b: { ...wall.b, z: coord } }
          : { ...wall, a: { ...wall.a, x: coord }, b: { ...wall.b, x: coord } };

        let walls: Wall[];
        if (wall.kind === 'interior') {
          walls = d.walls.map((w) => (w.id === id ? moved : w));
        } else {
          // The neighboring walls follow at their endpoints so the loop stays closed.
          walls = d.walls.map((w) => {
            if (w.id === id) return moved;
            if (w.kind !== 'exterior') return w;
            const b = w.b.x === wall.a.x && w.b.z === wall.a.z ? moved.a : w.b;
            const a = w.a.x === wall.b.x && w.a.z === wall.b.z ? moved.b : w.a;
            return a === w.a && b === w.b ? w : { ...w, a, b };
          });
          const check = validateExteriorLoop(walls.filter((w) => w.kind === 'exterior'));
          if (!check.ok) return; // reject drags that break the outline
        }

        const poly = floorPolygon(walls);
        const next = { ...d, walls };
        set({
          design: touch({
            ...next,
            openings: next.openings.map((o) => clampOpeningIn(next, o)),
            furniture: next.furniture.map((f) => clampFurniture(f, poly)),
          }),
        });
      },

      resizeWall: (id, newLen) => {
        const d = get().design;
        const wall = wallById(d, id);
        if (!wall) return;
        const len = Math.max(GRID, Math.round(newLen * 1000) / 1000);
        const delta = len - wallLen(wall);
        if (Math.abs(delta) < 0.0005) return;
        const dir = wallDir(wall);
        if (wall.kind === 'interior') {
          // The length changes at the end (b); the start and the offset zero stay fixed.
          const b = {
            x: Math.round((wall.b.x + dir.x * delta) * 1000) / 1000,
            z: Math.round((wall.b.z + dir.z * delta) * 1000) / 1000,
          };
          const next = { ...d, walls: d.walls.map((w) => (w.id === id ? { ...w, b } : w)) };
          set({
            design: touch({
              ...next,
              openings: next.openings.map((o) => clampOpeningIn(next, o)),
            }),
          });
          return;
        }
        // Exterior wall: the end is moved by pushing the next wall in the chain
        // perpendicularly — exactly the same operation as dragging that wall, so
        // loop validation and re-clamping are reused.
        const exterior = d.walls.filter((w) => w.kind === 'exterior');
        const i = exterior.findIndex((w) => w.id === id);
        const nextWall = exterior[(i + 1) % exterior.length];
        const coord =
          nextWall.a.z === nextWall.b.z
            ? nextWall.a.z + dir.z * delta
            : nextWall.a.x + dir.x * delta;
        get().moveWall(nextWall.id, Math.round(coord * 1000) / 1000);
      },

      addOpening: (o) => {
        const d = get().design;
        if (!wallById(d, o.wallId)) return;
        const opening = clampOpeningIn(d, { ...o, id: nanoid(8) });
        set({ design: touch({ ...d, openings: [...d.openings, opening] }) });
      },

      updateOpening: (id, patch) => {
        const d = get().design;
        set({
          design: touch({
            ...d,
            openings: d.openings.map((o) =>
              o.id === id ? clampOpeningIn(d, { ...o, ...patch }) : o,
            ),
          }),
        });
      },

      removeOpening: (id) => {
        const d = get().design;
        set({ design: touch({ ...d, openings: d.openings.filter((o) => o.id !== id) }) });
      },

      addFurniture: (kind) => {
        const d = get().design;
        const poly = floorPolygon(d.walls);
        const center = polygonCenter(poly);
        const entry = FURNITURE_CATALOG[kind];
        const id = nanoid(8);
        // Small random nudge so several newly created pieces don't hide each other completely.
        const nudge = () => (Math.random() - 0.5) * 0.6;
        const item: FurnitureItem = clampFurniture(
          {
            id,
            kind,
            name: entry.label,
            position: { x: center.x + nudge(), z: center.z + nudge() },
            rotationY: 0,
            size: { ...entry.defaultSize },
            elevation: 0,
            color: entry.defaultColor,
          },
          poly,
        );
        set({ design: touch({ ...d, furniture: [...d.furniture, item] }) });
        return id;
      },

      addFurnitureConfigured: (config) => {
        const d = get().design;
        const poly = floorPolygon(d.walls);
        const center = polygonCenter(poly);
        const id = nanoid(8);
        // Small random nudge so several added pieces don't hide each other completely.
        const nudge = () => (Math.random() - 0.5) * 0.6;
        const item: FurnitureItem = clampFurniture(
          {
            id,
            kind: config.kind,
            name: config.name,
            position: { x: center.x + nudge(), z: center.z + nudge() },
            rotationY: 0,
            size: { ...config.size },
            elevation: config.elevation,
            color: config.color,
          },
          poly,
        );
        set({ design: touch({ ...d, furniture: [...d.furniture, item] }) });
        return id;
      },

      addFurnitureFromLibrary: (entry) => {
        const d = get().design;
        const poly = floorPolygon(d.walls);
        const center = polygonCenter(poly);
        const id = nanoid(8);
        // Small random nudge so several added pieces don't hide each other completely.
        const nudge = () => (Math.random() - 0.5) * 0.6;
        const item: FurnitureItem = clampFurniture(
          {
            id,
            kind: entry.kind,
            name: entry.name,
            position: { x: center.x + nudge(), z: center.z + nudge() },
            rotationY: 0,
            size: { ...entry.size },
            elevation: entry.elevation,
            color: entry.color,
          },
          poly,
        );
        set({ design: touch({ ...d, furniture: [...d.furniture, item] }) });
        return id;
      },

      duplicateFurniture: (id) => {
        const d = get().design;
        const src = d.furniture.find((f) => f.id === id);
        if (!src) return null;
        const poly = floorPolygon(d.walls);
        const newId = nanoid(8);
        // Small random nudge so the copy doesn't land exactly on top of the original.
        const nudge = () => (Math.random() - 0.5) * 0.6;
        const copy: FurnitureItem = clampFurniture(
          {
            ...src,
            id: newId,
            size: { ...src.size },
            position: { x: src.position.x + nudge(), z: src.position.z + nudge() },
          },
          poly,
        );
        set({ design: touch({ ...d, furniture: [...d.furniture, copy] }) });
        return newId;
      },

      updateFurniture: (id, patch) => {
        const d = get().design;
        const poly = floorPolygon(d.walls);
        set({
          design: touch({
            ...d,
            furniture: d.furniture.map((f) => {
              if (f.id !== id) return f;
              const next: FurnitureItem = {
                ...f,
                ...patch,
                size: { ...f.size, ...patch.size },
                position: { ...f.position, ...patch.position },
                elevation: Math.max(0, patch.elevation ?? f.elevation),
              };
              return clampFurniture(next, poly);
            }),
          }),
        });
      },

      moveFurniture: (id, x, z) => {
        const d = get().design;
        const poly = floorPolygon(d.walls);
        set({
          design: touch({
            ...d,
            furniture: d.furniture.map((f) => {
              if (f.id !== id) return f;
              const target = clampToPolygon({ x, z }, poly);
              // Already stuck in a wall (older design, rotation near a wall)?
              // Fall back to free center clamping so the piece can be freed.
              if (!furnitureFits(f, poly, d.walls)) return { ...f, position: target };
              return { ...f, position: slideFurniture(f, target, poly, d.walls) };
            }),
          }),
        });
      },

      removeFurniture: (id) => {
        const d = get().design;
        set({ design: touch({ ...d, furniture: d.furniture.filter((f) => f.id !== id) }) });
      },

      setFurniture: (items) => {
        const d = get().design;
        const poly = floorPolygon(d.walls);
        const furniture = items.map((it) => clampFurniture({ ...it, id: nanoid(8) }, poly));
        set({ design: touch({ ...d, furniture }) });
      },

      addProposal: ({ name, copyCurrent }) => {
        // Snapshot the current furnishing into its proposal before adding a sibling.
        const d = syncActiveProposal(get().design);
        const id = nanoid(8);
        const furniture = copyCurrent ? cloneFurniture(d.furniture) : [];
        // A new variant starts from the current palette; the user tweaks it after.
        const { floorColor, wallColor } = d;
        const proposal: Proposal = {
          id,
          name: name?.trim() || nextProposalName(d.proposals),
          furniture,
          floorColor,
          wallColor,
        };
        set({
          design: touch({
            ...d,
            proposals: [...d.proposals, proposal],
            activeProposalId: id,
            furniture,
            floorColor,
            wallColor,
          }),
        });
        return id;
      },

      addProposalFromFurniture: (name, items, colors) => {
        const d = syncActiveProposal(get().design);
        const poly = floorPolygon(d.walls);
        const furniture = items.map((it) => clampFurniture({ ...it, id: nanoid(8) }, poly));
        const id = nanoid(8);
        const floorColor = colors?.floorColor ?? d.floorColor;
        const wallColor = colors?.wallColor ?? d.wallColor;
        const proposal: Proposal = {
          id,
          name: name.trim() || nextProposalName(d.proposals),
          furniture,
          floorColor,
          wallColor,
        };
        set({
          design: touch({
            ...d,
            proposals: [...d.proposals, proposal],
            activeProposalId: id,
            furniture,
            floorColor,
            wallColor,
          }),
        });
        return id;
      },

      setActiveProposal: (id) => {
        const current = get().design;
        if (id === current.activeProposalId) return;
        // Persist the on-screen furnishing before swapping in the target's.
        const d = syncActiveProposal(current);
        const target = d.proposals.find((p) => p.id === id);
        if (!target) return;
        const poly = floorPolygon(d.walls);
        set({
          design: touch({
            ...d,
            activeProposalId: id,
            furniture: target.furniture.map((f) => clampFurniture(f, poly)),
            floorColor: target.floorColor,
            wallColor: target.wallColor,
          }),
        });
      },

      renameProposal: (id, name) => {
        const d = get().design;
        const trimmed = name.trim() || nextProposalName(d.proposals.filter((p) => p.id !== id));
        set({
          design: touch({
            ...d,
            proposals: d.proposals.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
          }),
        });
      },

      removeProposal: (id) => {
        const current = get().design;
        if (current.proposals.length <= 1) return; // keep at least one proposal per room
        const d = syncActiveProposal(current);
        const idx = d.proposals.findIndex((p) => p.id === id);
        if (idx === -1) return;
        const proposals = d.proposals.filter((p) => p.id !== id);
        if (id !== d.activeProposalId) {
          set({ design: touch({ ...d, proposals }) });
          return;
        }
        // Removing the active one: fall back to the previous proposal in the list.
        const nextActive = proposals[Math.max(0, idx - 1)];
        const poly = floorPolygon(d.walls);
        set({
          design: touch({
            ...d,
            proposals,
            activeProposalId: nextActive.id,
            furniture: nextActive.furniture.map((f) => clampFurniture(f, poly)),
            floorColor: nextActive.floorColor,
            wallColor: nextActive.wallColor,
          }),
        });
      },

      loadProject: (loaded) => {
        // Defensive re-clamping and normalization, e.g. after importing an edited file.
        const normalized = normalizeProject(loaded);
        const rooms = normalized.rooms.map((r) => {
          const poly = floorPolygon(r.walls);
          return {
            ...r,
            openings: r.openings.map((o) => clampOpeningIn(r, o)),
            furniture: r.furniture.map((f) => clampFurniture(f, poly)),
            proposals: r.proposals.map((p) => ({
              ...p,
              furniture: p.furniture.map((f) => clampFurniture(f, poly)),
            })),
          };
        });
        const project = { ...normalized, rooms };
        set({ project, design: activeRoom(project) });
      },

      newProject: () => {
        const project = createDefaultProject();
        set({ project, design: activeRoom(project) });
      },
    }),
    {
      name: 'roomcraft:current',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Only the project is persisted; the live `design` is rebuilt from it as
      // the active room on rehydrate (see merge). The active room is synced back
      // into the project first so the stored snapshot matches the screen.
      partialize: (s) => ({ project: syncActiveRoom(s.project, syncActiveProposal(s.design)) }),
      // Older blobs (a single design, zustand versions < 4) are routed through
      // the same zod+migration path as import; broken data falls back to the
      // default instead of crashing.
      migrate: (persisted) => {
        const raw = persisted as { project?: unknown; design?: unknown } | undefined;
        const source = raw?.project ?? raw?.design;
        return { project: parseProjectSafe(source) ?? createDefaultProject() };
      },
      // `design` isn't persisted, so reconstruct it from the (re-validated)
      // project as the active room on every rehydrate.
      merge: (persisted, current) => {
        const raw = (persisted as { project?: unknown } | undefined)?.project;
        const project = parseProjectSafe(raw) ?? current.project;
        return { ...current, project, design: activeRoom(project) };
      },
    },
  ),
);
