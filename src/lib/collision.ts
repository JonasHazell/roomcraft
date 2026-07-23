import type { FurnitureItem, FurnitureKind, Point, Wall, WallOpening } from '../types';
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

/**
 * Floor for a furniture piece's own elevation/height clamp below, meters — kept at
 * the smallest catalog default (the rug, 2cm) so an already-valid thin piece is
 * never forced taller just to satisfy this clamp.
 */
const MIN_FURNITURE_HEIGHT = 0.02;

/**
 * Clamps a furniture piece's center to the floor polygon (deliberately center-based)
 * and its elevation/height so its top never exceeds `roomHeight` — the same
 * ceiling guarantee {@link clampOpening} already gives doors/windows, given here to
 * furniture too (see #422).
 */
export function clampFurniture(
  item: FurnitureItem,
  floorPoly: Point[],
  roomHeight: number,
): FurnitureItem {
  const p = clampToPolygon(item.position, floorPoly);
  const elevation = clamp(item.elevation, 0, Math.max(0, roomHeight - MIN_FURNITURE_HEIGHT));
  const height = clamp(
    item.size.height,
    MIN_FURNITURE_HEIGHT,
    Math.max(MIN_FURNITURE_HEIGHT, roomHeight - elevation),
  );
  if (p === item.position && elevation === item.elevation && height === item.size.height) return item;
  return { ...item, position: p, elevation, size: { ...item.size, height } };
}

/**
 * The footprints a piece with the given kind must avoid overlapping: every other
 * piece in `furniture` except rugs, and except `excludeId` itself (the piece being
 * moved/placed, if it is already in the list). Rugs lie flat on the floor and are
 * meant to have furniture stand on them, so they never take part in
 * furniture-to-furniture collision — a rug being placed/moved gets no obstacles,
 * and rugs are skipped as obstacles for everyone else. Shared by placement
 * (`placeAtCenter`, `duplicateFurniture`) and drag-time sliding so both use the
 * same notion of "other furniture in the way".
 */
export function furnitureObstacles(
  furniture: FurnitureItem[],
  kind: FurnitureKind,
  excludeId?: string,
): Point[][] {
  if (kind === 'rug') return [];
  return furniture
    .filter((f) => f.id !== excludeId && f.kind !== 'rug')
    .map((f) => furnitureCorners(f, 0));
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

/** Ring radii (m) and angle steps tried by {@link findClearSpot}, outward from `from`. */
const CLEAR_SPOT_MAX_RADIUS = 3;
const CLEAR_SPOT_RADIUS_STEP = 0.3;
const CLEAR_SPOT_ANGLE_STEPS = 12;

/**
 * Finds a spot near `from` where `item` fits without overlapping `obstacles` or a
 * wall — used when placing a new or duplicated piece so it doesn't spawn embedded
 * in furniture already in the room. `from` is tried first (so a caller's small
 * random jitter is kept when it already clears); if that overlaps, candidates are
 * tried in rings of growing radius around `from` until a clear one is found. Falls
 * back to `from` itself if the room is too full to find a clear spot nearby —
 * callers still clamp/nudge as before, so this only ever improves on that.
 */
export function findClearSpot(
  item: Footprint,
  from: Point,
  floorPoly: Point[],
  walls: Wall[],
  obstacles: Point[][],
): Point {
  if (obstacles.length === 0) return from;
  if (furnitureFits({ ...item, position: from }, floorPoly, walls, obstacles)) return from;
  for (let radius = CLEAR_SPOT_RADIUS_STEP; radius <= CLEAR_SPOT_MAX_RADIUS; radius += CLEAR_SPOT_RADIUS_STEP) {
    for (let i = 0; i < CLEAR_SPOT_ANGLE_STEPS; i++) {
      const angle = (i / CLEAR_SPOT_ANGLE_STEPS) * Math.PI * 2;
      const p = { x: from.x + Math.cos(angle) * radius, z: from.z + Math.sin(angle) * radius };
      if (furnitureFits({ ...item, position: p }, floorPoly, walls, obstacles)) return p;
    }
  }
  return from;
}

/** Tolerance for opening-span overlap checks, in meters (avoids float-noise false positives). */
const OPENING_OVERLAP_EPS = 1e-6;

function opensOverlap(aOffset: number, aWidth: number, bOffset: number, bWidth: number): boolean {
  return aOffset < bOffset + bWidth - OPENING_OVERLAP_EPS && bOffset < aOffset + aWidth - OPENING_OVERLAP_EPS;
}

/**
 * The first clear offset (searching from the wall's start) where a `width`-wide
 * span doesn't overlap any sibling opening already on the same wall, within the
 * wall's own [0, len - width] bounds. A clear span can only *begin* at the wall's
 * start or immediately after a sibling ends, so those are the only candidates
 * worth checking (a standard interval-scheduling free-slot search) — cheap even
 * with several openings on one wall. Falls back to the bounds-clamped `preferred`
 * offset if the wall genuinely has no clear span left for it; flagging that
 * remaining overlap is validation's job, not placement's.
 */
function firstClearOffset(
  preferred: number,
  width: number,
  len: number,
  siblings: Pick<WallOpening, 'offset' | 'width'>[],
): number {
  const max = len - width;
  const clamped = clamp(preferred, 0, max);
  if (siblings.length === 0) return clamped;
  const clashes = (candidate: number) =>
    siblings.some((s) => opensOverlap(candidate, width, s.offset, s.width));
  if (!clashes(clamped)) return clamped;
  const candidates = [0, ...siblings.map((s) => s.offset + s.width)]
    .map((c) => clamp(c, 0, max))
    .sort((a, b) => a - b);
  for (const c of candidates) {
    if (!clashes(c)) return c;
  }
  return clamped; // no clear span anywhere on the wall — leave it, best effort
}

/**
 * Clamps an opening to its wall's bounds and, when siblings are given, nudges it
 * to the first clear span on the wall that doesn't overlap any of them — the
 * placement backstop for both a freshly-added opening (see `defaultOpening`) and
 * any add/resize/move that could otherwise land two openings on top of each other.
 */
export function clampOpening(
  o: WallOpening,
  wall: Wall,
  roomHeight: number,
  siblings: Pick<WallOpening, 'offset' | 'width'>[] = [],
): WallOpening {
  const len = wallLen(wall);
  const width = clamp(o.width, 0.1, len);
  const offset = firstClearOffset(o.offset, width, len, siblings);
  const elevation = o.kind === 'door' ? 0 : clamp(o.elevation, 0, roomHeight - 0.2);
  const height = clamp(o.height, 0.1, roomHeight - elevation);
  return { ...o, width, offset, elevation, height };
}
