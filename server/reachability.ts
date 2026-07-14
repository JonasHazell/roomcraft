import type { Design, Point } from '../src/types.ts';
import { FURNITURE_CATALOG } from '../src/lib/furnitureCatalog.ts';
import { floorPolygon, pointInPolygon, polygonBounds } from '../src/lib/polygon.ts';
import { accessZone, convexOverlap, doorClearanceZones, footprint, interiorWallQuad } from './geom.ts';
import type { ResolvedFurniture } from './schema.ts';

/** Cell size for the reachability grid, meters. */
const CELL = 0.1;

/**
 * Furniture allowed to overlap without being flagged:
 * rugs may lie under anything, and chairs may be pushed in under tables, desks
 * and boxes (work surfaces).
 */
function overlapAllowed(a: ResolvedFurniture, b: ResolvedFurniture): boolean {
  if (a.kind === 'rug' || b.kind === 'rug') return true;
  const kinds = [a.kind, b.kind];
  if (
    kinds.includes('chair') &&
    (kinds.includes('table') || kinds.includes('desk') || kinds.includes('box'))
  )
    return true;
  return false;
}

/** Errors for furniture items that overlap each other (beyond the allowed exceptions). */
export function overlapErrors(furniture: ResolvedFurniture[], title: string): string[] {
  const errors: string[] = [];
  for (let i = 0; i < furniture.length; i++) {
    for (let j = i + 1; j < furniture.length; j++) {
      const a = furniture[i];
      const b = furniture[j];
      if (overlapAllowed(a, b)) continue;
      if (convexOverlap(footprint(a, 0.03), footprint(b, 0.03))) {
        errors.push(
          `Proposal "${title}": "${a.name}" and "${b.name}" overlap each other.`,
        );
      }
    }
  }
  return errors;
}

/**
 * Errors for furniture whose access zone cannot be reached on foot from a door.
 * Rasterizes the floor, blocks cells under solid furniture and interior walls, and
 * flood-fills the free floor from the door clearance zones. A daily-use item is OK
 * if any cell in its access zone is reached by the flood.
 */
export function reachabilityErrors(
  furniture: ResolvedFurniture[],
  design: Design,
  title: string,
): string[] {
  const floor = floorPolygon(design.walls);
  const zones = doorClearanceZones(design);
  if (zones.length === 0) return []; // No door to enter through — skip.

  const b = polygonBounds(floor);
  const cols = Math.max(1, Math.ceil((b.maxX - b.minX) / CELL));
  const rows = Math.max(1, Math.ceil((b.maxZ - b.minZ) / CELL));
  const center = (c: number, r: number): Point => ({
    x: b.minX + (c + 0.5) * CELL,
    z: b.minZ + (r + 0.5) * CELL,
  });

  const blockers = [
    ...furniture.filter((f) => FURNITURE_CATALOG[f.kind].blocks).map((f) => footprint(f, -0.01)),
    ...design.walls.filter((w) => w.kind === 'interior').map(interiorWallQuad),
  ];

  const idx = (c: number, r: number) => r * cols + c;
  const free = new Uint8Array(cols * rows);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const p = center(c, r);
      if (!pointInPolygon(p, floor)) continue;
      if (blockers.some((q) => pointInPolygon(p, q))) continue;
      free[idx(c, r)] = 1;
    }
  }

  // The flood starts in every free cell inside a door clearance zone.
  const reached = new Uint8Array(cols * rows);
  const queue: number[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (!free[idx(c, r)] || reached[idx(c, r)]) continue;
      const p = center(c, r);
      if (zones.some((z) => pointInPolygon(p, z.quad))) {
        reached[idx(c, r)] = 1;
        queue.push(idx(c, r));
      }
    }
  }
  if (queue.length === 0) return []; // Door swing blocked — flagged separately in validate.

  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    const c = cell % cols;
    const r = (cell - c) / cols;
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const ni = idx(nc, nr);
      if (free[ni] && !reached[ni]) {
        reached[ni] = 1;
        queue.push(ni);
      }
    }
  }

  const errors: string[] = [];
  for (const f of furniture) {
    const zone = accessZone(f);
    if (!zone) continue;
    let ok = false;
    for (let c = 0; c < cols && !ok; c++) {
      for (let r = 0; r < rows && !ok; r++) {
        if (reached[idx(c, r)] && pointInPolygon(center(c, r), zone)) ok = true;
      }
    }
    if (!ok) {
      errors.push(
        `Proposal "${title}": "${f.name}" cannot be reached — in front of it there is no ` +
          `${FURNITURE_CATALOG[f.kind].accessDepth} m of free space with a walking path from a door ` +
          `(it is trapped behind other furniture or walls).`,
      );
    }
  }
  return errors;
}
