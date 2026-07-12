import { nanoid } from 'nanoid';
import type { Design, FurnitureItem, Point } from '../../types';
import {
  clampFurniture,
  furnitureCorners,
  furnitureFits,
  slideFurniture,
} from '../../lib/collision';
import { clampToPolygon, floorPolygon } from '../../lib/polygon';
import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';
import { defaultOptions, normalizeOptions } from '../../lib/furnitureOptions';
import { defaultMaterials, normalizeColors, normalizeMaterials } from '../../lib/furnitureParts';
import {
  placeAtCenter,
  touch,
  type DesignGet,
  type DesignSet,
  type FurnitureActions,
} from '../designModel';

/**
 * The footprints a dragged piece must slide around: every other piece except
 * rugs. Rugs lie flat on the floor and are meant to have furniture stand on them,
 * so they never take part in furniture-to-furniture collision — a dragged rug
 * gets an empty obstacle list, and rugs are skipped as obstacles for others.
 */
function collisionObstacles(d: Design, movingId: string): Point[][] {
  const moving = d.furniture.find((f) => f.id === movingId);
  if (moving?.kind === 'rug') return [];
  return d.furniture
    .filter((f) => f.id !== movingId && f.kind !== 'rug')
    .map((f) => furnitureCorners(f, 0));
}

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
        materials: defaultMaterials(kind),
        options: defaultOptions(kind),
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
        colors: normalizeColors(entry.kind, entry.colors),
        material: entry.material,
        materials: normalizeMaterials(entry.kind, entry.materials, entry.material),
        options: normalizeOptions(entry.kind, entry.options),
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
          colors: src.colors ? { ...src.colors } : undefined,
          materials: src.materials ? { ...src.materials } : undefined,
          options: src.options ? { ...src.options } : undefined,
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
              // Merge option changes onto a fully-defaulted set so a single edited
              // key never drops the piece's other options.
              options: patch.options
                ? { ...normalizeOptions(f.kind, f.options), ...patch.options }
                : f.options,
              // Same for per-part materials: merge onto a fully-resolved map so a
              // single edited part never drops the piece's other parts.
              materials: patch.materials
                ? { ...normalizeMaterials(f.kind, f.materials, f.material), ...patch.materials }
                : f.materials,
              // Per-part colour overrides merge onto the existing sparse map.
              colors: patch.colors ? { ...f.colors, ...patch.colors } : f.colors,
            };
            return clampFurniture(next, poly);
          }),
        }),
      });
    },

    moveFurniture: (id, x, z) => {
      const d = get().design;
      const poly = floorPolygon(d.walls);
      const obstacles = collisionObstacles(d, id);
      set({
        design: touch({
          ...d,
          furniture: d.furniture.map((f) => {
            if (f.id !== id) return f;
            const target = clampToPolygon({ x, z }, poly);
            // Already stuck in a wall (older design, rotation near a wall)?
            // Fall back to free center clamping so the piece can be freed.
            if (!furnitureFits(f, poly, d.walls)) return { ...f, position: target };
            // Already overlapping another piece (a resize, an AI layout, an older
            // save)? Slide with walls only so it can be dragged clear instead of
            // being frozen in place; once free, obstacle collision kicks back in.
            if (!furnitureFits(f, poly, d.walls, obstacles)) {
              return { ...f, position: slideFurniture(f, target, poly, d.walls) };
            }
            return { ...f, position: slideFurniture(f, target, poly, d.walls, obstacles) };
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
