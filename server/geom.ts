import type { Design, Point, Wall } from '../src/types.ts';
import { FURNITURE_CATALOG } from '../src/lib/furnitureCatalog.ts';
import { WALL_T, outwardNormal, wallDir } from '../src/lib/polygon.ts';
import type { ResolvedFurniture } from './schema.ts';

/** Fritt djup framför dörr (dörrsvep), meter. */
export const DOOR_CLEARANCE = 0.8;

/**
 * Fotavtryckets fyra hörn i världskoordinater (three.js-rotationskonvention).
 * shrink krymper (eller, negativt, växer) rektangeln en aning.
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

/** Framsidans världsriktning (lokal +z roterad med rotationY). */
export function frontDir(rotationY: number): Point {
  return { x: Math.sin(rotationY), z: Math.cos(rotationY) };
}

/**
 * Åtkomstzonen: rektangeln direkt framför framsidan, lika bred som möbeln och
 * `accessDepth` djup. Null om möbeltypen inte kräver egen åtkomstzon.
 */
export function accessZone(f: ResolvedFurniture): Point[] | null {
  const depth = FURNITURE_CATALOG[f.kind].accessDepth;
  if (depth <= 0) return null;
  const fwd = frontDir(f.rotationY);
  const right = { x: fwd.z, z: -fwd.x }; // lokal +x
  const hw = f.size.width / 2;
  const faceX = f.x + fwd.x * (f.size.depth / 2);
  const faceZ = f.z + fwd.z * (f.size.depth / 2);
  const corner = (side: number, out: number): Point => ({
    x: faceX + right.x * side * hw + fwd.x * out,
    z: faceZ + right.z * side * hw + fwd.z * out,
  });
  return [corner(-1, 0), corner(1, 0), corner(1, depth), corner(-1, depth)];
}

/** Innerväggens solid som rektangel i golvplanet (centrerad, tjocklek WALL_T). */
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

/** Yttervägg: bara insidan (−utåtnormal). Innervägg: båda sidor. */
function sidesIntoRoom(wall: Wall): number[] {
  return wall.kind === 'exterior' ? [-1] : [-1, 1];
}

/** Frizoner framför dörrar: en rektangel per sida som vetter mot rummet. */
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
        label: `dörren på vägg ${o.wallId}`,
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

/** Konvexa polygoners separationsaxlar (kantnormaler). */
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

/** Separating Axis Theorem för två konvexa polygoner. eps < 0 tolererar beröring. */
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
    if (maxA - eps <= minB || maxB - eps <= minA) return false; // separationsgap → ingen överlapp
  }
  return true;
}
