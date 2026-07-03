import * as THREE from 'three';
import type { FurnitureItem, Room, WallId, WallOpening } from '../types';

export const WALL_T = 0.12;

/**
 * Varje väggs u-axel går vänster→höger sett inifrån rummet, med u = 0 i det
 * vänstra hörnet. `origin` är gruppens position: det yttre skalplanet vid
 * u = 0-hörnet, så att extruderingen (lokalt +z, tjocklek WALL_T) alltid går
 * inåt och slutar exakt på rummets innermått.
 */
export interface WallDef {
  id: WallId;
  label: string;
  length: (room: Room) => number;
  origin: (room: Room) => [number, number, number];
  rotationY: number;
  outwardNormal: THREE.Vector3;
}

export const WALL_DEFS: WallDef[] = [
  {
    id: 'north',
    label: 'Norr',
    length: (r) => r.width,
    origin: (r) => [-r.width / 2, 0, -r.length / 2 - WALL_T],
    rotationY: 0,
    outwardNormal: new THREE.Vector3(0, 0, -1),
  },
  {
    id: 'south',
    label: 'Söder',
    length: (r) => r.width,
    origin: (r) => [r.width / 2, 0, r.length / 2 + WALL_T],
    rotationY: Math.PI,
    outwardNormal: new THREE.Vector3(0, 0, 1),
  },
  {
    id: 'west',
    label: 'Väster',
    length: (r) => r.length,
    origin: (r) => [-r.width / 2 - WALL_T, 0, r.length / 2],
    rotationY: Math.PI / 2,
    outwardNormal: new THREE.Vector3(-1, 0, 0),
  },
  {
    id: 'east',
    label: 'Öster',
    length: (r) => r.length,
    origin: (r) => [r.width / 2 + WALL_T, 0, -r.length / 2],
    rotationY: -Math.PI / 2,
    outwardNormal: new THREE.Vector3(1, 0, 0),
  },
];

export const WALL_BY_ID: Record<WallId, WallDef> = Object.fromEntries(
  WALL_DEFS.map((d) => [d.id, d]),
) as Record<WallId, WallDef>;

export function wallLength(wall: WallId, room: Room): number {
  return WALL_BY_ID[wall].length(room);
}

export function buildWallGeometry(
  wallLen: number,
  wallHeight: number,
  openings: Pick<WallOpening, 'offset' | 'width' | 'height' | 'elevation'>[],
  thickness = WALL_T,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(wallLen, 0);
  shape.lineTo(wallLen, wallHeight);
  shape.lineTo(0, wallHeight);
  shape.closePath();

  for (const o of openings) {
    // Hålens winding normaliseras av ShapeUtils; ingen manuell reversering behövs.
    const x0 = Math.max(0, o.offset);
    const x1 = Math.min(o.offset + o.width, wallLen);
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

/** AABB-halvmått för ett w×d-fotavtryck roterat theta radianer kring Y. */
export function rotatedHalfExtents(w: number, d: number, theta: number) {
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  return { hx: (w / 2) * c + (d / 2) * s, hz: (w / 2) * s + (d / 2) * c };
}

/** Klampar en möbels centrum så att hela det roterade fotavtrycket ligger i rummet. */
export function clampToRoom(
  x: number,
  z: number,
  item: Pick<FurnitureItem, 'size' | 'rotationY'>,
  room: Room,
): { x: number; z: number } {
  const { hx, hz } = rotatedHalfExtents(item.size.width, item.size.depth, item.rotationY);
  const clampAxis = (v: number, half: number, roomHalf: number) =>
    half >= roomHalf ? 0 : THREE.MathUtils.clamp(v, -roomHalf + half, roomHalf - half);
  return {
    x: clampAxis(x, hx, room.width / 2),
    z: clampAxis(z, hz, room.length / 2),
  };
}

export function clampFurniture(item: FurnitureItem, room: Room): FurnitureItem {
  const p = clampToRoom(item.position.x, item.position.z, item, room);
  if (p.x === item.position.x && p.z === item.position.z) return item;
  return { ...item, position: p };
}

export function clampOpening(o: WallOpening, room: Room): WallOpening {
  const len = wallLength(o.wall, room);
  const width = THREE.MathUtils.clamp(o.width, 0.1, len);
  const offset = THREE.MathUtils.clamp(o.offset, 0, len - width);
  const elevation =
    o.kind === 'door' ? 0 : THREE.MathUtils.clamp(o.elevation, 0, room.height - 0.2);
  const height = THREE.MathUtils.clamp(o.height, 0.1, room.height - elevation);
  return { ...o, width, offset, elevation, height };
}
