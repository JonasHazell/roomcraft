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

/** Clamps a furniture piece's center to the floor polygon (deliberately center-based). */
export function clampFurniture(item: FurnitureItem, floorPoly: Point[]): FurnitureItem {
  const p = clampToPolygon(item.position, floorPoly);
  if (p === item.position) return item;
  return { ...item, position: p };
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
 * Badness penalty for a corner that lands outside the floor polygon, in the same
 * units as {@link quadOverlapDepth}'s meter-scale overlap depth. Deliberately much
 * larger than any realistic furniture-overlap depth, so {@link findClearSpot}'s
 * fallback never prefers a spot that pokes outside the room over one that merely
 * overlaps furniture inside it.
 */
const OUT_OF_FLOOR_PENALTY = 10;

/**
 * Penetration depth (m) of two convex quads along the axis of least overlap (the
 * SAT minimum-translation-vector magnitude) — 0 if they don't overlap at all.
 * Same algorithm as {@link convexOverlap} in `polygon.ts`, but returns a continuous
 * "how overlapping" measure instead of a boolean, so a fallback spot can be ranked
 * against another instead of just pass/fail.
 */
function quadOverlapDepth(a: Point[], b: Point[]): number {
  let depth = Infinity;
  for (const quad of [a, b]) {
    for (let i = 0; i < quad.length; i++) {
      const p0 = quad[i];
      const p1 = quad[(i + 1) % quad.length];
      const len = Math.hypot(p1.x - p0.x, p1.z - p0.z) || 1;
      const axis = { x: -(p1.z - p0.z) / len, z: (p1.x - p0.x) / len };
      let minA = Infinity;
      let maxA = -Infinity;
      let minB = Infinity;
      let maxB = -Infinity;
      for (const p of a) {
        const d = p.x * axis.x + p.z * axis.z;
        minA = Math.min(minA, d);
        maxA = Math.max(maxA, d);
      }
      for (const p of b) {
        const d = p.x * axis.x + p.z * axis.z;
        minB = Math.min(minB, d);
        maxB = Math.max(maxB, d);
      }
      const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
      if (overlap <= 0) return 0; // a separating axis exists → no overlap
      depth = Math.min(depth, overlap);
    }
  }
  return depth;
}

/**
 * A continuous "how bad is this candidate" score for {@link findClearSpot}'s
 * fallback: the sum of how far outside the floor polygon the footprint's corners
 * land (weighted by {@link OUT_OF_FLOOR_PENALTY}) plus its overlap depth against
 * every interior wall and obstacle. Lower is better; 0 would mean it actually
 * fits (in which case `furnitureFits` already returns true and this is never
 * reached).
 */
function footprintBadness(
  item: Footprint,
  floorPoly: Point[],
  walls: Wall[],
  obstacles: Point[][],
): number {
  const corners = furnitureCorners(item);
  let badness = 0;
  for (const c of corners) {
    if (!pointInPolygon(c, floorPoly)) badness += OUT_OF_FLOOR_PENALTY;
  }
  for (const w of walls) {
    if (w.kind === 'interior') badness += quadOverlapDepth(corners, interiorWallQuad(w));
  }
  for (const obstacle of obstacles) {
    badness += quadOverlapDepth(corners, obstacle);
  }
  return badness;
}

/**
 * Finds a spot near `from` where `item` fits without overlapping `obstacles` or a
 * wall — used when placing a new or duplicated piece so it doesn't spawn embedded
 * in furniture already in the room. `from` is tried first (so a caller's small
 * random jitter is kept when it already clears); if that overlaps, candidates are
 * tried in rings of growing radius around `from` until a clear one is found.
 *
 * If the whole ring search exhausts its radius without finding a fully-clear
 * spot, this does **not** silently accept `from` (which, by construction, already
 * failed the `furnitureFits` check above) — every candidate tried during the
 * search is scored by {@link footprintBadness} (overlap depth against walls/
 * obstacles, plus a heavy penalty for landing outside the floor), and the least-
 * bad one seen is returned instead. `from` is only returned unchanged when no
 * tried candidate actually scores better than it — e.g. a single obstacle that
 * blankets the entire room, where every reachable point is equally overlapped —
 * so the result is never worse than doing nothing, and is usually better.
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

  let best = from;
  let bestBadness = footprintBadness({ ...item, position: from }, floorPoly, walls, obstacles);

  for (let radius = CLEAR_SPOT_RADIUS_STEP; radius <= CLEAR_SPOT_MAX_RADIUS; radius += CLEAR_SPOT_RADIUS_STEP) {
    for (let i = 0; i < CLEAR_SPOT_ANGLE_STEPS; i++) {
      const angle = (i / CLEAR_SPOT_ANGLE_STEPS) * Math.PI * 2;
      const p = { x: from.x + Math.cos(angle) * radius, z: from.z + Math.sin(angle) * radius };
      if (furnitureFits({ ...item, position: p }, floorPoly, walls, obstacles)) return p;
      const badness = footprintBadness({ ...item, position: p }, floorPoly, walls, obstacles);
      if (badness < bestBadness) {
        bestBadness = badness;
        best = p;
      }
    }
  }
  return best;
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
