import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  Design,
  FurnitureItem,
  FurnitureKind,
  FurnitureLibraryEntry,
  Point,
  Room,
  Wall,
  WallOpening,
} from '../types';
import { SCHEMA_VERSION } from '../types';
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
import { parseDesignSafe } from '../lib/persistence';
import { FURNITURE_CATALOG } from '../lib/furnitureCatalog';

export type FurniturePatch = Partial<Omit<FurnitureItem, 'id' | 'size' | 'position'>> & {
  size?: Partial<FurnitureItem['size']>;
  position?: Partial<FurnitureItem['position']>;
};

export function createDefaultDesign(): Design {
  // Samma 4×5 m-rum som tidigare versioner, uttryckt som ytterväggskedja.
  const north: Wall = { id: nanoid(8), kind: 'exterior', a: { x: -2, z: -2.5 }, b: { x: 2, z: -2.5 } };
  const east: Wall = { id: nanoid(8), kind: 'exterior', a: { x: 2, z: -2.5 }, b: { x: 2, z: 2.5 } };
  const south: Wall = { id: nanoid(8), kind: 'exterior', a: { x: 2, z: 2.5 }, b: { x: -2, z: 2.5 } };
  const west: Wall = { id: nanoid(8), kind: 'exterior', a: { x: -2, z: 2.5 }, b: { x: -2, z: -2.5 } };
  return {
    schemaVersion: SCHEMA_VERSION,
    name: 'Mitt rum',
    updatedAt: new Date().toISOString(),
    room: {
      height: 2.5,
      floorColor: '#c9a878',
      wallColor: '#efe8da',
    },
    walls: [north, east, south, west],
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

interface DesignState {
  design: Design;
  setName: (name: string) => void;
  setRoom: (patch: Partial<Room>) => void;
  commitExteriorPolygon: (points: Point[]) => LoopValidation;
  addInteriorWall: (a: Point, b: Point) => string | null;
  removeWall: (id: string) => void;
  moveWall: (id: string, coord: number) => void;
  resizeWall: (id: string, newLen: number) => void;
  addOpening: (o: Omit<WallOpening, 'id'>) => void;
  updateOpening: (id: string, patch: Partial<Omit<WallOpening, 'id'>>) => void;
  removeOpening: (id: string) => void;
  addFurniture: (kind: FurnitureKind) => string;
  /** Lägger en sparad biblioteksmöbel i rummets mitt och returnerar dess id. */
  addFurnitureFromLibrary: (entry: FurnitureLibraryEntry) => string;
  duplicateFurniture: (id: string) => string | null;
  updateFurniture: (id: string, patch: FurniturePatch) => void;
  moveFurniture: (id: string, x: number, z: number) => void;
  removeFurniture: (id: string) => void;
  /** Ersätter hela möbleringen (t.ex. när ett AI-förslag används). */
  setFurniture: (items: Omit<FurnitureItem, 'id'>[]) => void;
  loadDesign: (d: Design) => void;
  newDesign: () => void;
}

function touch(design: Design): Design {
  return { ...design, updatedAt: new Date().toISOString() };
}

function wallById(d: Design, id: string): Wall | undefined {
  return d.walls.find((w) => w.id === id);
}

/** Klampar en öppning mot sin vägg; öppningar utan vägg lämnas åt valideringen. */
function clampOpeningIn(d: Design, o: WallOpening): WallOpening {
  const wall = wallById(d, o.wallId);
  return wall ? clampOpening(o, wall, d.room.height) : o;
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => ({
      design: createDefaultDesign(),

      setName: (name) => set({ design: touch({ ...get().design, name }) }),

      setRoom: (patch) => {
        const d = get().design;
        const room = { ...d.room, ...patch };
        const next = { ...d, room };
        // Om-klampa öppningarna så att en sänkt takhöjd aldrig lämnar något utanför.
        set({
          design: touch({
            ...next,
            openings: next.openings.map((o) => clampOpeningIn(next, o)),
          }),
        });
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
        if (!wall || wall.kind !== 'interior') return; // ytterväggar ritas om som kontur
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
          // Grannväggarna följer med i sina ändpunkter så att slingan förblir sluten.
          walls = d.walls.map((w) => {
            if (w.id === id) return moved;
            if (w.kind !== 'exterior') return w;
            const b = w.b.x === wall.a.x && w.b.z === wall.a.z ? moved.a : w.b;
            const a = w.a.x === wall.b.x && w.a.z === wall.b.z ? moved.b : w.a;
            return a === w.a && b === w.b ? w : { ...w, a, b };
          });
          const check = validateExteriorLoop(walls.filter((w) => w.kind === 'exterior'));
          if (!check.ok) return; // avvisa drag som förstör konturen
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
          // Längden ändras i slutänden (b); starten och offset-nollan ligger fast.
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
        // Yttervägg: slutänden flyttas genom att nästa vägg i kedjan skjuts
        // vinkelrätt — exakt samma operation som att dra den väggen, så
        // slingvalidering och om-klampning återanvänds.
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
        // Liten slumpad nudge så att flera nyskapade möbler inte döljer varandra helt.
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

      addFurnitureFromLibrary: (entry) => {
        const d = get().design;
        const poly = floorPolygon(d.walls);
        const center = polygonCenter(poly);
        const id = nanoid(8);
        // Liten slumpad nudge så att flera tillagda möbler inte döljer varandra helt.
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
        // Liten slumpad nudge så att kopian inte hamnar exakt ovanpå originalet.
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
              // Redan fast i en vägg (äldre design, rotation nära vägg)?
              // Fall tillbaka till fri centrumklampning så att möbeln går att lossa.
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

      loadDesign: (loaded) => {
        // Defensiv om-klampning, t.ex. efter import av redigerad fil.
        const poly = floorPolygon(loaded.walls);
        const design: Design = {
          ...loaded,
          openings: loaded.openings.map((o) => clampOpeningIn(loaded, o)),
          furniture: loaded.furniture.map((f) => clampFurniture(f, poly)),
        };
        set({ design });
      },

      newDesign: () => set({ design: createDefaultDesign() }),
    }),
    {
      name: 'room-sketcher:current',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ design: s.design }),
      // Äldre blobbar (zustand-version 0) routas genom samma zod+migreringsväg
      // som import; trasig data faller tillbaka till default i stället för krasch.
      migrate: (persisted) => {
        const raw = (persisted as { design?: unknown } | undefined)?.design;
        return { design: parseDesignSafe(raw) ?? createDefaultDesign() };
      },
    },
  ),
);
