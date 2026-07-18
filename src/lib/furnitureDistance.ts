import type { FurnitureItem } from '../types';
import { furnitureCorners } from './collision';
import { distToQuad } from './polygon';

/**
 * The subset of {@link FurnitureItem} needed to compute a footprint — the same
 * shape {@link furnitureCorners} already accepts.
 */
type Footprint = Pick<FurnitureItem, 'position' | 'rotationY' | 'size'>;

/**
 * Distance from a footprint's corners to the nearest of the given other
 * footprints, for the read-only readout in
 * {@link ../components/panel/PropertiesPanel}. This is the touch-friendly,
 * non-"data power user" alternative to exact X/Z position fields the human asked
 * for (see docs/AGENT_LEARNINGS.md, #148/#153): a relative distance the user can
 * already relate to something they see, not absolute coordinates in a coordinate
 * system the UI never otherwise exposes.
 *
 * Measured from the piece's real (unshrunk) footprint corners —
 * {@link furnitureCorners} shrinks by a collision tolerance by default, which
 * would make the readout under-report how close a piece actually is.
 */
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
