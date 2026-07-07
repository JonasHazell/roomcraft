import * as THREE from 'three';
import type { Wall, WallOpening } from '../types';
import { WALL_T, outwardNormal, wallLen } from './polygon';

export { WALL_T };

// three.js mesh building for the 3D scene. Pure 2D footprint/collision geometry
// lives in collision.ts so the validation engine can stay free of three.js.

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
