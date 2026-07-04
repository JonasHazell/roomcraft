import type { Design, Point, Wall } from '../src/types.ts';
import { FURNITURE_CATALOG } from '../src/lib/furnitureCatalog.ts';
import { WALL_T, outwardNormal, wallDir } from '../src/lib/polygon.ts';
import type { ResolvedFurniture } from './schema.ts';

/** Clear depth in front of a door (door swing), meters. */
export const DOOR_CLEARANCE = 0.8;

/**
 * The footprint's four corners in world coordinates (three.js rotation convention).
 * shrink shrinks (or, if negative, grows) the rectangle slightly.
 */
export function footprint(
  f: Pick<ResolvedFurniture, 'x' | 'z' | 'rotationY' | 'size'>,
  shrink = 0,
): Point[] {
  const hw = Math.max(f.size.width / 2 - shrink, 0.01);
  const hd = Math.max(f.size.depth / 2 - shrink, 0.01);
  const cos = Math.cos(f.rotationY);
  const sin = Math.sin(f.rotationY);
  return (
    [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ] as const
  ).map(([lx, lz]) => ({
    x: f.x + lx * cos + lz * sin,
    z: f.z - lx * sin + lz * cos,
  }));
}

/** World direction of the front (local +z rotated by rotationY). */
export function frontDir(rotationY: number): Point {
  return { x: Math.sin(rotationY), z: Math.cos(rotationY) };
}

/**
 * The access zone: the rectangle directly in front of the front side, as wide as
 * the furniture and `accessDepth` deep. Null if the furniture type requires no
 * access zone of its own.
 */
export function accessZone(f: ResolvedFurniture): Point[] | null {
  const depth = FURNITURE_CATALOG[f.kind].accessDepth;
  if (depth <= 0) return null;
  const fwd = frontDir(f.rotationY);
  const right = { x: fwd.z, z: -fwd.x }; // local +x
  const hw = f.size.width / 2;
  const faceX = f.x + fwd.x * (f.size.depth / 2);
  const faceZ = f.z + fwd.z * (f.size.depth / 2);
  const corner = (side: number, out: number): Point => ({
    x: faceX + right.x * side * hw + fwd.x * out,
    z: faceZ + right.z * side * hw + fwd.z * out,
  });
  return [corner(-1, 0), corner(1, 0), corner(1, depth), corner(-1, depth)];
}

/** The interior wall's solid as a rectangle in the floor plane (centered, thickness WALL_T). */
export function interiorWallQuad(w: Wall): Point[] {
  const n = outwardNormal(w);
  const t = WALL_T / 2;
  return [
    { x: w.a.x + n.x * t, z: w.a.z + n.z * t },
    { x: w.b.x + n.x * t, z: w.b.z + n.z * t },
    { x: w.b.x - n.x * t, z: w.b.z - n.z * t },
    { x: w.a.x - n.x * t, z: w.a.z - n.z * t },
  ];
}

/** Exterior wall: inside only (−outward normal). Interior wall: both sides. */
function sidesIntoRoom(wall: Wall): number[] {
  return wall.kind === 'exterior' ? [-1] : [-1, 1];
}

/** Clearance zones in front of doors: one rectangle per side facing the room. */
export function doorClearanceZones(
  design: Design,
): { label: string; quad: Point[]; doorTop: number }[] {
  const zones: { label: string; quad: Point[]; doorTop: number }[] = [];
  for (const o of design.openings) {
    if (o.kind !== 'door') continue;
    const wall = design.walls.find((w) => w.id === o.wallId);
    if (!wall) continue;
    const d = wallDir(wall);
    const s: Point = { x: wall.a.x + d.x * o.offset, z: wall.a.z + d.z * o.offset };
    const e: Point = { x: s.x + d.x * o.width, z: s.z + d.z * o.width };
    const out = outwardNormal(wall);
    for (const sign of sidesIntoRoom(wall)) {
      const n = { x: out.x * sign, z: out.z * sign };
      zones.push({
        label: `the door on wall ${o.wallId}`,
        doorTop: o.elevation + o.height,
        quad: [
          s,
          e,
          { x: e.x + n.x * DOOR_CLEARANCE, z: e.z + n.z * DOOR_CLEARANCE },
          { x: s.x + n.x * DOOR_CLEARANCE, z: s.z + n.z * DOOR_CLEARANCE },
        ],
      });
    }
  }
  return zones;
}

/** Separation axes for convex polygons (edge normals). */
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

/** Separating Axis Theorem for two convex polygons. eps < 0 tolerates touching. */
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
