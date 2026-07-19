import { nanoid } from 'nanoid';
import type { Design, Wall } from '../../types';
import { clampFurniture } from '../../lib/collision';
import {
  GRID,
  floorPolygon,
  isAxisParallel,
  normalizeWinding,
  slideWall,
  snap,
  validateExteriorLoop,
  wallDir,
  wallLen,
  wallsFromPolygon,
} from '../../lib/polygon';
import {
  clampOpeningIn,
  touch,
  wallById,
  type DesignGet,
  type DesignSet,
  type PlanActions,
} from '../designModel';

/**
 * Upper bound on a single wall's length, in metres — matches the Length field's
 * declared `max={3000}` (cm) in `PlanWallPanel.tsx`. `resizeWall` enforces this
 * itself (not just the field) since it's also the store-level entry point any
 * other caller (e.g. a future drag-resize path) would go through.
 */
const MAX_WALL_LEN = 30;

/** Applies a new wall set, re-clamping openings and furniture to the new shape. */
function commitWalls(set: DesignSet, d: Design, walls: Wall[]): void {
  const poly = floorPolygon(walls);
  const next = { ...d, walls };
  set({
    design: touch({
      ...next,
      openings: next.openings.map((o) => clampOpeningIn(next, o)),
      furniture: next.furniture.map((f) => clampFurniture(f, poly)),
    }),
  });
}

/** Floor-plan actions: the exterior outline, interior walls and openings. */
export function createPlanSlice(set: DesignSet, get: DesignGet): PlanActions {
  return {
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
      // The neighboring exterior walls follow at their endpoints so the loop stays closed.
      const walls = slideWall(d.walls, wall, coord);
      if (wall.kind === 'exterior') {
        const check = validateExteriorLoop(walls.filter((w) => w.kind === 'exterior'));
        if (!check.ok) return; // reject drags that break the outline
      }
      commitWalls(set, d, walls);
    },

    moveCorner: (wallAId, wallBId, x, z) => {
      const d = get().design;
      const wallA = wallById(d, wallAId);
      const wallB = wallById(d, wallBId);
      if (!wallA || !wallB || wallA.kind !== 'exterior' || wallB.kind !== 'exterior') return;
      // A corner is the meeting point of one horizontal and one vertical exterior
      // wall. Dragging it slides the horizontal wall to the new z and the vertical
      // wall to the new x — each perpendicular move keeps the loop rectilinear, and
      // together they land the shared corner at (x, z).
      const horizontal = wallA.a.z === wallA.b.z ? wallA : wallB;
      const vertical = wallA.a.z === wallA.b.z ? wallB : wallA;
      if (horizontal === vertical || vertical.a.x !== vertical.b.x) return;
      let walls = slideWall(d.walls, horizontal, snap(z));
      const nextVertical = walls.find((w) => w.id === vertical.id);
      if (!nextVertical) return;
      walls = slideWall(walls, nextVertical, snap(x));
      const check = validateExteriorLoop(walls.filter((w) => w.kind === 'exterior'));
      if (!check.ok) return; // reject drags that would break the outline
      commitWalls(set, d, walls);
    },

    resizeWall: (id, newLen) => {
      const d = get().design;
      const wall = wallById(d, id);
      if (!wall) return;
      const len = Math.min(MAX_WALL_LEN, Math.max(GRID, Math.round(newLen * 1000) / 1000));
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
      if (!wallById(d, o.wallId)) return null;
      const opening = clampOpeningIn(d, { ...o, id: nanoid(8) });
      set({ design: touch({ ...d, openings: [...d.openings, opening] }) });
      return opening.id;
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
  };
}
