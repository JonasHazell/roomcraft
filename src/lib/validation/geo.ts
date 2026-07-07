import type { Design, FurnitureItem, Point, Wall, WallOpening } from '../../types';
import { FURNITURE_CATALOG } from '../furnitureCatalog';
import {
  closestPointOnSegment,
  convexOverlap as convexOverlapEps,
  dist,
  distToQuad,
  floorPolygon,
  frontDir,
  interiorWallQuad,
  outwardNormal,
  pointInPolygon,
  polygonBounds,
  segmentsIntersect,
  wallDir,
} from '../polygon';
import { furnitureCorners } from '../collision';

export { distToQuad, frontDir, interiorWallQuad };

/** Footprint corners without shrinkage — the rules measure real dimensions. */
export function footprint(f: FurnitureItem): Point[] {
  return furnitureCorners(f, 0);
}

/** Right in the furniture's coordinate system (local +x in world space). */
export function rightDir(rotationY: number): Point {
  const f = frontDir(rotationY);
  return { x: f.z, z: -f.x };
}

export function add(p: Point, d: Point, k: number): Point {
  return { x: p.x + d.x * k, z: p.z + d.z * k };
}

export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.z * b.z;
}

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, z: a.z - b.z };
}

export function norm(p: Point): Point {
  const l = Math.hypot(p.x, p.z) || 1;
  return { x: p.x / l, z: p.z / l };
}

/** Support function: greatest extent of the quad in direction d, relative to the origin. */
export function support(quad: Point[], d: Point): number {
  return Math.max(...quad.map((p) => dot(p, d)));
}

/**
 * Convex overlap for the rules, which tolerate 1 cm of touching by default so
 * flush-against-a-wall placements aren't flagged. Same implementation as the
 * server's; only the default tolerance differs (see polygon.convexOverlap).
 */
export function convexOverlap(a: Point[], b: Point[], eps = 0.01): boolean {
  return convexOverlapEps(a, b, eps);
}

/** Minimum distance between two convex quads; 0 when overlapping. */
export function quadGap(a: Point[], b: Point[]): number {
  if (convexOverlap(a, b, 0)) return 0;
  let best = Infinity;
  for (const p of a) best = Math.min(best, distToQuad(p, b));
  for (const p of b) best = Math.min(best, distToQuad(p, a));
  return best;
}

/** True if segment a–b intersects the quad (an edge, or lies fully inside). */
export function segmentHitsQuad(a: Point, b: Point, quad: Point[]): boolean {
  if (pointInPolygon(a, quad) || pointInPolygon(b, quad)) return true;
  for (let i = 0; i < quad.length; i++) {
    if (segmentsIntersect(a, b, quad[i], quad[(i + 1) % quad.length])) return true;
  }
  return false;
}

/** Rectangle starting from the line s–e, extending depth along n. */
export function stripZone(s: Point, e: Point, n: Point, depth: number, inset = 0.02): Point[] {
  const d = norm(sub(e, s));
  const s2 = add(add(s, d, inset), n, inset);
  const e2 = add(add(e, d, -inset), n, inset);
  return [s2, e2, add(e2, n, depth - inset), add(s2, n, depth - inset)];
}

// ---- Openings ----

export interface OpeningInfo {
  opening: WallOpening;
  wall: Wall;
  /** Endpoints of the opening along the wall's drawn line. */
  s: Point;
  e: Point;
  center: Point;
  /** Directions into the room: one for an exterior wall, both for an interior wall. */
  normals: Point[];
  /** Top edge (elevation + height). */
  top: number;
  /** Bottom edge (window sill; 0 for a door). */
  sill: number;
}

export function openingInfos(design: Design, kind: WallOpening['kind']): OpeningInfo[] {
  const out: OpeningInfo[] = [];
  for (const o of design.openings) {
    if (o.kind !== kind) continue;
    const wall = design.walls.find((w) => w.id === o.wallId);
    if (!wall) continue;
    const d = wallDir(wall);
    const s = add(wall.a, d, o.offset);
    const e = add(s, d, o.width);
    const outN = outwardNormal(wall);
    const normals =
      wall.kind === 'exterior'
        ? [{ x: -outN.x, z: -outN.z }]
        : [outN, { x: -outN.x, z: -outN.z }];
    out.push({
      opening: o,
      wall,
      s,
      e,
      center: { x: (s.x + e.x) / 2, z: (s.z + e.z) / 2 },
      normals,
      top: o.elevation + o.height,
      sill: o.elevation,
    });
  }
  return out;
}

/** Clearance zones (depth in meters) in front of an opening, one per room-facing side. */
export function clearanceZones(info: OpeningInfo, depth: number): Point[][] {
  return info.normals.map((n) => stripZone(info.s, info.e, n, depth));
}

// ---- Walls as obstacles ----

/** True if any wall segment intersects the quad. */
export function wallsHitQuad(design: Design, quad: Point[]): boolean {
  for (const w of design.walls) {
    if (segmentHitsQuad(w.a, w.b, quad)) return true;
  }
  return false;
}

/** Minimum distance from a point to any wall line. */
export function distToNearestWall(design: Design, p: Point): number {
  let best = Infinity;
  for (const w of design.walls) {
    best = Math.min(best, dist(p, closestPointOnSegment(p, w.a, w.b)));
  }
  return best;
}

/** Nearest wall to the point (for "against a wall" checks). */
export function nearestWall(design: Design, p: Point): { wall: Wall; distance: number } | null {
  let best: { wall: Wall; distance: number } | null = null;
  for (const w of design.walls) {
    const d = dist(p, closestPointOnSegment(p, w.a, w.b));
    if (!best || d < best.distance) best = { wall: w, distance: d };
  }
  return best;
}

/** Furniture that blocks passage (solid/tall per the catalog), at floor level. */
export function blockers(furniture: FurnitureItem[], except: Set<string> = new Set()): FurnitureItem[] {
  return furniture.filter(
    (f) => !except.has(f.id) && FURNITURE_CATALOG[f.kind].blocks && f.elevation < 0.9,
  );
}

// ---- Eroded reachability grid ----

const CELL = 0.1;

export interface Grid {
  cols: number;
  rows: number;
  minX: number;
  minZ: number;
  free: Uint8Array;
  center: (c: number, r: number) => Point;
  idx: (c: number, r: number) => number;
}

/**
 * Grid over the floor where a cell is free if a circle of radius `erode` fits
 * without touching a wall or blocking furniture — i.e. the "walkable" part of
 * the floor for a passage 2×erode wide.
 */
export function erodedGrid(design: Design, erode: number, except: Set<string> = new Set()): Grid {
  const poly = floorPolygon(design.walls);
  const b = polygonBounds(poly);
  const cols = Math.max(1, Math.ceil((b.maxX - b.minX) / CELL));
  const rows = Math.max(1, Math.ceil((b.maxZ - b.minZ) / CELL));
  const center = (c: number, r: number): Point => ({
    x: b.minX + (c + 0.5) * CELL,
    z: b.minZ + (r + 0.5) * CELL,
  });
  const idx = (c: number, r: number) => r * cols + c;

  const solids = [
    ...blockers(design.furniture, except).map(footprint),
    ...design.walls.filter((w) => w.kind === 'interior').map(interiorWallQuad),
  ];

  const free = new Uint8Array(cols * rows);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const p = center(c, r);
      if (!pointInPolygon(p, poly)) continue;
      // Distance to the floor edge (inside of the exterior wall).
      let edgeDist = Infinity;
      for (let i = 0; i < poly.length; i++) {
        const cp = closestPointOnSegment(p, poly[i], poly[(i + 1) % poly.length]);
        edgeDist = Math.min(edgeDist, dist(p, cp));
      }
      if (edgeDist < erode) continue;
      if (solids.some((q) => distToQuad(p, q) < erode)) continue;
      free[idx(c, r)] = 1;
    }
  }
  return { cols, rows, minX: b.minX, minZ: b.minZ, free, center, idx };
}

/** Flood fill from seed cells; returns the reached cells. */
export function floodFill(grid: Grid, seed: (p: Point) => boolean): Uint8Array {
  const { cols, rows, free, center, idx } = grid;
  const reached = new Uint8Array(cols * rows);
  const queue: number[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (free[idx(c, r)] && seed(center(c, r))) {
        reached[idx(c, r)] = 1;
        queue.push(idx(c, r));
      }
    }
  }
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
      const ni = grid.idx(nc, nr);
      if (free[ni] && !reached[ni]) {
        reached[ni] = 1;
        queue.push(ni);
      }
    }
  }
  return reached;
}
