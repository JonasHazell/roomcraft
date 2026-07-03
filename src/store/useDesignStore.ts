import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Design, FurnitureItem, FurnitureKind, Room, WallOpening } from '../types';
import { SCHEMA_VERSION } from '../types';
import { clampFurniture, clampOpening, clampToRoom } from '../lib/geometry';
import { FURNITURE_CATALOG } from '../lib/furnitureCatalog';

export type FurniturePatch = Partial<Omit<FurnitureItem, 'id' | 'size' | 'position'>> & {
  size?: Partial<FurnitureItem['size']>;
  position?: Partial<FurnitureItem['position']>;
};

export function createDefaultDesign(): Design {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: 'Mitt rum',
    updatedAt: new Date().toISOString(),
    room: {
      width: 4,
      length: 5,
      height: 2.5,
      floorColor: '#c9a878',
      wallColor: '#efe8da',
    },
    openings: [
      {
        id: nanoid(8),
        kind: 'door',
        wall: 'south',
        offset: 0.7,
        width: 0.9,
        height: 2.1,
        elevation: 0,
      },
      {
        id: nanoid(8),
        kind: 'window',
        wall: 'north',
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
  addOpening: (o: Omit<WallOpening, 'id'>) => void;
  updateOpening: (id: string, patch: Partial<Omit<WallOpening, 'id'>>) => void;
  removeOpening: (id: string) => void;
  addFurniture: (kind: FurnitureKind) => string;
  updateFurniture: (id: string, patch: FurniturePatch) => void;
  moveFurniture: (id: string, x: number, z: number) => void;
  removeFurniture: (id: string) => void;
  loadDesign: (d: Design) => void;
  newDesign: () => void;
}

function touch(design: Design): Design {
  return { ...design, updatedAt: new Date().toISOString() };
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => ({
      design: createDefaultDesign(),

      setName: (name) => set({ design: touch({ ...get().design, name }) }),

      setRoom: (patch) => {
        const d = get().design;
        const room = { ...d.room, ...patch };
        // Om-klampa allt så att ett krympt rum aldrig lämnar något utanför.
        set({
          design: touch({
            ...d,
            room,
            openings: d.openings.map((o) => clampOpening(o, room)),
            furniture: d.furniture.map((f) => clampFurniture(f, room)),
          }),
        });
      },

      addOpening: (o) => {
        const d = get().design;
        const opening = clampOpening({ ...o, id: nanoid(8) }, d.room);
        set({ design: touch({ ...d, openings: [...d.openings, opening] }) });
      },

      updateOpening: (id, patch) => {
        const d = get().design;
        set({
          design: touch({
            ...d,
            openings: d.openings.map((o) =>
              o.id === id ? clampOpening({ ...o, ...patch }, d.room) : o,
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
        const entry = FURNITURE_CATALOG[kind];
        const id = nanoid(8);
        // Liten slumpad nudge så att flera nyskapade möbler inte döljer varandra helt.
        const nudge = () => (Math.random() - 0.5) * 0.6;
        const item: FurnitureItem = clampFurniture(
          {
            id,
            kind,
            name: entry.label,
            position: { x: nudge(), z: nudge() },
            rotationY: 0,
            size: { ...entry.defaultSize },
            color: entry.defaultColor,
          },
          d.room,
        );
        set({ design: touch({ ...d, furniture: [...d.furniture, item] }) });
        return id;
      },

      updateFurniture: (id, patch) => {
        const d = get().design;
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
              };
              return clampFurniture(next, d.room);
            }),
          }),
        });
      },

      moveFurniture: (id, x, z) => {
        const d = get().design;
        set({
          design: touch({
            ...d,
            furniture: d.furniture.map((f) =>
              f.id === id ? { ...f, position: clampToRoom(x, z, f, d.room) } : f,
            ),
          }),
        });
      },

      removeFurniture: (id) => {
        const d = get().design;
        set({ design: touch({ ...d, furniture: d.furniture.filter((f) => f.id !== id) }) });
      },

      loadDesign: (loaded) => {
        // Defensiv om-klampning, t.ex. efter import av redigerad fil.
        const design: Design = {
          ...loaded,
          openings: loaded.openings.map((o) => clampOpening(o, loaded.room)),
          furniture: loaded.furniture.map((f) => clampFurniture(f, loaded.room)),
        };
        set({ design });
      },

      newDesign: () => set({ design: createDefaultDesign() }),
    }),
    {
      name: 'room-sketcher:current',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ design: s.design }),
    },
  ),
);
