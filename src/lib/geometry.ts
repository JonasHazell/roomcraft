import * as THREE from 'three';
import type { FurnitureItem, Point, Wall, WallOpening } from '../types';
import {
  WALL_T,
  clampToPolygon,
  outwardNormal,
  pointInPolygon,
  segmentsIntersect,
  wallLen,
} from './polygon';

export { WALL_T };

export interface WallTransform {
  origin: [number, number, number];
  rotationY: number;
}

/**
 * Placement of the wall's group in the world. Locally the u axis (+x) runs along
 * a→b and the extrusion (+z, thickness WALL_T) toward the inside of the room.
 *
 * Exterior wall: origin on the outer shell plane at a, so that the extrusion ends
 * exactly on the drawn line (the room's inner dimensions). Interior wall: solid
 * centered on the drawn segment.
 */
export function wallTransform(w: Wall): WallTransform {
  const n = outwardNormal(w);
  const d = wallLen(w) || 1;
  const rotationY = Math.atan2(-(w.b.z - w.a.z) / d, (w.b.x - w.a.x) / d);
  const t = w.kind === 'exterior' ? WALL_T : WALL_T / 2;
  return { origin: [w.a.x + n.x * t, 0, w.a.z + n.z * t], rotationY };
}

export function buildWallGeometry(
  wallLength: number,
  wallHeight: number,
  openings: Pick<WallOpening, 'offset' | 'width' | 'height' | 'elevation'>[],
  thickness = WALL_T,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(wallLength, 0);
  shape.lineTo(wallLength, wallHeight);
  shape.lineTo(0, wallHeight);
  shape.closePath();

  for (const o of openings) {
    // The holes' winding is normalized by ShapeUtils; no manual reversal needed.
    const x0 = Math.max(0, o.offset);
    const x1 = Math.min(o.offset + o.width, wallLength);
    const y0 = Math.max(0, o.elevation);
    const y1 = Math.min(o.elevation + o.height, wallHeight - 0.02);
    if (x1 - x0 < 0.01 || y1 - y0 < 0.01) continue;
    const hole = new THREE.Path();
    hole.moveTo(x0, y0);
    hole.lineTo(x1, y0);
    hole.lineTo(x1, y1);
    hole.lineTo(x0, y1);
    hole.closePath();
    shape.holes.push(hole);
  }

  return new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
}

/** Clamps a furniture piece's center to the floor polygon (deliberately center-based). */
export function clampFurniture(item: FurnitureItem, floorPoly: Point[]): FurnitureItem {
  const p = clampToPolygon(item.position, floorPoly);
  if (p === item.position) return item;
  return { ...item, position: p };
}

// ---- Footprint collision (dragging against walls) ----

type Footprint = Pick<FurnitureItem, 'position' | 'rotationY' | 'size'>;

/** Shrinks the footprint so that flush against a wall does not count as a collision. */
const FIT_SHRINK = 0.015;

/** The footprint's four corners in the world (same rotation convention as three.js). */
export function furnitureCorners(item: Footprint, shrink = FIT_SHRINK): Point[] {
  const hw = Math.max(item.size.width / 2 - shrink, 0.005);
  const hd = Math.max(item.size.depth / 2 - shrink, 0.005);
  const cos = Math.cos(item.rotationY);
  const sin = Math.sin(item.rotationY);
  return (
    [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ] as const
  ).map(([lx, lz]) => ({
    x: item.position.x + lx * cos + lz * sin,
    z: item.position.z - lx * sin + lz * cos,
  }));
}

function quadsOverlap(a: Point[], b: Point[]): boolean {
  if (a.some((p) => pointInPolygon(p, b)) || b.some((p) => pointInPolygon(p, a))) return true;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (
        segmentsIntersect(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])
      ) {
        return true;
      }
    }
  }
  return false;
}

/** The interior wall's solid as a rectangle in the floor plane (centered, thickness WALL_T). */
function interiorWallQuad(w: Wall): Point[] {
  const n = outwardNormal(w);
  const t = WALL_T / 2;
  return [
    { x: w.a.x + n.x * t, z: w.a.z + n.z * t },
    { x: w.b.x + n.x * t, z: w.b.z + n.z * t },
    { x: w.b.x - n.x * t, z: w.b.z - n.z * t },
    { x: w.a.x - n.x * t, z: w.a.z - n.z * t },
  ];
}

/**
 * True if the whole footprint lies in the floor polygon without crossing any wall.
 * Corner-in-polygon alone is not enough in e.g. L-shaped rooms (an edge can cut
 * across a notch), so edge-to-edge intersections are tested as well.
 */
export function furnitureFits(item: Footprint, floorPoly: Point[], walls: Wall[]): boolean {
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
): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.05));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const p = { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t };
    if (!furnitureFits({ ...item, position: p }, floorPoly, walls)) return false;
  }
  return true;
}

/**
 * Moves a furniture piece toward target as far as possible without wall collision.
 * Per axis (x first, then z) the longest fitting stretch is found by binary
 * search, giving natural sliding along walls while dragging.
 */
export function slideFurniture(
  item: Footprint,
  target: Point,
  floorPoly: Point[],
  walls: Wall[],
): Point {
  const reachable = (from: Point, to: Point) => pathFits(item, from, to, floorPoly, walls);
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
  const width = THREE.MathUtils.clamp(o.width, 0.1, len);
  const offset = THREE.MathUtils.clamp(o.offset, 0, len - width);
  const elevation =
    o.kind === 'door' ? 0 : THREE.MathUtils.clamp(o.elevation, 0, roomHeight - 0.2);
  const height = THREE.MathUtils.clamp(o.height, 0.1, roomHeight - elevation);
  return { ...o, width, offset, elevation, height };
}
