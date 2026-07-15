import type { FurnitureItem, Wall } from '../types';
import { furnitureCorners } from './collision';
import { closestPointOnSegment, dist, distToQuad } from './polygon';

/**
 * The subset of {@link FurnitureItem} needed to compute a footprint — the same
 * shape {@link furnitureCorners} already accepts.
 */
type Footprint = Pick<FurnitureItem, 'position' | 'rotationY' | 'size'>;

/**
 * The selected piece's distance to the nearest wall and to the nearest other
 * piece, for the read-only readout in {@link ../components/panel/PropertiesPanel}.
 * This is the touch-friendly, non-"data power user" alternative to exact X/Z
 * position fields the human asked for (see docs/AGENT_LEARNINGS.md, #148/#153):
 * relative distances the user can already relate to something they see, not
 * absolute coordinates in a coordinate system the UI never otherwise exposes.
 *
 * Both distances are measured from the piece's real (unshrunk) footprint
 * corners — {@link furnitureCorners} shrinks by a collision tolerance by
 * default, which would make the readout under-report how close a piece
 * actually is.
 */
export interface SelectionDistances {
  /** Distance to the closest wall segment, or null if the room has no walls. */
  wall: number | null;
  /** Distance to the closest other piece's footprint, or null if there is none. */
  piece: number | null;
}

/** Distance from a footprint's corners to the nearest of the given wall segments. */
export function nearestWallDistance(item: Footprint, walls: Wall[]): number | null {
  if (walls.length === 0) return null;
  let best = Infinity;
  for (const corner of furnitureCorners(item, 0)) {
    for (const wall of walls) {
      best = Math.min(best, dist(corner, closestPointOnSegment(corner, wall.a, wall.b)));
    }
  }
  return best;
}

/** Distance from a footprint's corners to the nearest of the given other footprints. */
export function nearestPieceDistance(item: Footprint, others: Footprint[]): number | null {
  if (others.length === 0) return null;
  let best = Infinity;
  const otherQuads = others.map((o) => furnitureCorners(o, 0));
  for (const corner of furnitureCorners(item, 0)) {
    for (const quad of otherQuads) {
      best = Math.min(best, distToQuad(corner, quad));
    }
  }
  return best;
}

/** Both distances for a selected piece against the room's walls and its other furniture. */
export function nearestDistances(
  item: Footprint,
  walls: Wall[],
  others: Footprint[],
): SelectionDistances {
  return {
    wall: nearestWallDistance(item, walls),
    piece: nearestPieceDistance(item, others),
  };
}
