import type { FurnitureItem, Point, Wall } from '../types';
import { furnitureCorners } from './collision';

/**
 * The subset of {@link FurnitureItem} needed to compute a footprint — the same
 * shape {@link furnitureCorners} already accepts.
 */
type Footprint = Pick<FurnitureItem, 'position' | 'rotationY' | 'size'>;

/** What a {@link DimensionLine} measures across to. */
export type DimensionTarget = 'wall' | 'furniture';

/**
 * One measurement to draw in the 3D view for the selected piece: a straight run
 * from a point on the piece's footprint out to the nearest wall or other piece
 * in that direction, plus the gap length so the scene can label it. Rendered as a
 * dashed line with the measurement (see {@link ../components/scene/SelectionDimensions}).
 */
export interface DimensionLine {
  /** Point on the selected piece's footprint edge, on the floor plane. */
  from: Point;
  /** Point on the wall or other piece the run reaches, on the floor plane. */
  to: Point;
  /** Gap length in meters (equal to the distance from `from` to `to`). */
  distance: number;
  /** Whether the run stops at a wall or at another piece. */
  target: DimensionTarget;
}

// Below this the two footprints (or the piece and a wall) are effectively
// touching; a "0 cm" run would only add clutter, so it is dropped.
const MIN_GAP = 0.02;

/**
 * Distance along the ray from `o` in unit direction `d` to where it first crosses
 * segment `a`→`b`, or null if the ray never crosses it in front of the origin.
 * Solves o + t·d = a + s·(b − a) for t ≥ 0 and s ∈ [0, 1]; `d` is a unit vector so
 * `t` is the distance directly.
 */
function rayHitSegment(o: Point, d: Point, a: Point, b: Point): number | null {
  const ex = b.x - a.x;
  const ez = b.z - a.z;
  const det = ex * d.z - ez * d.x;
  if (Math.abs(det) < 1e-9) return null; // ray parallel to the segment
  const rx = a.x - o.x;
  const rz = a.z - o.z;
  const t = (ex * rz - ez * rx) / det;
  const s = (d.x * rz - d.z * rx) / det;
  if (t < 0 || s < -1e-6 || s > 1 + 1e-6) return null;
  return t;
}

/** Nearest crossing distance from a ray to any of the given segments, or Infinity. */
function nearestRayHit(o: Point, d: Point, segments: [Point, Point][]): number {
  let best = Infinity;
  for (const [a, b] of segments) {
    const t = rayHitSegment(o, d, a, b);
    if (t != null && t < best) best = t;
  }
  return best;
}

/**
 * The dimension runs to draw for a selected piece: from the midpoint of each of
 * its four footprint sides, straight out along that side's outward normal to
 * whichever comes first — a wall or another piece — measuring the gap on that
 * side. A side flush against its neighbour (gap below {@link MIN_GAP}) is skipped.
 *
 * `others` should already exclude the selected piece itself (and typically rugs,
 * which lie flat and are meant to be stood on). Measured from the real, unshrunk
 * footprint corners so the readout matches what the eye sees.
 */
export function dimensionLines(item: Footprint, walls: Wall[], others: Footprint[]): DimensionLine[] {
  const corners = furnitureCorners(item, 0);
  const center = item.position;
  const wallSegments: [Point, Point][] = walls.map((w) => [w.a, w.b]);
  const pieceSegments: [Point, Point][] = [];
  for (const o of others) {
    const quad = furnitureCorners(o, 0);
    for (let i = 0; i < quad.length; i++) {
      pieceSegments.push([quad[i], quad[(i + 1) % quad.length]]);
    }
  }

  const lines: DimensionLine[] = [];
  for (let i = 0; i < corners.length; i++) {
    const p = corners[i];
    const q = corners[(i + 1) % corners.length];
    const mid = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };

    // Outward normal of this side: perpendicular to the edge, pointing away from
    // the piece's center.
    const elen = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    let nx = (q.z - p.z) / elen;
    let nz = -(q.x - p.x) / elen;
    if ((mid.x - center.x) * nx + (mid.z - center.z) * nz < 0) {
      nx = -nx;
      nz = -nz;
    }
    const dir = { x: nx, z: nz };

    const wallT = nearestRayHit(mid, dir, wallSegments);
    const pieceT = nearestRayHit(mid, dir, pieceSegments);
    const target: DimensionTarget = pieceT < wallT ? 'furniture' : 'wall';
    const t = Math.min(wallT, pieceT);
    if (!Number.isFinite(t) || t < MIN_GAP) continue;

    lines.push({
      from: mid,
      to: { x: mid.x + dir.x * t, z: mid.z + dir.z * t },
      distance: t,
      target,
    });
  }
  return lines;
}
