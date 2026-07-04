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

/** Snäpper en vinkel till närmaste kvartsvarv. */
function snap90(theta: number): number {
  return Math.round(theta / HALF_PI) * HALF_PI;
}

/** rotationY så att framsidan (lokal +z) pekar längs dir. Invers av frontDir(). */
function rotationForFront(dir: Point): number {
  return Math.atan2(dir.x, dir.z);
}

function normalize(v: Point): Point | null {
  const len = Math.hypot(v.x, v.z);
  if (len < 1e-6) return null;
  return { x: v.x / len, z: v.z / len };
}

/** Väggnormalen som pekar in mot rummet på möbelns sida (bort från väggen). */
function inwardNormal(wall: Wall, pos: Point, fallback: Point): Point {
  const n = outwardNormal(wall);
  const foot = closestPointOnSegment(pos, wall.a, wall.b);
  let s = Math.sign((pos.x - foot.x) * n.x + (pos.z - foot.z) * n.z);
  if (s === 0) s = Math.sign(fallback.x * n.x + fallback.z * n.z) || 1;
  return { x: n.x * s, z: n.z * s };
}

/**
 * Väljer väggen möbelns rygg ska stå mot: närmast först, men bara sådana vars
 * inåtnormal hyfsat matchar den önskade framriktningen (så en garderob i ett hörn
 * får ryggen mot rätt av de två väggarna givet `facing`).
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

/** Löser upp en AI-möbels avsikt till konkret rotation och (vid vägg) flush-position. */
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
    // Snäpp ryggen dikt mot väggen: fot på vägglinjen + inåt halva djupet.
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
    color: f.color,
    reasoning: f.reasoning,
  };
}

/** Löser upp alla förslags möbler (facing/againstWall → rotationY + x/z). */
export function resolveProposals(data: AiProposals, design: Design): ResolvedProposals {
  const roomCenter = polygonCenter(floorPolygon(design.walls));
  return {
    proposals: data.proposals.map((p) => ({
      title: p.title,
      concept: p.concept,
      furniture: p.furniture.map((f) => resolveFurniture(f, design, roomCenter)),
    })),
  };
}
