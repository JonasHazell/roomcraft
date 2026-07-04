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
 * Placering av väggens grupp i världen. Lokalt går u-axeln (+x) längs a→b och
 * extruderingen (+z, tjocklek WALL_T) mot rummets insida.
 *
 * Yttervägg: origin på det yttre skalplanet vid a, så att extruderingen slutar
 * exakt på den ritade linjen (rummets innermått). Innervägg: solid centrerad
 * på det ritade segmentet.
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
    // Hålens winding normaliseras av ShapeUtils; ingen manuell reversering behövs.
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

/** Klampar en möbels centrum till golvpolygonen (medvetet centrum-baserat). */
export function clampFurniture(item: FurnitureItem, floorPoly: Point[]): FurnitureItem {
  const p = clampToPolygon(item.position, floorPoly);
  if (p === item.position) return item;
  return { ...item, position: p };
}

// ---- Fotavtryckskollision (drag mot väggar) ----

type Footprint = Pick<FurnitureItem, 'position' | 'rotationY' | 'size'>;

/** Krymper fotavtrycket så att dikt-an mot vägg inte räknas som kollision. */
const FIT_SHRINK = 0.015;

/** Fotavtryckets fyra hörn i världen (samma rotationskonvention som three.js). */
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

/** Innerväggens solid som rektangel i golvplanet (centrerad, tjocklek WALL_T). */
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
 * Sant om hela fotavtrycket ligger i golvpolygonen utan att korsa någon vägg.
 * Hörn-i-polygon räcker inte ensamt i t.ex. L-rum (kanten kan gena över en
 * nisch), därför testas även kant-mot-kant-korsningar.
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
 * Sant om möbeln får plats längs hela sträckan from→to. Slutpunkten ensam
 * räcker inte — vid snabba pekarrörelser kan målet ligga på andra sidan en
 * tunn innervägg (tunnling). Steget 0,05 m är mindre än väggtjockleken.
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
 * Flyttar en möbel mot target så långt det går utan väggkollision.
 * Per axel (x först, sedan z) binärsöks den längsta biten som får plats,
 * vilket ger naturlig glidning längs väggar under drag.
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
