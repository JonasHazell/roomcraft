import type { Point } from '../types';
import { polygonBounds, signedArea } from './polygon';

/**
 * A starting floor plan the user can pick when creating a room instead of
 * drawing the outline by hand. Each template is a closed, axis-parallel polygon
 * (metres, centred on the origin) that is fed straight into
 * `commitExteriorPolygon`, so it must satisfy the same rules as a hand-drawn
 * outline (see `validateExteriorLoop`). Everything stays fully editable
 * afterwards — a template is only a head start.
 */
export interface RoomTemplate {
  id: string;
  name: string;
  /** Short human blurb, e.g. the approximate area. */
  detail: string;
  /** The exterior outline, centred on the origin. */
  points: Point[];
}

/** A rectangle of width × depth (metres), centred on the origin. */
function rect(width: number, depth: number): Point[] {
  const hw = width / 2;
  const hd = depth / 2;
  return [
    { x: -hw, z: -hd },
    { x: hw, z: -hd },
    { x: hw, z: hd },
    { x: -hw, z: hd },
  ];
}

/** Human-readable area of a template outline, e.g. "≈ 12 m²". */
export function templateArea(points: Point[]): string {
  const m2 = Math.abs(signedArea(points));
  return `≈ ${Math.round(m2)} m²`;
}

/**
 * A tiny library of common room shapes and sizes. Rectangles cover the usual
 * small/medium/large cases; the L-shape covers the most common non-rectangular
 * plan. Sizes are approximate on purpose — the outline is the starting point,
 * not a measured room.
 */
export const ROOM_TEMPLATES: RoomTemplate[] = [
  { id: 'small', name: 'Small room', detail: '3.0 × 3.0 m · ≈ 9 m²', points: rect(3, 3) },
  { id: 'bedroom', name: 'Bedroom', detail: '3.0 × 4.0 m · ≈ 12 m²', points: rect(3, 4) },
  { id: 'living', name: 'Living room', detail: '4.0 × 5.0 m · ≈ 20 m²', points: rect(4, 5) },
  { id: 'large', name: 'Large room', detail: '5.0 × 6.0 m · ≈ 30 m²', points: rect(5, 6) },
  {
    id: 'l-shape',
    name: 'L-shaped room',
    detail: '5.0 × 5.0 m · ≈ 19 m²',
    // A 5×5 plan with a 2.5×2.5 corner removed.
    points: [
      { x: -2.5, z: -2.5 },
      { x: 2.5, z: -2.5 },
      { x: 2.5, z: 0 },
      { x: 0, z: 0 },
      { x: 0, z: 2.5 },
      { x: -2.5, z: 2.5 },
    ],
  },
];

/**
 * A small SVG path (`d` attribute) for a template's outline, normalised into a
 * `size × size` box with `pad` breathing room — used for the preview thumbnails
 * in the template picker. Purely presentational; no bearing on the real plan.
 */
export function templatePath(points: Point[], size = 40, pad = 4): string {
  const b = polygonBounds(points);
  const w = b.maxX - b.minX || 1;
  const h = b.maxZ - b.minZ || 1;
  const scale = Math.min((size - pad * 2) / w, (size - pad * 2) / h);
  const offX = (size - w * scale) / 2;
  const offZ = (size - h * scale) / 2;
  return (
    points
      .map((p, i) => {
        const x = offX + (p.x - b.minX) * scale;
        const y = offZ + (p.z - b.minZ) * scale;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ') + ' Z'
  );
}
