import type { Point, Wall } from '../types';

/** Rutnät för snappning i 2D-editorn, meter. */
export const GRID = 0.1;
/** Väggtjocklek, meter. */
export const WALL_T = 0.12;

const EPS = 1e-6;

/** Rundar bort flyttalsbrus till mm-precision. */
function roundCoord(v: number): number {
  return Math.round(v * 1000) / 1000;
}

export function snap(v: number, grid = GRID): number {
  return roundCoord(Math.round(v / grid) * grid);
}

export function snapPoint(p: Point, grid = GRID): Point {
  return { x: snap(p.x, grid), z: snap(p.z, grid) };
}

/** Låser p till samma x- eller z-linje som prev (den minsta delta-komponenten nollas). */
export function axisLock(prev: Point, p: Point): Point {
  const dx = p.x - prev.x;
  const dz = p.z - prev.z;
  return Math.abs(dx) >= Math.abs(dz) ? { x: p.x, z: prev.z } : { x: prev.x, z: p.z };
}

/** Snappavstånd till redan utplacerade hörn i 2D-editorn, meter. */
export const CORNER_SNAP = 0.25;

/**
 * Snappar p:s fria koordinat (x om segmentet är vågrätt, annars z) till
 * närmsta hörnkoordinat inom tol. Returnerar hörnet som styrde snappningen
 * (för hjälplinje i UI:t) eller null om inget hörn låg inom tolerans.
 */
export function snapToCornerAxis(
  p: Point,
  corners: Point[],
  horizontal: boolean,
  tol = CORNER_SNAP,
): { point: Point; guide: Point | null } {
  let guide: Point | null = null;
  let best = tol;
  for (const c of corners) {
    const d = horizontal ? Math.abs(c.x - p.x) : Math.abs(c.z - p.z);
    if (d < best) {
      best = d;
      guide = c;
    }
  }
  if (!guide) return { point: p, guide: null };
  return {
    point: horizontal ? { x: guide.x, z: p.z } : { x: p.x, z: guide.z },
    guide,
  };
}

export function dist(p: Point, q: Point): number {
  return Math.hypot(q.x - p.x, q.z - p.z);
}

export function pointsEqual(p: Point, q: Point): boolean {
  return Math.abs(p.x - q.x) < EPS && Math.abs(p.z - q.z) < EPS;
}

/** Shoelace-summa i (x,z); positiv för kanonisk winding. */
export function signedArea(poly: Point[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    sum += p.x * q.z - q.x * p.z;
  }
  return sum / 2;
}

/** Vänder punktordningen vid behov så att shoelace-summan blir positiv. */
export function normalizeWinding(points: Point[]): Point[] {
  return signedArea(points) < 0 ? [...points].reverse() : points;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function polygonBounds(poly: Point[]): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX, maxX, minZ, maxZ };
}

/** Bbox-mitt — bra nog som kameramål och scencentrum. */
export function polygonCenter(poly: Point[]): Point {
  const b = polygonBounds(poly);
  return { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
}

/** Even-odd ray casting i (x,z)-planet. */
export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function closestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < EPS) return a;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / lenSq));
  return { x: a.x + t * dx, z: a.z + t * dz };
}

/**
 * Inuti → p oförändrad; annars närmsta randpunkt, knuffad 0,01 m in längs
 * kantens inåtnormal (-dz, dx) så att resultatet hamnar strikt innanför.
 */
export function clampToPolygon(p: Point, poly: Point[]): Point {
  if (poly.length < 3 || pointInPolygon(p, poly)) return p;
  let best: Point = poly[0];
  let bestDist = Infinity;
  let bestEdge = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const c = closestPointOnSegment(p, a, b);
    const d = dist(p, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
      bestEdge = i;
    }
  }
  const a = poly[bestEdge];
  const b = poly[(bestEdge + 1) % poly.length];
  const len = dist(a, b) || 1;
  const nx = -(b.z - a.z) / len;
  const nz = (b.x - a.x) / len;
  return { x: best.x + nx * 0.01, z: best.z + nz * 0.01 };
}

// ---- Väggsegment ----

/** Normaliserad riktning a→b. */
export function wallDir(w: Pick<Wall, 'a' | 'b'>): Point {
  const len = dist(w.a, w.b) || 1;
  return { x: (w.b.x - w.a.x) / len, z: (w.b.z - w.a.z) / len };
}

export function wallLen(w: Pick<Wall, 'a' | 'b'>): number {
  return dist(w.a, w.b);
}

/** Utåtnormal för yttervägg i kanonisk (positiv) winding: (dz, -dx). */
export function outwardNormal(w: Pick<Wall, 'a' | 'b'>): Point {
  const d = wallDir(w);
  return { x: d.z + 0, z: -d.x + 0 }; // + 0 normaliserar bort -0
}

export function wallMidpoint(w: Pick<Wall, 'a' | 'b'>): Point {
  return { x: (w.a.x + w.b.x) / 2, z: (w.a.z + w.b.z) / 2 };
}

export function isAxisParallel(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < EPS || Math.abs(a.z - b.z) < EPS;
}

/** Golvpolygonen: ytterväggarnas startpunkter i slingordning. */
export function floorPolygon(walls: Wall[]): Point[] {
  return walls.filter((w) => w.kind === 'exterior').map((w) => w.a);
}

function orient(p: Point, q: Point, r: Point): number {
  const v = (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  return Math.abs(v) < EPS ? 0 : Math.sign(v);
}

function onSegment(p: Point, q: Point, r: Point): boolean {
  return (
    Math.min(p.x, r.x) - EPS <= q.x &&
    q.x <= Math.max(p.x, r.x) + EPS &&
    Math.min(p.z, r.z) - EPS <= q.z &&
    q.z <= Math.max(p.z, r.z) + EPS
  );
}

/** Sant om segmenten skär eller rör vid varandra (inkl. kolinjär överlappning). */
export function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const o1 = orient(p1, p2, p3);
  const o2 = orient(p1, p2, p4);
  const o3 = orient(p3, p4, p1);
  const o4 = orient(p3, p4, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;
  return false;
}

export type LoopValidation = { ok: true } | { ok: false; reason: string };

/**
 * Validerar att ytterväggarna bildar en sluten, enkel, axelparallell slinga
 * med kanonisk (positiv) winding. Svenska felmeddelanden för UI:t.
 */
export function validateExteriorLoop(walls: Pick<Wall, 'a' | 'b'>[]): LoopValidation {
  const n = walls.length;
  if (n < 4) return { ok: false, reason: 'Konturen måste ha minst fyra hörn.' };
  for (const w of walls) {
    if (!isAxisParallel(w.a, w.b)) {
      return { ok: false, reason: 'Väggarna måste vara vågräta eller lodräta.' };
    }
    if (wallLen(w) < GRID - EPS) {
      return { ok: false, reason: 'En vägg är för kort (minst 10 cm).' };
    }
  }
  for (let i = 0; i < n; i++) {
    if (!pointsEqual(walls[i].b, walls[(i + 1) % n].a)) {
      return { ok: false, reason: 'Konturen är inte sluten.' };
    }
  }
  // Grannar får inte vika tillbaka längs samma linje.
  for (let i = 0; i < n; i++) {
    const d1 = wallDir(walls[i]);
    const d2 = wallDir(walls[(i + 1) % n]);
    const cross = d1.x * d2.z - d1.z * d2.x;
    const dot = d1.x * d2.x + d1.z * d2.z;
    if (Math.abs(cross) < EPS && dot < 0) {
      return { ok: false, reason: 'Väggarna korsar varandra.' };
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      if (segmentsIntersect(walls[i].a, walls[i].b, walls[j].a, walls[j].b)) {
        return { ok: false, reason: 'Väggarna korsar varandra.' };
      }
    }
  }
  if (signedArea(walls.map((w) => w.a)) <= 0) {
    return { ok: false, reason: 'Konturen är inte sluten.' };
  }
  return { ok: true };
}

/** Bygger ytterväggskedjan från en sluten punktlista (sista → första sluter). */
export function wallsFromPolygon(points: Point[], idFactory: () => string): Wall[] {
  return points.map((a, i) => ({
    id: idFactory(),
    kind: 'exterior' as const,
    a,
    b: points[(i + 1) % points.length],
  }));
}

/**
 * Hörnfyllnad: hur mycket vägg i:s extruderade längd ska justeras vid sitt
 * slut (hörnet mot nästa vägg). Konvext hörn +t, konkavt −t, kolinjärt 0.
 * Starten justeras aldrig — varje hörn hanteras av sin inkommande vägg, vilket
 * tätar ytterbandet utan överlapp och lämnar u = 0 (öppnings-offset) orörd.
 */
export function exteriorEndExtension(walls: Wall[], i: number, t = WALL_T): number {
  const exterior = walls.filter((w) => w.kind === 'exterior');
  const idx = exterior.indexOf(walls[i]);
  if (idx === -1) return 0;
  const d1 = wallDir(exterior[idx]);
  const d2 = wallDir(exterior[(idx + 1) % exterior.length]);
  const cross = d1.x * d2.z - d1.z * d2.x;
  if (cross > EPS) return t;
  if (cross < -EPS) return -t;
  return 0;
}

/** UI-etikett: väggarna numreras per sort i arrayordning. */
export function wallLabel(walls: Wall[], id: string): string {
  const wall = walls.find((w) => w.id === id);
  if (!wall) return 'Vägg';
  const siblings = walls.filter((w) => w.kind === wall.kind);
  const idx = siblings.indexOf(wall) + 1;
  return `${wall.kind === 'exterior' ? 'Yttervägg' : 'Innervägg'} ${idx}`;
}

export function formatCm(v: number): string {
  return `${Math.round(v * 100).toLocaleString('sv-SE')} cm`;
}
