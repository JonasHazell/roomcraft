import { DEFAULT_FLOOR_COLOR, DEFAULT_WALL_COLOR, isHexColor } from '../src/types.ts';
import type { Design, Point, Wall } from '../src/types.ts';
import {
  closestPointOnSegment,
  dist,
  floorPolygon,
  outwardNormal,
  polygonCenter,
} from '../src/lib/polygon.ts';
import type { AiFurniture, AiProposals, ResolvedFurniture, ResolvedProposals } from './schema.ts';

const HALF_PI = Math.PI / 2;

/** Structured output can't enforce a colour format, so clamp anything malformed to a fallback. */
function safeColor(c: string, fallback: string): string {
  return isHexColor(c) ? c : fallback;
}

/** Snaps an angle to the nearest quarter turn. */
function snap90(theta: number): number {
  return Math.round(theta / HALF_PI) * HALF_PI;
}

/** rotationY such that the front (local +z) points along dir. Inverse of frontDir(). */
function rotationForFront(dir: Point): number {
  return Math.atan2(dir.x, dir.z);
}

function normalize(v: Point): Point | null {
  const len = Math.hypot(v.x, v.z);
  if (len < 1e-6) return null;
  return { x: v.x / len, z: v.z / len };
}

/** The wall normal pointing into the room on the furniture's side (away from the wall). */
function inwardNormal(wall: Wall, pos: Point, fallback: Point): Point {
  const n = outwardNormal(wall);
  const foot = closestPointOnSegment(pos, wall.a, wall.b);
  let s = Math.sign((pos.x - foot.x) * n.x + (pos.z - foot.z) * n.z);
  if (s === 0) s = Math.sign(fallback.x * n.x + fallback.z * n.z) || 1;
  return { x: n.x * s, z: n.z * s };
}

/**
 * Picks the wall the furniture's back should stand against: nearest first, but
 * only walls whose inward normal reasonably matches the desired front direction
 * (so a wardrobe in a corner gets its back against the right one of the two
 * walls given `facing`).
 */
function pickBackWall(design: Design, pos: Point, desired: Point): Wall | null {
  const walls = [...design.walls].sort(
    (a, b) =>
      dist(pos, closestPointOnSegment(pos, a.a, a.b)) -
      dist(pos, closestPointOnSegment(pos, b.a, b.b)),
  );
  for (const w of walls) {
    const inward = inwardNormal(w, pos, desired);
    if (inward.x * desired.x + inward.z * desired.z >= -0.1) return w;
  }
  return walls[0] ?? null;
}

/** Resolves an AI furniture item's intent into a concrete rotation and (at a wall) flush position. */
function resolveFurniture(f: AiFurniture, design: Design, roomCenter: Point): ResolvedFurniture {
  const pos: Point = { x: f.x, z: f.z };
  const desired =
    normalize({ x: f.facing.x - pos.x, z: f.facing.z - pos.z }) ??
    normalize({ x: roomCenter.x - pos.x, z: roomCenter.z - pos.z }) ??
    ({ x: 0, z: 1 } as Point);

  let rotationY: number;
  let x = f.x;
  let z = f.z;

  const wall = f.againstWall ? pickBackWall(design, pos, desired) : null;
  if (wall) {
    const inward = inwardNormal(wall, pos, desired);
    rotationY = snap90(rotationForFront(inward));
    // Snap the back flush against the wall: foot on the wall line + half the depth inward.
    const foot = closestPointOnSegment(pos, wall.a, wall.b);
    const gap = 0.02;
    x = foot.x + inward.x * (f.size.depth / 2 + gap);
    z = foot.z + inward.z * (f.size.depth / 2 + gap);
  } else {
    rotationY = snap90(rotationForFront(desired));
  }

  return {
    kind: f.kind,
    name: f.name,
    x,
    z,
    rotationY,
    size: f.size,
    elevation: f.elevation,
    color: safeColor(f.color, '#b0a795'),
    reasoning: f.reasoning,
  };
}

/** Resolves the furniture of all proposals (facing/againstWall → rotationY + x/z). */
export function resolveProposals(data: AiProposals, design: Design): ResolvedProposals {
  const roomCenter = polygonCenter(floorPolygon(design.walls));
  return {
    proposals: data.proposals.map((p) => ({
      title: p.title,
      concept: p.concept,
      floorColor: safeColor(p.floorColor, DEFAULT_FLOOR_COLOR),
      wallColor: safeColor(p.wallColor, DEFAULT_WALL_COLOR),
      furniture: p.furniture.map((f) => resolveFurniture(f, design, roomCenter)),
    })),
  };
}
