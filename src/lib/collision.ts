import type { FurnitureItem, Point, Wall, WallOpening } from '../types';
import {
  clamp,
  clampToPolygon,
  convexOverlap,
  interiorWallQuad,
  pointInPolygon,
  rectCorners,
  segmentsIntersect,
  wallLen,
} from './polygon.ts';

/**
 * Pure 2D footprint/collision geometry used by furniture dragging and the
 * validation rules. Deliberately free of any three.js dependency so the
 * validation engine (and, in principle, a web worker) can import it without
 * pulling in the 3D renderer — the three.js mesh building lives in geometry.ts.
 */

type Footprint = Pick<FurnitureItem, 'position' | 'rotationY' | 'size'>;

/** Shrinks the footprint so that flush against a wall does not count as a collision. */
const FIT_SHRINK = 0.015;

/** The footprint's four corners in the world (same rotation convention as three.js). */
export function furnitureCorners(item: Footprint, shrink = FIT_SHRINK): Point[] {
  const hw = Math.max(item.size.width / 2 - shrink, 0.005);
  const hd = Math.max(item.size.depth / 2 - shrink, 0.005);
  return rectCorners(item.position, hw, hd, item.rotationY);
}

function quadsOverlap(a: Point[], b: Point[]): boolean {
  if (a.some((p) => pointInPolygon(p, b)) || b.some((p) => pointInPolygon(p, a))) return true;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (segmentsIntersect(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) {
        return true;
      }
    }
  }
  return false;
}

/** Clamps a furniture piece's center to the floor polygon (deliberately center-based). */
export function clampFurniture(item: FurnitureItem, floorPoly: Point[]): FurnitureItem {
  const p = clampToPolygon(item.position, floorPoly);
  if (p === item.position) return item;
  return { ...item, position: p };
}

/**
 * True if the whole footprint lies in the floor polygon without crossing any wall
 * or any of the `obstacles` (other pieces' footprints). Corner-in-polygon alone is
 * not enough in e.g. L-shaped rooms (an edge can cut across a notch), so
 * edge-to-edge intersections are tested as well. The footprint is already shrunk
 * by {@link FIT_SHRINK}, so flush-against an obstacle is not counted as a hit.
 */
export function furnitureFits(
  item: Footprint,
  floorPoly: Point[],
  walls: Wall[],
  obstacles: Point[][] = [],
): boolean {
  const corners = furnitureCorners(item);
  if (!corners.every((c) => pointInPolygon(c, floorPoly))) return false;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    for (let j = 0; j < floorPoly.length; j++) {
      if (segmentsIntersect(a, b, floorPoly[j], floorPoly[(j + 1) % floorPoly.length])) {
        return false;
      }
    }
  }
  for (const w of walls) {
    if (w.kind === 'interior' && quadsOverlap(corners, interiorWallQuad(w))) return false;
  }
  // The shrunk footprint already tolerates touching, so test against the raw
  // obstacle quads with no extra epsilon.
  for (const obstacle of obstacles) {
    if (convexOverlap(corners, obstacle, 0)) return false;
  }
  return true;
}

/**
 * True if the furniture fits along the entire path from→to. The end point alone
 * is not enough — with fast pointer movements the target can end up on the other
 * side of a thin interior wall (tunneling). The 0.05 m step is smaller than the
 * wall thickness.
 */
function pathFits(
  item: Footprint,
  from: Point,
  to: Point,
  floorPoly: Point[],
  walls: Wall[],
  obstacles: Point[][],
): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.05));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const p = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t };
    if (!furnitureFits({ ...item, position: p }, floorPoly, walls, obstacles)) return false;
  }
  return true;
}

/**
 * Moves a furniture piece toward target as far as possible without colliding with
 * a wall or any `obstacles` (other pieces' footprints). Per axis (x first, then z)
 * the longest fitting stretch is found by binary search, giving natural sliding
 * along walls — and now along other furniture — while dragging.
 */
export function slideFurniture(
  item: Footprint,
  target: Point,
  floorPoly: Point[],
  walls: Wall[],
  obstacles: Point[][] = [],
): Point {
  const reachable = (from: Point, to: Point) =>
    pathFits(item, from, to, floorPoly, walls, obstacles);
  if (reachable(item.position, target)) return target;
  let cur = item.position;
  for (const axis of ['x', 'z'] as const) {
    const full = { ...cur, [axis]: target[axis] };
    if (reachable(cur, full)) {
      cur = full;
      continue;
    }
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      const p = { ...cur, [axis]: cur[axis] + (target[axis] - cur[axis]) * mid };
      if (reachable(cur, p)) lo = mid;
      else hi = mid;
    }
    cur = { ...cur, [axis]: cur[axis] + (target[axis] - cur[axis]) * lo };
  }
  return cur;
}

export function clampOpening(o: WallOpening, wall: Wall, roomHeight: number): WallOpening {
  const len = wallLen(wall);
  const width = clamp(o.width, 0.1, len);
  const offset = clamp(o.offset, 0, len - width);
  const elevation = o.kind === 'door' ? 0 : clamp(o.elevation, 0, roomHeight - 0.2);
  const height = clamp(o.height, 0.1, roomHeight - elevation);
  return { ...o, width, offset, elevation, height };
}
