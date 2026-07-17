/**
 * Radius (in metres, from the piece's centre) of the furniture rotation-handle
 * ring. Sized off the footprint's larger half-extent plus a grab margin.
 *
 * Coarse (touch) pointers get a wider margin so the handle stays an easy target
 * on a finger, mirroring the plan editor's corner handle, which uses the same
 * 0.34 / 0.22 coarse/fine split (see PlanCorners.tsx).
 */
export function rotateHandleRadius(width: number, depth: number, coarse: boolean): number {
  return Math.max(width, depth) / 2 + (coarse ? 0.34 : 0.22);
}
