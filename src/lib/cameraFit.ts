import type { Point } from '../types';
import { polygonBounds } from './polygon';

// The base furnish-view camera offset from the room centre — the fixed
// [+7, 5.5, +8.5] the scene used before #291, tuned for a typical room. It is
// kept as a direction+magnitude and scaled by the room's size below.
const BASE_OFFSET = { x: 7, y: 5.5, z: 8.5 } as const;

// Floor extent (metres) the base offset frames well. Rooms up to this size keep
// the original framing; larger rooms scale the offset up so the camera pulls
// back instead of jamming into a wall.
const REFERENCE_EXTENT = 5;
// Never move closer than the original (don't regress small rooms); cap the
// pull-back so the start position stays within OrbitControls' maxDistance (40).
const MIN_SCALE = 1;
const MAX_SCALE = 3;

/**
 * The initial camera position for the 3D furnish view, computed from the room's
 * actual floor-polygon bounding box rather than a fixed constant. The base
 * offset is scaled by the room's larger horizontal extent so a big or elongated
 * room is framed from farther back — showing the whole floor on the first frame
 * — while small/typical rooms keep their original framing (#291). The viewing
 * direction/angle is preserved (the offset is scaled uniformly).
 */
export function initialCameraPosition(floor: Point[], center: Point): [number, number, number] {
  const b = polygonBounds(floor);
  const extent = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, extent / REFERENCE_EXTENT));
  return [
    center.x + BASE_OFFSET.x * scale,
    BASE_OFFSET.y * scale,
    center.z + BASE_OFFSET.z * scale,
  ];
}
