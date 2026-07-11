import type { OpeningKind, Point, Wall, WallOpening } from '../types';

/** Snap grid in the 2D editor, meters. */
export const GRID = 0.1;
/** Wall thickness, meters. */
export const WALL_T = 0.12;

const EPS = 1e-6;

/** Rounds away floating point noise to mm precision. */
function roundCoord(v: number): number {
  return Math.round(v * 1000) / 1000;
}

export function snap(v: number, grid = GRID): number {
  return roundCoord(Math.round(v / grid) * grid);
}

export function snapPoint(p: Point, grid = GRID): Point {
  return { x: snap(p.x, grid), z: snap(p.z, grid) };
}

/** Locks p to the same x or z line as prev (the smaller delta component is zeroed). */
export function axisLock(prev: Point, p: Point): Point {
  const dx = p.x - prev.x;
  const dz = p.z - prev.z;
  return Math.abs(dx) >= Math.abs(dz) ? { x: p.x, z: prev.z } : { x: prev.x, z: p.z };
}

/** Snap distance to already placed corners in the 2D editor, meters. */
export const CORNER_SNAP = 0.25;

/**
 * Snaps p's free coordinate (x if the segment is horizontal, otherwise z) to
 * the nearest corner coordinate within tol. Returns the corner that drove the
 * snap (for the guide line in the UI) or null if no corner was within tolerance.
 */
export function snapToCornerAxis(
  p: Point,
  corners: Point[],
  horizontal: boolean,
  tol = CORNER_SNAP,
): { point: Point; guide: Point | null } {
  let guide: Point | null = null;
  let best = tol;
  for (const c of corners) {
    const d = horizontal ? Math.abs(c.x - p.x) : Math.abs(c.z - p.z);
    if (d < best) {
      best = d;
      guide = c;
    }
  }
  if (!guide) return { point: p, guide: null };
  return {
    point: horizontal ? { x: guide.x, z: p.z } : { x: p.x, z: guide.z },
    guide,
  };
}

/**
 * The snapped position of the next outline point while drawing a wall from
 * `last`. The wall is locked to run purely horizontally or vertically, so the
 * coordinate it shares with `last` is kept exactly — grid-snapping it would
 * detach a wall drawn from an exact-length (off-grid) corner onto the 0.1 m
 * grid and leave a diagonal edge that can never close. Only the free coordinate
 * snaps: to an already-placed corner when one lines up (so off-grid typed
 * lengths can be matched exactly), otherwise to the grid.
 */
export function drawSnap(
  last: Point,
  raw: Point,
  corners: Point[],
  tol = CORNER_SNAP,
): { point: Point; guide: Point | null } {
  const locked = axisLock(last, raw);
  const horizontal = locked.z === last.z; // wall runs along x → x is the free coordinate
  // Grid-snap only the free coordinate; the shared one stays exactly on `last`.
  const gridded: Point = horizontal
    ? { x: snap(locked.x), z: last.z }
    : { x: last.x, z: snap(locked.z) };
  // Prefer lining the free coordinate up with an existing corner (kept exact, so
  // it matches off-grid typed lengths); otherwise fall back to the grid position.
  const aligned = snapToCornerAxis(locked, corners, horizontal, tol);
  const point = aligned.guide ? aligned.point : gridded;
  // A snap that collapses onto the previous corner would make a zero-length wall;
  // drop back to the grid position (and drop the guide) so short walls aren't made.
  return pointsEqual(point, last)
    ? { point: gridded, guide: null }
    : { point, guide: aligned.guide };
}

export function dist(p: Point, q: Point): number {
  return Math.hypot(q.x - p.x, q.z - p.z);
}

export function pointsEqual(p: Point, q: Point): boolean {
  return Math.abs(p.x - q.x) < EPS && Math.abs(p.z - q.z) < EPS;
}

/** Shoelace sum in (x,z); positive for canonical winding. */
export function signedArea(poly: Point[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    sum += p.x * q.z - q.x * p.z;
  }
  return sum / 2;
}

/** Reverses the point order if needed so the shoelace sum becomes positive. */
export function normalizeWinding(points: Point[]): Point[] {
  return signedArea(points) < 0 ? [...points].reverse() : points;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function polygonBounds(poly: Point[]): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX, maxX, minZ, maxZ };
}

/** Bbox center — good enough as camera target and scene center. */
export function polygonCenter(poly: Point[]): Point {
  const b = polygonBounds(poly);
  return { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
}

/** Even-odd ray casting in the (x,z) plane. */
export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function closestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < EPS) return a;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / lenSq));
  return { x: a.x + t * dx, z: a.z + t * dz };
}

/**
 * Inside → p unchanged; otherwise the closest boundary point, nudged 0.01 m in
 * along the edge's inward normal (-dz, dx) so the result lands strictly inside.
 */
export function clampToPolygon(p: Point, poly: Point[]): Point {
  if (poly.length < 3 || pointInPolygon(p, poly)) return p;
  let best: Point = poly[0];
  let bestDist = Infinity;
  let bestEdge = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const c = closestPointOnSegment(p, a, b);
    const d = dist(p, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
      bestEdge = i;
    }
  }
  const a = poly[bestEdge];
  const b = poly[(bestEdge + 1) % poly.length];
  const len = dist(a, b) || 1;
  const nx = -(b.z - a.z) / len;
  const nz = (b.x - a.x) / len;
  return { x: best.x + nx * 0.01, z: best.z + nz * 0.01 };
}

// ---- Wall segments ----

/** Normalized direction a→b. */
export function wallDir(w: Pick<Wall, 'a' | 'b'>): Point {
  const len = dist(w.a, w.b) || 1;
  return { x: (w.b.x - w.a.x) / len, z: (w.b.z - w.a.z) / len };
}

export function wallLen(w: Pick<Wall, 'a' | 'b'>): number {
  return dist(w.a, w.b);
}

/** Outward normal for an exterior wall in canonical (positive) winding: (dz, -dx). */
export function outwardNormal(w: Pick<Wall, 'a' | 'b'>): Point {
  const d = wallDir(w);
  return { x: d.z + 0, z: -d.x + 0 }; // + 0 normalizes away -0
}

export function wallMidpoint(w: Pick<Wall, 'a' | 'b'>): Point {
  return { x: (w.a.x + w.b.x) / 2, z: (w.a.z + w.b.z) / 2 };
}

export function isAxisParallel(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < EPS || Math.abs(a.z - b.z) < EPS;
}

/** The floor polygon: the exterior walls' start points in loop order. */
export function floorPolygon(walls: Wall[]): Point[] {
  return walls.filter((w) => w.kind === 'exterior').map((w) => w.a);
}

/**
 * Slides one wall perpendicular to itself so it lands on `coord` (its z if the
 * wall is horizontal, its x if vertical). An interior wall just moves both of its
 * endpoints; an exterior wall drags the two neighbouring exterior walls' shared
 * endpoints along so the loop stays closed. Returns a fresh wall array — the
 * caller validates and applies it. Shared by dragging a wall and dragging a corner.
 */
export function slideWall(walls: Wall[], wall: Wall, coord: number): Wall[] {
  const horizontal = wall.a.z === wall.b.z;
  const moved: Wall = horizontal
    ? { ...wall, a: { ...wall.a, z: coord }, b: { ...wall.b, z: coord } }
    : { ...wall, a: { ...wall.a, x: coord }, b: { ...wall.b, x: coord } };
  if (wall.kind === 'interior') {
    return walls.map((w) => (w.id === wall.id ? moved : w));
  }
  return walls.map((w) => {
    if (w.id === wall.id) return moved;
    if (w.kind !== 'exterior') return w;
    const b = w.b.x === wall.a.x && w.b.z === wall.a.z ? moved.a : w.b;
    const a = w.a.x === wall.b.x && w.a.z === wall.b.z ? moved.b : w.a;
    return a === w.a && b === w.b ? w : { ...w, a, b };
  });
}

function orient(p: Point, q: Point, r: Point): number {
  const v = (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  return Math.abs(v) < EPS ? 0 : Math.sign(v);
}

function onSegment(p: Point, q: Point, r: Point): boolean {
  return (
    Math.min(p.x, r.x) - EPS <= q.x &&
    q.x <= Math.max(p.x, r.x) + EPS &&
    Math.min(p.z, r.z) - EPS <= q.z &&
    q.z <= Math.max(p.z, r.z) + EPS
  );
}

/**
 * True if the segments strictly cross, excluding endpoint touches and collinear
 * overlap. Unlike {@link segmentsIntersect}, a shared endpoint does not count —
 * e.g. a line of sight through a doorway must not be stopped by a wall's corner.
 */
export function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const o = (p: Point, q: Point, r: Point) =>
    Math.sign((q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b) && o(a, b, c) !== 0 && o(c, d, a) !== 0;
}

/** True if the segments cross or touch each other (incl. collinear overlap). */
export function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const o1 = orient(p1, p2, p3);
  const o2 = orient(p1, p2, p4);
  const o3 = orient(p3, p4, p1);
  const o4 = orient(p3, p4, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;
  return false;
}

/**
 * True if the edge b→c folds straight back along a→b (collinear and reversed).
 * Used to reject a drawn outline point that would double back on the last edge.
 */
export function foldsBack(a: Point, b: Point, c: Point): boolean {
  const d1 = wallDir({ a, b });
  const d2 = wallDir({ a: b, b: c });
  const cross = d1.x * d2.z - d1.z * d2.x;
  const dot = d1.x * d2.x + d1.z * d2.z;
  return Math.abs(cross) < EPS && dot < 0;
}

export type LoopValidation = { ok: true } | { ok: false; reason: string };

/**
 * Validates that the exterior walls form a closed, simple, axis-parallel loop
 * with canonical (positive) winding. Error messages are shown in the UI.
 */
export function validateExteriorLoop(walls: Pick<Wall, 'a' | 'b'>[]): LoopValidation {
  const n = walls.length;
  if (n < 4) return { ok: false, reason: 'The outline must have at least four corners.' };
  for (const w of walls) {
    if (!isAxisParallel(w.a, w.b)) {
      return { ok: false, reason: 'Walls must be horizontal or vertical.' };
    }
    if (wallLen(w) < GRID - EPS) {
      return { ok: false, reason: 'A wall is too short (at least 10 cm).' };
    }
  }
  for (let i = 0; i < n; i++) {
    if (!pointsEqual(walls[i].b, walls[(i + 1) % n].a)) {
      return { ok: false, reason: 'The outline is not closed.' };
    }
  }
  // Neighbors must not fold back along the same line.
  for (let i = 0; i < n; i++) {
    const d1 = wallDir(walls[i]);
    const d2 = wallDir(walls[(i + 1) % n]);
    const cross = d1.x * d2.z - d1.z * d2.x;
    const dot = d1.x * d2.x + d1.z * d2.z;
    if (Math.abs(cross) < EPS && dot < 0) {
      return { ok: false, reason: 'The walls cross each other.' };
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      if (segmentsIntersect(walls[i].a, walls[i].b, walls[j].a, walls[j].b)) {
        return { ok: false, reason: 'The walls cross each other.' };
      }
    }
  }
  if (signedArea(walls.map((w) => w.a)) <= 0) {
    return { ok: false, reason: 'The outline is not closed.' };
  }
  return { ok: true };
}

/** Builds the exterior wall chain from a closed point list (last → first closes it). */
export function wallsFromPolygon(points: Point[], idFactory: () => string): Wall[] {
  return points.map((a, i) => ({
    id: idFactory(),
    kind: 'exterior' as const,
    a,
    b: points[(i + 1) % points.length],
  }));
}

/**
 * Corner fill: how much wall i's extruded length should be adjusted at its
 * end (the corner toward the next wall). Convex corner +t, concave −t, collinear 0.
 * The start is never adjusted — each corner is handled by its incoming wall, which
 * seals the exterior band without overlap and leaves u = 0 (opening offset) untouched.
 */
export function exteriorEndExtension(walls: Wall[], i: number, t = WALL_T): number {
  const exterior = walls.filter((w) => w.kind === 'exterior');
  const idx = exterior.indexOf(walls[i]);
  if (idx === -1) return 0;
  const d1 = wallDir(exterior[idx]);
  const d2 = wallDir(exterior[(idx + 1) % exterior.length]);
  const cross = d1.x * d2.z - d1.z * d2.x;
  if (cross > EPS) return t;
  if (cross < -EPS) return -t;
  return 0;
}

/** UI label: walls are numbered per kind in array order. */
export function wallLabel(walls: Wall[], id: string): string {
  const wall = walls.find((w) => w.id === id);
  if (!wall) return 'Wall';
  const siblings = walls.filter((w) => w.kind === wall.kind);
  const idx = siblings.indexOf(wall) + 1;
  return `${wall.kind === 'exterior' ? 'Exterior wall' : 'Interior wall'} ${idx}`;
}

export function formatCm(v: number): string {
  return `${Math.round(v * 100).toLocaleString('sv-SE')} cm`;
}

/**
 * The opening a fresh "Add door/window" control creates, in meters. A single
 * source of truth so the wall selection bar and the doors-&-windows editor add
 * identical openings.
 */
export function defaultOpening(kind: OpeningKind, wallId: string): Omit<WallOpening, 'id'> {
  return kind === 'door'
    ? { kind, wallId, offset: 0.5, width: 0.9, height: 2.1, elevation: 0 }
    : { kind, wallId, offset: 0.8, width: 1.2, height: 1.2, elevation: 0.9 };
}

// ---- Footprint / collision primitives (shared by client and server) ----

/** Clamps v to [min, max]. */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/**
 * The four corners of a rotated rectangle centered on `center` with the given
 * half extents (three.js rotation convention: +z is the front, x maps to cos/sin
 * as `x + lx*cos + lz*sin`, `z - lx*sin + lz*cos`). The single source of truth
 * for every furniture footprint on both the client and the server.
 */
export function rectCorners(center: Point, hw: number, hd: number, rotationY: number): Point[] {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  return (
    [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ] as const
  ).map(([lx, lz]) => ({
    x: center.x + lx * cos + lz * sin,
    z: center.z - lx * sin + lz * cos,
  }));
}

/** World direction of a furniture front (local +z rotated by rotationY). */
export function frontDir(rotationY: number): Point {
  return { x: Math.sin(rotationY), z: Math.cos(rotationY) };
}

/** The interior wall's solid as a quad in the floor plane (centered, thickness WALL_T). */
export function interiorWallQuad(w: Pick<Wall, 'a' | 'b'>): Point[] {
  const n = outwardNormal(w);
  const t = WALL_T / 2;
  return [
    { x: w.a.x + n.x * t, z: w.a.z + n.z * t },
    { x: w.b.x + n.x * t, z: w.b.z + n.z * t },
    { x: w.b.x - n.x * t, z: w.b.z - n.z * t },
    { x: w.a.x - n.x * t, z: w.a.z - n.z * t },
  ];
}

/** Separation axes of a convex polygon (edge normals). */
function edgeAxes(poly: Point[]): Point[] {
  const axes: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    axes.push({ x: -(b.z - a.z) / len, z: (b.x - a.x) / len });
  }
  return axes;
}

/**
 * Separating Axis Theorem for two convex polygons. A positive `eps` tolerates
 * touching (treats an overlap thinner than eps as no overlap); a negative eps
 * reports touching as an overlap. The single implementation for both the client
 * (which defaults to a 1 cm tolerance) and the server (which defaults to none).
 */
export function convexOverlap(a: Point[], b: Point[], eps = 0): boolean {
  for (const axis of [...edgeAxes(a), ...edgeAxes(b)]) {
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
    if (maxA - eps <= minB || maxB - eps <= minA) return false; // separation gap → no overlap
  }
  return true;
}

/** Distance from a point to a convex quad; 0 if the point is inside. */
export function distToQuad(p: Point, quad: Point[]): number {
  if (pointInPolygon(p, quad)) return 0;
  let best = Infinity;
  for (let i = 0; i < quad.length; i++) {
    const c = closestPointOnSegment(p, quad[i], quad[(i + 1) % quad.length]);
    best = Math.min(best, dist(p, c));
  }
  return best;
}
