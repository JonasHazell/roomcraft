import type { Design, Point } from '../src/types.ts';
import { FURNITURE_CATALOG } from '../src/lib/furnitureCatalog.ts';
import { floorPolygon, pointInPolygon, polygonBounds } from '../src/lib/polygon.ts';
import { accessZone, convexOverlap, doorClearanceZones, footprint, interiorWallQuad } from './geom.ts';
import type { ResolvedFurniture } from './schema.ts';

/** Rutstorlek för nåbarhetsrastret, meter. */
const CELL = 0.1;

/**
 * Möbler som får överlappa varandra utan att flaggas:
 * mattor får ligga under allt, och stolar får skjutas in under bord/arbetsytor.
 */
function overlapAllowed(a: ResolvedFurniture, b: ResolvedFurniture): boolean {
  if (a.kind === 'rug' || b.kind === 'rug') return true;
  const kinds = [a.kind, b.kind];
  if (kinds.includes('chair') && (kinds.includes('table') || kinds.includes('box'))) return true;
  return false;
}

/** Fel för möbler som överlappar varandra (utöver tillåtna undantag). */
export function overlapErrors(furniture: ResolvedFurniture[], title: string): string[] {
  const errors: string[] = [];
  for (let i = 0; i < furniture.length; i++) {
    for (let j = i + 1; j < furniture.length; j++) {
      const a = furniture[i];
      const b = furniture[j];
      if (overlapAllowed(a, b)) continue;
      if (convexOverlap(footprint(a, 0.03), footprint(b, 0.03))) {
        errors.push(
          `Förslag "${title}": "${a.name}" och "${b.name}" överlappar varandra.`,
        );
      }
    }
  }
  return errors;
}

/**
 * Fel för möbler vars åtkomstzon inte går att nå till fots från en dörr.
 * Rastrerar golvet, blockerar celler under solida möbler och innerväggar, och
 * flood-fillar det fria golvet från dörrarnas frizoner. En daglig-möbel är OK om
 * någon cell i dess åtkomstzon nås av flödet.
 */
export function reachabilityErrors(
  furniture: ResolvedFurniture[],
  design: Design,
  title: string,
): string[] {
  const floor = floorPolygon(design.walls);
  const zones = doorClearanceZones(design);
  if (zones.length === 0) return []; // Ingen dörr att gå in genom — hoppa över.

  const b = polygonBounds(floor);
  const cols = Math.max(1, Math.ceil((b.maxX - b.minX) / CELL));
  const rows = Math.max(1, Math.ceil((b.maxZ - b.minZ) / CELL));
  const center = (c: number, r: number): Point => ({
    x: b.minX + (c + 0.5) * CELL,
    z: b.minZ + (r + 0.5) * CELL,
  });

  const blockers = [
    ...furniture.filter((f) => FURNITURE_CATALOG[f.kind].blocks).map((f) => footprint(f, -0.01)),
    ...design.walls.filter((w) => w.kind === 'interior').map(interiorWallQuad),
  ];

  const idx = (c: number, r: number) => r * cols + c;
  const free = new Uint8Array(cols * rows);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const p = center(c, r);
      if (!pointInPolygon(p, floor)) continue;
      if (blockers.some((q) => pointInPolygon(p, q))) continue;
      free[idx(c, r)] = 1;
    }
  }

  // Flödet startar i alla fria celler inne i en dörrs frizon.
  const reached = new Uint8Array(cols * rows);
  const queue: number[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (!free[idx(c, r)] || reached[idx(c, r)]) continue;
      const p = center(c, r);
      if (zones.some((z) => pointInPolygon(p, z.quad))) {
        reached[idx(c, r)] = 1;
        queue.push(idx(c, r));
      }
    }
  }
  if (queue.length === 0) return []; // Dörrsvep blockerat — flaggas separat i validate.

  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    const c = cell % cols;
    const r = (cell - c) / cols;
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const ni = idx(nc, nr);
      if (free[ni] && !reached[ni]) {
        reached[ni] = 1;
        queue.push(ni);
      }
    }
  }

  const errors: string[] = [];
  for (const f of furniture) {
    const zone = accessZone(f);
    if (!zone) continue;
    let ok = false;
    for (let c = 0; c < cols && !ok; c++) {
      for (let r = 0; r < rows && !ok; r++) {
        if (reached[idx(c, r)] && pointInPolygon(center(c, r), zone)) ok = true;
      }
    }
    if (!ok) {
      errors.push(
        `Förslag "${title}": "${f.name}" går inte att nå — framför den saknas ` +
          `${FURNITURE_CATALOG[f.kind].accessDepth} m fri yta med gångväg från en dörr ` +
          `(den är instängd bakom andra möbler eller väggar).`,
      );
    }
  }
  return errors;
}
