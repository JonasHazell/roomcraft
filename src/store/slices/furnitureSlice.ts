import { nanoid } from 'nanoid';
import type { FurnitureItem } from '../../types';
import { autoArrange } from '../../lib/autoArrange';
import { runValidation } from '../../lib/validation/engine';
import {
  clampFurniture,
  findClearSpot,
  furnitureFits,
  furnitureObstacles,
  slideFurniture,
} from '../../lib/collision';
import { clampToPolygon, floorPolygon, polygonCenter } from '../../lib/polygon';
import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';
import { defaultOptions, normalizeOptions } from '../../lib/furnitureOptions';
import {
  defaultMaterials,
  mergeColorOverrides,
  normalizeColors,
  normalizeMaterials,
} from '../../lib/furnitureParts';
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
        product: entry.product ? { ...entry.product } : undefined,
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
      const candidate = { x: src.position.x + nudge(), z: src.position.z + nudge() };
      // Steer the copy clear of every piece already in the room — including the
      // original — instead of letting it spawn embedded in it. If the room is too
      // full to find a fully clear spot nearby, findClearSpot itself falls back to
      // the least-overlapping candidate it tried, never silently to the jittered
      // spot that's known to overlap. The copy (newId) isn't in d.furniture yet, so
      // nothing needs excluding by id.
      const obstacles = furnitureObstacles(d.furniture, src.kind);
      const position = findClearSpot(src, candidate, poly, d.walls, obstacles);
      const copy: FurnitureItem = clampFurniture(
        {
          ...src,
          id: newId,
          size: { ...src.size },
          position,
          colors: src.colors ? { ...src.colors } : undefined,
          materials: src.materials ? { ...src.materials } : undefined,
          options: src.options ? { ...src.options } : undefined,
          product: src.product ? { ...src.product } : undefined,
        },
        poly,
        d.room.height,
      );
      set({ design: touch({ ...d, furniture: [...d.furniture, copy] }) });
      return newId;
    },

    updateFurniture: (id, patch) => {
      const d = get().design;
      const poly = floorPolygon(d.walls);
      // A resize or rotation changes the footprint just like a drag-move changes
      // the position — only those patches need the collision pass below. Leaving
      // it gated on this keeps unrelated edits (colour, material, options) from
      // ever nudging the piece.
      const changesFootprint =
        patch.size !== undefined || patch.rotationY !== undefined || patch.position !== undefined;
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
              // Per-part colour overrides merge onto the existing sparse map; a
              // key set to `undefined` clears that part's override instead of
              // writing it, so it resumes following the primary colour.
              colors: patch.colors ? mergeColorOverrides(f.colors, patch.colors) : f.colors,
            };
            const clamped = clampFurniture(next, poly, d.room.height);
            if (!changesFootprint) return clamped;
            // Give resize/rotate the same wall/obstacle collision guarantee as
            // moveFurniture.
            const obstacles = furnitureObstacles(d.furniture, clamped.kind, id);
            if (furnitureFits(clamped, poly, d.walls, obstacles)) return clamped;
            // Already stuck in a wall before this edit (older design, rotation
            // near a wall)? Fall back to the free floor-polygon clamp already
            // computed above, same as moveFurniture, so a broken legacy piece
            // stays freely editable.
            if (!furnitureFits(f, poly, d.walls)) return clamped;
            // Unlike a drag, an in-place resize/rotation has no drag target to
            // slide toward — slideFurniture needs a point it already fits at to
            // walk *from* (it only detects crossing a boundary on the way to the
            // target, it can't escape a start that's already invalid). Anchor
            // the search at the room's centre — reliably clear for anything but
            // an oversized piece — and slide the new footprint from there toward
            // the position the edit actually wants, stopping as soon as it's
            // clear; run the same binary search slideFurniture does for a drag,
            // just in reverse.
            const anchored = { ...clamped, position: polygonCenter(poly) };
            // Already overlapping another piece before this edit (an older save,
            // an AI layout)? Slide with walls only, same as moveFurniture's
            // fallback, so the edit doesn't get frozen by a pre-existing overlap.
            if (!furnitureFits(f, poly, d.walls, obstacles)) {
              return {
                ...clamped,
                position: slideFurniture(anchored, clamped.position, poly, d.walls),
              };
            }
            const slid = slideFurniture(anchored, clamped.position, poly, d.walls, obstacles);
            if (furnitureFits({ ...clamped, position: slid }, poly, d.walls, obstacles)) {
              return { ...clamped, position: slid };
            }
            // Rare fallback (e.g. the piece already sat exactly at the room's
            // centre, so there was no path to search along) — the same
            // nearby-clear-spot search placement already uses.
            return {
              ...clamped,
              position: findClearSpot({ ...clamped, position: slid }, slid, poly, d.walls, obstacles),
            };
          }),
        }),
      });
    },

    moveFurniture: (id, x, z) => {
      const d = get().design;
      const poly = floorPolygon(d.walls);
      const moving = d.furniture.find((f) => f.id === id);
      const obstacles = moving ? furnitureObstacles(d.furniture, moving.kind, id) : [];
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

    autoArrange: () => {
      const d = get().design;
      const before = runValidation(d).total ?? 0;
      const furniture = autoArrange(d);
      // The optimiser returns the original array by reference when it can't beat
      // the current layout — skip the write (and the undo entry) in that case.
      if (furniture === d.furniture) return null;
      set({ design: touch({ ...d, furniture }) });
      const after = runValidation({ ...d, furniture }).total ?? 0;
      return { before, after };
    },
  };
}
