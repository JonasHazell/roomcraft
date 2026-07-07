import { nanoid } from 'nanoid';
import type { FurnitureItem } from '../../types';
import { clampFurniture, furnitureFits, slideFurniture } from '../../lib/collision';
import { clampToPolygon, floorPolygon } from '../../lib/polygon';
import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';
import {
  placeAtCenter,
  touch,
  type DesignGet,
  type DesignSet,
  type FurnitureActions,
} from '../designModel';

/** Furniture actions on the active proposal: add, duplicate, move, edit and remove pieces. */
export function createFurnitureSlice(set: DesignSet, get: DesignGet): FurnitureActions {
  return {
    addFurniture: (kind) => {
      const d = get().design;
      const entry = FURNITURE_CATALOG[kind];
      const item = placeAtCenter(d, {
        kind,
        name: entry.label,
        size: entry.defaultSize,
        elevation: 0,
        color: entry.defaultColor,
      });
      set({ design: touch({ ...d, furniture: [...d.furniture, item] }) });
      return item.id;
    },

    addFurnitureConfigured: (config) => {
      const d = get().design;
      const item = placeAtCenter(d, config);
      set({ design: touch({ ...d, furniture: [...d.furniture, item] }) });
      return item.id;
    },

    addFurnitureFromLibrary: (entry) => {
      const d = get().design;
      const item = placeAtCenter(d, {
        kind: entry.kind,
        name: entry.name,
        size: entry.size,
        elevation: entry.elevation,
        color: entry.color,
      });
      set({ design: touch({ ...d, furniture: [...d.furniture, item] }) });
      return item.id;
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
  };
}
