import type { Design, FurnitureItem, FurnitureKind, Point } from '../../types';
import { FURNITURE_CATALOG } from '../furnitureCatalog';
import { floorPolygon, formatCm, pointInPolygon, polygonBounds, polygonCenter, signedArea } from '../polygon';
import {
  add,
  blockers,
  clearanceZones,
  convexOverlap,
  distToQuad,
  dot,
  erodedGrid,
  floodFill,
  footprint,
  frontDir,
  nearestWall,
  norm,
  openingInfos,
  quadGap,
  rightDir,
  segmentHitsQuad,
  stripZone,
  sub,
  support,
  wallsHitQuad,
  type OpeningInfo,
} from './geo';

export type RuleCategory =
  | 'Säkerhet'
  | 'Tillgänglighet'
  | 'Ergonomi & mått'
  | 'Feng shui'
  | 'Ljus'
  | 'Färg & textil'
  | 'Akustik'
  | 'Estetik';

export const CATEGORY_ORDER: RuleCategory[] = [
  'Säkerhet',
  'Tillgänglighet',
  'Ergonomi & mått',
  'Feng shui',
  'Ljus',
  'Färg & textil',
  'Akustik',
  'Estetik',
];

export type RoomType = 'sovrum' | 'vardagsrum' | 'hemmakontor' | 'matplats';

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  sovrum: 'Sovrum',
  vardagsrum: 'Vardagsrum',
  hemmakontor: 'Hemmakontor',
  matplats: 'Matplats',
};

/** Poängvikt per viktighetsnivå enligt regelkatalogen. */
export const IMPORTANCE_WEIGHT: Record<number, number> = { 5: 16, 4: 8, 3: 4, 2: 2, 1: 1 };

export interface Violation {
  message: string;
  /** Möbler som markeras i 3D-vyn när felet väljs. */
  furnitureIds: string[];
  /** Golvzoner (polygoner) som markeras i 3D-vyn. */
  zones?: Point[][];
}

export type RuleOutcome =
  | { status: 'not-applicable' }
  | { status: 'passed' }
  | { status: 'violated'; violations: Violation[] };

export interface RuleCtx {
  design: Design;
  poly: Point[];
  roomTypes: Set<RoomType>;
  doors: OpeningInfo[];
  windows: OpeningInfo[];
  byKind: (k: FurnitureKind) => FurnitureItem[];
}

export interface RuleDef {
  id: string;
  title: string;
  category: RuleCategory;
  importance: 1 | 2 | 3 | 4 | 5;
  source: string;
  /** Länkad dubblettregel (t.ex. FEN-03 för ERG-08): redovisas i båda kategorierna, räknas en gång i totalen. */
  twin?: { id: string; category: RuleCategory };
  /** Rumstyper regeln kräver; utelämnad = alla rum. */
  appliesTo?: RoomType[];
  check: (ctx: RuleCtx) => RuleOutcome;
}

/** Härleder rumstyper från möbleringen (blandrum kan ge flera). */
export function inferRoomTypes(design: Design): Set<RoomType> {
  const kinds = new Set(design.furniture.map((f) => f.kind));
  const types = new Set<RoomType>();
  if (kinds.has('bed')) types.add('sovrum');
  if (kinds.has('sofa')) types.add('vardagsrum');
  if (kinds.has('desk')) types.add('hemmakontor');
  if (design.furniture.some(isDiningTable) && kinds.has('chair')) types.add('matplats');
  return types;
}

const na: RuleOutcome = { status: 'not-applicable' };
const ok: RuleOutcome = { status: 'passed' };
function fail(violations: Violation[]): RuleOutcome {
  return violations.length > 0 ? { status: 'violated', violations } : ok;
}

function isDiningTable(f: FurnitureItem): boolean {
  return f.kind === 'table' && f.size.height >= 0.6 && f.size.height <= 0.9;
}

function isCoffeeTable(f: FurnitureItem): boolean {
  return f.kind === 'table' && f.size.height < 0.6;
}

function topOf(f: FurnitureItem): number {
  return f.elevation + f.size.height;
}

/** Bakkantens mittpunkt (motsatt framsidan). */
function backEdgeMid(f: FurnitureItem): Point {
  return add(f.position, frontDir(f.rotationY), -f.size.depth / 2);
}

/** Sant om möbelns baksida står dikt an (≤ tol) mot en vägg. */
function backAgainstWall(design: Design, f: FurnitureItem, tol = 0.18) {
  const hit = nearestWall(design, backEdgeMid(f));
  return hit && hit.distance <= tol ? hit.wall : null;
}

/** Zon längs en av möbelns långsidor (side = ±1 längs höger-axeln), depth utåt. */
function sideZone(f: FurnitureItem, side: 1 | -1, depth: number): Point[] {
  const fwd = frontDir(f.rotationY);
  const right = rightDir(f.rotationY);
  const n = { x: right.x * side, z: right.z * side };
  const edgeMid = add(f.position, n, f.size.width / 2);
  const s = add(edgeMid, fwd, -f.size.depth / 2);
  const e = add(edgeMid, fwd, f.size.depth / 2);
  return stripZone(s, e, n, depth);
}

/** Zon framför möbelns framsida, lika bred som möbeln. */
function frontZone(f: FurnitureItem, depth: number): Point[] {
  const fwd = frontDir(f.rotationY);
  const right = rightDir(f.rotationY);
  const faceMid = add(f.position, fwd, f.size.depth / 2);
  const s = add(faceMid, right, -f.size.width / 2);
  const e = add(faceMid, right, f.size.width / 2);
  return stripZone(s, e, fwd, depth);
}

/** Blockerande möbler som överlappar zonen. */
function blockersInZone(
  ctx: RuleCtx,
  zone: Point[],
  except: Set<string> = new Set(),
  minTop = 0,
): FurnitureItem[] {
  return blockers(ctx.design.furniture, except).filter(
    (f) => topOf(f) > minTop && convexOverlap(footprint(f), zone),
  );
}

function names(items: FurnitureItem[]): string {
  return items.map((f) => `"${f.name}"`).join(', ');
}

// ---------------------------------------------------------------------------
// Regler
// ---------------------------------------------------------------------------

export const RULES: RuleDef[] = [
  // ---- Nivå 5: Säkerhet ----
  {
    id: 'SAK-02',
    title: 'Dörrar ska kunna öppnas helt',
    category: 'Säkerhet',
    importance: 5,
    source: 'BBR 5:3',
    check(ctx) {
      if (ctx.doors.length === 0) return na;
      const violations: Violation[] = [];
      for (const door of ctx.doors) {
        for (const zone of clearanceZones(door, 0.8)) {
          const inWay = ctx.design.furniture.filter(
            (f) =>
              f.kind !== 'rug' &&
              f.elevation < door.top &&
              convexOverlap(footprint(f), zone),
          );
          if (inWay.length > 0) {
            violations.push({
              message: `${names(inWay)} står i dörrens svepyta — flytta så att dörren kan öppnas helt (80 cm fritt).`,
              furnitureIds: inWay.map((f) => f.id),
              zones: [zone],
            });
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'SAK-01',
    title: 'Utrymningsväg får inte blockeras',
    category: 'Säkerhet',
    importance: 5,
    source: 'BBR 5:3, MSB',
    check(ctx) {
      if (ctx.doors.length === 0) return na;
      const spots = ctx.design.furniture.filter(
        (f) => f.kind === 'bed' || f.kind === 'sofa' || f.kind === 'desk' || isDiningTable(f),
      );
      if (spots.length === 0) return na;
      // 0,4 m erosion ⇒ fri passage ≈ 80 cm bred.
      const grid = erodedGrid(ctx.design, 0.4);
      const doorZones = ctx.doors.flatMap((d) => clearanceZones(d, 0.9));
      const reached = floodFill(grid, (p) => doorZones.some((z) => pointInPolygon(p, z)));
      const violations: Violation[] = [];
      for (const f of spots) {
        const quad = footprint(f);
        let okPath = false;
        for (let c = 0; c < grid.cols && !okPath; c++) {
          for (let r = 0; r < grid.rows && !okPath; r++) {
            if (reached[grid.idx(c, r)] && distToQuad(grid.center(c, r), quad) <= 0.9) {
              okPath = true;
            }
          }
        }
        if (!okPath) {
          violations.push({
            message: `Från "${f.name}" finns ingen fri väg (minst 80 cm bred) till en dörr — flytta möblerna som stänger inne den.`,
            furnitureIds: [f.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'SAK-03',
    title: 'Utrymningsfönster ska vara åtkomligt',
    category: 'Säkerhet',
    importance: 5,
    source: 'BBR 5:323',
    appliesTo: ['sovrum', 'vardagsrum'],
    check(ctx) {
      const escapeWindows = ctx.windows.filter((w) => w.sill <= 1.3);
      if (escapeWindows.length === 0) return na;
      const violations: Violation[] = [];
      for (const win of escapeWindows) {
        for (const zone of clearanceZones(win, 0.6)) {
          const inWay = blockersInZone(ctx, zone, new Set(), win.sill);
          if (inWay.length > 0) {
            violations.push({
              message: `${names(inWay)} blockerar utrymningsfönstret — håll 60 cm golvyta fri framför fönstret.`,
              furnitureIds: inWay.map((f) => f.id),
              zones: [zone],
            });
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'SAK-10',
    title: 'Tunga föremål inte ovanför liggande/sittande',
    category: 'Säkerhet',
    importance: 5,
    source: 'Best practice barnsäkerhet; Feng shui',
    twin: { id: 'FEN-06', category: 'Feng shui' },
    appliesTo: ['sovrum', 'vardagsrum'],
    check(ctx) {
      const resting = [...ctx.byKind('bed'), ...ctx.byKind('sofa')];
      if (resting.length === 0) return na;
      const hanging = ctx.design.furniture.filter((f) => f.elevation >= 0.5);
      if (hanging.length === 0) return ok;
      const violations: Violation[] = [];
      for (const rest of resting) {
        for (const h of hanging) {
          if (convexOverlap(footprint(h), footprint(rest))) {
            violations.push({
              message: `"${h.name}" hänger rakt ovanför "${rest.name}" — flytta den till en vägg utan säng/soffa under.`,
              furnitureIds: [h.id, rest.id],
            });
          }
        }
      }
      return fail(violations);
    },
  },

  // ---- Nivå 4: Tillgänglighet ----
  {
    id: 'TIL-02',
    title: 'Vändyta för rullstol (130 cm)',
    category: 'Tillgänglighet',
    importance: 4,
    source: 'SS 91 42 21, BBR 3:146',
    check(ctx) {
      if (ctx.design.furniture.length === 0) return na;
      const grid = erodedGrid(ctx.design, 0.65);
      for (let i = 0; i < grid.free.length; i++) {
        if (grid.free[i]) return ok;
      }
      return fail([
        {
          message:
            'Ingen fri vändcirkel på 130 cm ryms i rummet — flytta eller ta bort möbler för att öppna en sammanhängande golvyta.',
          furnitureIds: [],
        },
      ]);
    },
  },
  {
    id: 'TIL-05',
    title: 'Åtkomst runt sängen',
    category: 'Tillgänglighet',
    importance: 4,
    source: 'SS 91 42 21',
    appliesTo: ['sovrum'],
    check(ctx) {
      const beds = ctx.byKind('bed');
      if (beds.length === 0) return na;
      const violations: Violation[] = [];
      for (const bed of beds) {
        const double = bed.size.width >= 1.35;
        const except = new Set(ctx.byKind('nightstand').map((f) => f.id));
        const sideFree = ([-1, 1] as const).map((side) => {
          const zone = sideZone(bed, side, 0.6);
          return !wallsHitQuad(ctx.design, zone) && blockersInZone(ctx, zone, except).length === 0
            ? null
            : zone;
        });
        const blockedCount = sideFree.filter(Boolean).length;
        if ((double && blockedCount > 0) || (!double && blockedCount === 2)) {
          violations.push({
            message: double
              ? `Dubbelsängen "${bed.name}" behöver 60 cm fritt längs båda långsidorna — nu är ${blockedCount === 2 ? 'båda sidorna' : 'ena sidan'} blockerad.`
              : `Sängen "${bed.name}" behöver 60 cm fritt längs minst en långsida.`,
            furnitureIds: [bed.id],
            zones: sideFree.filter((z): z is Point[] => z !== null),
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'TIL-06',
    title: 'Fri yta framför förvaring',
    category: 'Tillgänglighet',
    importance: 4,
    source: 'SS 91 42 21',
    check(ctx) {
      const storage = ctx.byKind('wardrobe');
      if (storage.length === 0) return na;
      const violations: Violation[] = [];
      for (const w of storage) {
        const zone = frontZone(w, 1.1);
        const inWay = blockersInZone(ctx, zone, new Set([w.id]));
        const wallHit = wallsHitQuad(ctx.design, zone);
        if (inWay.length > 0 || wallHit) {
          violations.push({
            message: `Framför "${w.name}" behövs 110 cm fri yta (öppen dörr + person) — ${
              inWay.length > 0 ? `${names(inWay)} står i vägen` : 'väggen är för nära'
            }.`,
            furnitureIds: [w.id, ...inWay.map((f) => f.id)],
            zones: [zone],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'TIL-07',
    title: 'Utrymme vid matplatsen',
    category: 'Tillgänglighet',
    importance: 4,
    source: 'SS 91 42 21, NKBA',
    appliesTo: ['matplats'],
    check(ctx) {
      const tables = ctx.design.furniture.filter(isDiningTable);
      const chairs = ctx.byKind('chair');
      if (tables.length === 0 || chairs.length === 0) return na;
      const violations: Violation[] = [];
      for (const table of tables) {
        const tQuad = footprint(table);
        for (const chair of chairs) {
          if (quadGap(footprint(chair), tQuad) > 0.35) continue; // inte vid det här bordet
          const away = norm(sub(chair.position, table.position));
          // Från bordskanten ska det finnas 70 cm bakåt (stol + resa sig).
          const edgeReach = support(tQuad.map((p) => sub(p, table.position)), away);
          const s1 = add(add(table.position, away, edgeReach), rightDir(chair.rotationY), -0.3);
          const s2 = add(add(table.position, away, edgeReach), rightDir(chair.rotationY), 0.3);
          const zone = stripZone(s1, s2, away, 0.7);
          const inWay = blockersInZone(ctx, zone, new Set([table.id, ...chairs.map((c) => c.id)]));
          if (wallsHitQuad(ctx.design, zone) || inWay.length > 0) {
            violations.push({
              message: `Bakom stolen "${chair.name}" finns mindre än 70 cm till ${
                inWay.length > 0 ? names(inWay) : 'väggen'
              } — dra bordet åt andra hållet eller ta bort sittplatsen.`,
              furnitureIds: [chair.id, ...inWay.map((f) => f.id)],
              zones: [zone],
            });
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'TIL-11',
    title: 'Fönster ska kunna öppnas och nås',
    category: 'Tillgänglighet',
    importance: 4,
    source: 'BBR 6:253',
    check(ctx) {
      if (ctx.windows.length === 0) return na;
      const violations: Violation[] = [];
      for (const win of ctx.windows) {
        for (const zone of clearanceZones(win, 0.2)) {
          const inWay = ctx.design.furniture.filter(
            (f) =>
              f.kind !== 'rug' &&
              f.size.depth > 0.6 &&
              topOf(f) > win.sill &&
              convexOverlap(footprint(f), zone),
          );
          if (inWay.length > 0) {
            violations.push({
              message: `${names(inWay)} står dikt an mot fönstret — djupa möbler hindrar att det öppnas för vädring.`,
              furnitureIds: inWay.map((f) => f.id),
              zones: [zone],
            });
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'TIL-13',
    title: 'Rummet får inte övermöbleras',
    category: 'Tillgänglighet',
    importance: 4,
    source: 'Best practice; feng shui (fritt chi-flöde)',
    check(ctx) {
      if (ctx.design.furniture.length === 0) return na;
      const roomArea = Math.abs(signedArea(ctx.poly));
      if (roomArea < 0.5) return na;
      const used = ctx.design.furniture
        .filter((f) => f.kind !== 'rug' && f.elevation < 0.5)
        .reduce((sum, f) => sum + f.size.width * f.size.depth, 0);
      const freePct = Math.max(0, Math.round((1 - used / roomArea) * 100));
      if (freePct >= 40) return ok;
      return fail([
        {
          message: `Rummet har bara ca ${freePct} % fri golvyta (riktvärde ≥ 40 %) — ta bort eller förminska möbler.`,
          furnitureIds: [],
        },
      ]);
    },
  },

  // ---- Nivå 3: Ergonomi & feng shui-placering ----
  {
    id: 'ERG-01',
    title: 'Avstånd soffa–soffbord',
    category: 'Ergonomi & mått',
    importance: 3,
    source: 'Best practice (NKBA)',
    appliesTo: ['vardagsrum'],
    check(ctx) {
      const sofas = ctx.byKind('sofa');
      const coffee = ctx.design.furniture.filter(isCoffeeTable);
      if (sofas.length === 0 || coffee.length === 0) return na;
      const violations: Violation[] = [];
      for (const sofa of sofas) {
        const fwd = frontDir(sofa.rotationY);
        const near = coffee
          .filter((t) => dot(sub(t.position, sofa.position), fwd) > 0)
          .map((t) => ({ t, gap: quadGap(footprint(sofa), footprint(t)) }))
          .filter(({ gap }) => gap < 2)
          .sort((a, b) => a.gap - b.gap)[0];
        if (!near) continue;
        if (near.gap < 0.3 || near.gap > 0.45) {
          violations.push({
            message: `Justera "${near.t.name}" till 30–45 cm från soffans framkant (nu ${formatCm(near.gap)}).`,
            furnitureIds: [sofa.id, near.t.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'ERG-02',
    title: 'TV-avstånd',
    category: 'Ergonomi & mått',
    importance: 3,
    source: 'SMPTE/THX',
    appliesTo: ['vardagsrum', 'sovrum'],
    check(ctx) {
      const tvs = ctx.byKind('tv');
      const seats = [...ctx.byKind('sofa'), ...ctx.byKind('bed')];
      if (tvs.length === 0 || seats.length === 0) return na;
      const violations: Violation[] = [];
      for (const tv of tvs) {
        const diagonal = (tv.size.width * 0.92) / 0.87; // skärmbredd → diagonal (16:9)
        const min = 1.2 * diagonal;
        const max = 2.6 * diagonal; // 1,6× för 4K, upp till ~2,5× för HD
        const nearest = seats
          .map((s) => ({ s, d: Math.hypot(s.position.x - tv.position.x, s.position.z - tv.position.z) }))
          .sort((a, b) => a.d - b.d)[0];
        if (nearest.d < min || nearest.d > max) {
          violations.push({
            message: `Sittplatsen "${nearest.s.name}" står ${nearest.d.toFixed(1)} m från TV:n — riktvärdet för skärmbredden är ${min.toFixed(1)}–${max.toFixed(1)} m.`,
            furnitureIds: [tv.id, nearest.s.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'ERG-05',
    title: 'Soffans placering i rummet',
    category: 'Ergonomi & mått',
    importance: 3,
    source: 'Best practice; Feng shui',
    twin: { id: 'FEN-13', category: 'Feng shui' },
    appliesTo: ['vardagsrum'],
    check(ctx) {
      const sofas = ctx.byKind('sofa');
      if (sofas.length === 0) return na;
      const violations: Violation[] = [];
      for (const sofa of sofas) {
        if (backAgainstWall(ctx.design, sofa)) continue;
        // Fri passage bakom (rumsavdelare) accepteras också.
        const behind = stripZone(
          add(add(backEdgeMid(sofa), rightDir(sofa.rotationY), -sofa.size.width / 2), frontDir(sofa.rotationY), 0),
          add(add(backEdgeMid(sofa), rightDir(sofa.rotationY), sofa.size.width / 2), frontDir(sofa.rotationY), 0),
          { x: -frontDir(sofa.rotationY).x, z: -frontDir(sofa.rotationY).z },
          0.6,
        );
        if (!wallsHitQuad(ctx.design, behind) && blockersInZone(ctx, behind, new Set([sofa.id])).length === 0) {
          continue;
        }
        violations.push({
          message: `"${sofa.name}" flyter fritt utan ryggstöd — ställ den mot en vägg eller ge den 60 cm fri passage bakom.`,
          furnitureIds: [sofa.id],
        });
      }
      return fail(violations);
    },
  },
  {
    id: 'ERG-08',
    title: 'Huvudgärd mot stabil vägg',
    category: 'Ergonomi & mått',
    importance: 3,
    source: 'Best practice; Feng shui',
    twin: { id: 'FEN-03', category: 'Feng shui' },
    appliesTo: ['sovrum'],
    check(ctx) {
      const beds = ctx.byKind('bed');
      if (beds.length === 0) return na;
      const violations: Violation[] = [];
      for (const bed of beds) {
        const wall = backAgainstWall(ctx.design, bed);
        if (!wall) {
          violations.push({
            message: `Huvudgärden på "${bed.name}" saknar väggstöd — vänd sängen så att huvudändan står mot en vägg.`,
            furnitureIds: [bed.id],
          });
          continue;
        }
        // Fönster på väggen bakom huvudgärden?
        const headMid = backEdgeMid(bed);
        const underWindow = ctx.windows.find(
          (w) =>
            w.wall.id === wall.id &&
            w.sill < 1.2 &&
            distToQuad(headMid, stripZone(w.s, w.e, w.normals[0], 1.0)) < bed.size.width / 2,
        );
        if (underWindow) {
          violations.push({
            message: `"${bed.name}" står med huvudgärden under ett fönster — flytta till en hel vägg, eller kompensera med hög huvudgärd och tjocka gardiner.`,
            furnitureIds: [bed.id],
            zones: [stripZone(underWindow.s, underWindow.e, underWindow.normals[0], 0.8)],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'ERG-09',
    title: 'Nattduksbord i sänghöjd',
    category: 'Ergonomi & mått',
    importance: 3,
    source: 'Best practice',
    twin: { id: 'FEN-20', category: 'Feng shui' },
    appliesTo: ['sovrum'],
    check(ctx) {
      const beds = ctx.byKind('bed');
      if (beds.length === 0) return na;
      const stands = ctx.byKind('nightstand');
      const violations: Violation[] = [];
      for (const bed of beds) {
        const double = bed.size.width >= 1.35;
        const fwd = frontDir(bed.rotationY);
        const right = rightDir(bed.rotationY);
        const nearSide = (side: 1 | -1) =>
          stands.find((ns) => {
            const v = sub(ns.position, bed.position);
            return (
              dot(v, fwd) < 0 && // huvudändans halva
              dot(v, right) * side > bed.size.width / 2 - 0.1 &&
              quadGap(footprint(bed), footprint(ns)) <= 0.35
            );
          });
        // Sidor som står mot vägg behöver inget nattduksbord.
        const sideUsable = ([-1, 1] as const).map(
          (side) => !wallsHitQuad(ctx.design, sideZone(bed, side, 0.45)),
        );
        const found = ([-1, 1] as const).map((side, i) => (sideUsable[i] ? nearSide(side) : undefined));
        const missing = ([-1, 1] as const).filter(
          (_side, i) => sideUsable[i] && !found[i] && (double || i === 0),
        );
        const usableCount = sideUsable.filter(Boolean).length;
        const foundCount = found.filter(Boolean).length;
        if (double ? foundCount < usableCount : foundCount < Math.min(1, usableCount)) {
          violations.push({
            message: double
              ? `Dubbelsängen "${bed.name}" bör ha nattduksbord på båda använda sidorna (parsymmetri) — ${usableCount - foundCount === 1 ? 'en sida saknar' : 'sidorna saknar'} bord.`
              : `Sängen "${bed.name}" saknar nattduksbord vid huvudändan.`,
            furnitureIds: [bed.id],
            zones: missing.map((side) => sideZone(bed, side, 0.45)),
          });
          continue;
        }
        for (const ns of found) {
          if (ns && Math.abs(topOf(ns) - topOf(bed)) > 0.1) {
            violations.push({
              message: `"${ns.name}" (${formatCm(topOf(ns))}) bör ligga inom ±5 cm från sängens överkant (${formatCm(topOf(bed))}).`,
              furnitureIds: [ns.id, bed.id],
            });
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'ERG-13',
    title: 'Skrivbordets mått',
    category: 'Ergonomi & mått',
    importance: 3,
    source: 'AFS 2020:1, SS-EN 527',
    appliesTo: ['hemmakontor'],
    check(ctx) {
      const desks = ctx.byKind('desk');
      if (desks.length === 0) return na;
      const violations: Violation[] = [];
      for (const d of desks) {
        if (d.size.width < 1.0 || d.size.depth < 0.6) {
          violations.push({
            message: `"${d.name}" (${Math.round(d.size.width * 100)}×${Math.round(d.size.depth * 100)} cm) är mindre än riktvärdet 100×60 cm för en arbetsplats.`,
            furnitureIds: [d.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'ERG-14',
    title: 'Arbetsplatsen vinkelrätt mot fönster',
    category: 'Ergonomi & mått',
    importance: 3,
    source: 'AFS 2020:1',
    appliesTo: ['hemmakontor'],
    check(ctx) {
      const desks = ctx.byKind('desk');
      if (desks.length === 0 || ctx.windows.length === 0) return na;
      const violations: Violation[] = [];
      for (const d of desks) {
        const fwd = frontDir(d.rotationY);
        for (const win of ctx.windows) {
          const toWin = sub(win.center, d.position);
          const distance = Math.hypot(toWin.x, toWin.z);
          if (distance > 2) continue;
          const alignment = dot(norm(toWin), fwd);
          if (Math.abs(alignment) > 0.7) {
            violations.push({
              message:
                alignment < 0
                  ? `"${d.name}" står med skärmen framför fönstret (motljus) — vrid skrivbordet 90° så att dagsljuset faller in från sidan.`
                  : `"${d.name}" har fönstret rakt i ryggen (reflexer i skärmen) — vrid skrivbordet 90°.`,
              furnitureIds: [d.id],
              zones: [stripZone(win.s, win.e, win.normals[0], 0.5)],
            });
            break;
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FEN-01',
    title: 'Sängen i kommandoposition',
    category: 'Feng shui',
    importance: 3,
    source: 'Feng shui (formskolan)',
    appliesTo: ['sovrum'],
    check(ctx) {
      const beds = ctx.byKind('bed');
      if (beds.length === 0 || ctx.doors.length === 0) return na;
      const violations: Violation[] = [];
      const tall = ctx.design.furniture.filter((f) => topOf(f) >= 1.5 && FURNITURE_CATALOG[f.kind].blocks);
      for (const bed of beds) {
        const head = backEdgeMid(bed);
        const eye = add(head, frontDir(bed.rotationY), 0.3);
        const seesADoor = ctx.doors.some((door) => {
          if (dot(sub(door.center, eye), frontDir(bed.rotationY)) < -0.1) return false; // bakom huvudgärden
          const blockedByWall = ctx.design.walls.some(
            (w) => w.kind === 'interior' && segmentsCross(eye, door.center, w.a, w.b),
          );
          const blockedByFurniture = tall.some(
            (f) => f.id !== bed.id && segmentHitsQuad(eye, door.center, footprint(f)),
          );
          return !blockedByWall && !blockedByFurniture;
        });
        if (!seesADoor) {
          violations.push({
            message: `Från "${bed.name}" syns ingen dörr — flytta sängen så att dörren är synlig diagonalt från liggande position.`,
            furnitureIds: [bed.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FEN-02',
    title: 'Undvik kistpositionen',
    category: 'Feng shui',
    importance: 3,
    source: 'Feng shui',
    appliesTo: ['sovrum'],
    check(ctx) {
      const beds = ctx.byKind('bed');
      if (beds.length === 0 || ctx.doors.length === 0) return na;
      const violations: Violation[] = [];
      for (const bed of beds) {
        const fwd = frontDir(bed.rotationY);
        const right = rightDir(bed.rotationY);
        for (const door of ctx.doors) {
          const v = sub(door.center, bed.position);
          if (dot(v, fwd) > 0 && Math.abs(dot(v, right)) <= bed.size.width / 2) {
            violations.push({
              message: `Fotänden på "${bed.name}" pekar rakt mot dörren (kistpositionen) — vrid eller förskjut sängen ur dörrlinjen.`,
              furnitureIds: [bed.id],
              zones: [stripZone(door.s, door.e, door.normals[0], 0.6)],
            });
            break;
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FEN-04',
    title: 'Säng inte i dörr–fönster-linjen',
    category: 'Feng shui',
    importance: 3,
    source: 'Feng shui',
    appliesTo: ['sovrum'],
    check(ctx) {
      const beds = ctx.byKind('bed');
      if (beds.length === 0 || ctx.doors.length === 0 || ctx.windows.length === 0) return na;
      const violations: Violation[] = [];
      for (const bed of beds) {
        const quad = footprint(bed);
        for (const door of ctx.doors) {
          const win = ctx.windows.find((w) => segmentHitsQuad(door.center, w.center, quad));
          if (win) {
            violations.push({
              message: `"${bed.name}" ligger i den raka linjen mellan dörren och fönstret (drag av chi över sängen) — förskjut sängen ur linjen.`,
              furnitureIds: [bed.id],
            });
            break;
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FEN-05',
    title: 'Ingen spegel mot sängen',
    category: 'Feng shui',
    importance: 3,
    source: 'Feng shui',
    appliesTo: ['sovrum'],
    check(ctx) {
      const beds = ctx.byKind('bed');
      const mirrors = ctx.byKind('mirror');
      if (beds.length === 0 || mirrors.length === 0) return na;
      const violations: Violation[] = [];
      for (const m of mirrors) {
        const f = frontDir(m.rotationY);
        for (const bed of beds) {
          const v = sub(bed.position, m.position);
          const d = Math.hypot(v.x, v.z);
          if (d <= 4 && dot(norm(v), f) > 0.34) {
            violations.push({
              message: `"${m.name}" reflekterar sängen "${bed.name}" — flytta eller vinkla spegeln bort från sängen.`,
              furnitureIds: [m.id, bed.id],
            });
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FEN-07',
    title: 'Skrivbord i kommandoposition',
    category: 'Feng shui',
    importance: 3,
    source: 'Feng shui',
    appliesTo: ['hemmakontor'],
    check(ctx) {
      const desks = ctx.byKind('desk');
      if (desks.length === 0 || ctx.doors.length === 0) return na;
      const violations: Violation[] = [];
      for (const d of desks) {
        const fwd = frontDir(d.rotationY);
        const seat = add(d.position, fwd, d.size.depth / 2 + 0.3);
        // Den som sitter blickar mot -fwd; en dörr i +fwd-halvan är i ryggen.
        const doorInBack = ctx.doors.some((door) => dot(sub(door.center, seat), fwd) > 0.2);
        if (doorInBack) {
          violations.push({
            message: `Den som sitter vid "${d.name}" har ryggen mot dörren — vrid skrivbordet så att dörren syns snett framför.`,
            furnitureIds: [d.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FEN-10',
    title: 'Spegel inte rakt mot dörren',
    category: 'Feng shui',
    importance: 3,
    source: 'Feng shui',
    check(ctx) {
      const mirrors = ctx.byKind('mirror');
      if (mirrors.length === 0 || ctx.doors.length === 0) return na;
      const violations: Violation[] = [];
      for (const m of mirrors) {
        const f = frontDir(m.rotationY);
        for (const door of ctx.doors) {
          for (const n of door.normals) {
            const corridor = stripZone(add(door.s, { x: -n.z, z: n.x }, -0.3), add(door.e, { x: -n.z, z: n.x }, 0.3), n, 3.5);
            if (pointInPolygon(m.position, corridor) && dot(f, n) < -0.5) {
              violations.push({
                message: `"${m.name}" hänger rakt framför dörren — flytta spegeln till en vägg vinkelrät mot dörren.`,
                furnitureIds: [m.id],
                zones: [stripZone(door.s, door.e, n, 0.6)],
              });
            }
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FEN-12',
    title: 'Ingen pilrak chi-korridor',
    category: 'Feng shui',
    importance: 3,
    source: 'Feng shui',
    check(ctx) {
      if (ctx.doors.length === 0 || ctx.windows.length === 0) return na;
      const violations: Violation[] = [];
      for (const door of ctx.doors) {
        for (const win of ctx.windows) {
          if (win.sill > 1.0) continue; // högt fönster räknas inte som stor öppning
          const dir = norm(sub(win.center, door.center));
          if (Math.abs(dot(dir, door.normals[0])) < 0.7) continue; // inte rakt igenom
          const broken = ctx.design.furniture.some((f) =>
            segmentHitsQuad(door.center, win.center, footprint(f)),
          );
          if (!broken) {
            const perp = { x: -dir.z, z: dir.x };
            violations.push({
              message:
                'Dörren ligger i rak, obruten siktlinje med fönstret — bryt linjen med en matta, möbel eller växt längs vägen.',
              furnitureIds: [],
              zones: [
                [
                  add(door.center, perp, 0.3),
                  add(win.center, perp, 0.3),
                  add(win.center, perp, -0.3),
                  add(door.center, perp, -0.3),
                ],
              ],
            });
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FEN-22',
    title: 'Minimalt med elektronik i sovrummet',
    category: 'Feng shui',
    importance: 2,
    source: 'Feng shui; sömn-best practice',
    appliesTo: ['sovrum'],
    check(ctx) {
      if (ctx.byKind('bed').length === 0) return na;
      const tvs = ctx.byKind('tv');
      if (tvs.length === 0) return ok;
      return fail(
        tvs.map((tv) => ({
          message: `"${tv.name}" står i sovrummet — flytta den eller dölj skärmen i stängd förvaring nattetid.`,
          furnitureIds: [tv.id],
        })),
      );
    },
  },

  // ---- Nivå 2: Ljus, färg, akustik ----
  {
    id: 'LJS-05',
    title: 'Ta vara på dagsljuset',
    category: 'Ljus',
    importance: 2,
    source: 'BBR 6:322',
    check(ctx) {
      if (ctx.windows.length === 0) return na;
      const violations: Violation[] = [];
      for (const win of ctx.windows) {
        for (const zone of clearanceZones(win, 0.35)) {
          const tallInWay = ctx.design.furniture.filter(
            (f) => topOf(f) > 1.2 && f.size.depth <= 0.6 && convexOverlap(footprint(f), zone),
          );
          if (tallInWay.length > 0) {
            violations.push({
              message: `${names(tallInWay)} skymmer dagsljuset framför fönstret — flytta höga möbler från fönsterväggen.`,
              furnitureIds: tallInWay.map((f) => f.id),
              zones: [zone],
            });
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FRG-05',
    title: 'Mattans storlek i sittgruppen',
    category: 'Färg & textil',
    importance: 2,
    source: 'Best practice',
    appliesTo: ['vardagsrum'],
    check(ctx) {
      const sofas = ctx.byKind('sofa');
      const rugs = ctx.byKind('rug');
      if (sofas.length === 0 || rugs.length === 0) return na;
      const violations: Violation[] = [];
      for (const sofa of sofas) {
        const rug = rugs
          .map((r) => ({ r, gap: quadGap(footprint(sofa), footprint(r)) }))
          .sort((a, b) => a.gap - b.gap)[0];
        if (rug.gap > 1.5) continue; // ingen matta hör till den här sittgruppen
        const fwd = frontDir(sofa.rotationY);
        const right = rightDir(sofa.rotationY);
        const frontEdge = add(sofa.position, fwd, sofa.size.depth / 2 - 0.05);
        const frontCorners = [
          add(frontEdge, right, -(sofa.size.width / 2 - 0.05)),
          add(frontEdge, right, sofa.size.width / 2 - 0.05),
        ];
        if (!frontCorners.every((p) => pointInPolygon(p, footprint(rug.r)))) {
          violations.push({
            message: `"${rug.r.name}" är för liten för sittgruppen — minst soffans främre ben ska stå på mattan.`,
            furnitureIds: [rug.r.id, sofa.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FRG-06',
    title: 'Mattan under matbordet',
    category: 'Färg & textil',
    importance: 2,
    source: 'Best practice',
    appliesTo: ['matplats'],
    check(ctx) {
      const tables = ctx.design.furniture.filter(isDiningTable);
      const rugs = ctx.byKind('rug');
      if (tables.length === 0 || rugs.length === 0) return na;
      const violations: Violation[] = [];
      for (const table of tables) {
        const rug = rugs.find((r) => pointInPolygon(table.position, footprint(r)));
        if (!rug) continue; // ingen matta under bordet → regeln gäller inte det bordet
        const tQuad = footprint(table);
        const rQuad = footprint(rug);
        const dirs = [
          frontDir(table.rotationY),
          { x: -frontDir(table.rotationY).x, z: -frontDir(table.rotationY).z },
          rightDir(table.rotationY),
          { x: -rightDir(table.rotationY).x, z: -rightDir(table.rotationY).z },
        ];
        const margin = Math.min(...dirs.map((d) => support(rQuad, d) - support(tQuad, d)));
        if (margin < 0.6) {
          violations.push({
            message: `"${rug.name}" sticker bara ut ${formatCm(Math.max(0, margin))} runt matbordet — den behöver 60–70 cm så att stolarna står kvar på mattan utdragna.`,
            furnitureIds: [rug.id, table.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'AKU-03',
    title: 'Växter för luft och trivsel',
    category: 'Akustik',
    importance: 2,
    source: 'Best practice; feng shui (träelementet)',
    check(ctx) {
      if (ctx.design.furniture.length === 0) return na;
      if (ctx.byKind('plant').length > 0) return ok;
      return fail([
        {
          message: 'Rummet saknar levande växter — ställ in minst en växt anpassad till ljusläget.',
          furnitureIds: [],
        },
      ]);
    },
  },

  // ---- Nivå 1: Estetik ----
  {
    id: 'EST-04',
    title: 'Skala och höjdvariation',
    category: 'Estetik',
    importance: 1,
    source: 'Best practice (proportionslära)',
    check(ctx) {
      const pieces = ctx.design.furniture.filter((f) => f.kind !== 'rug');
      if (pieces.length < 5) return na;
      const bands = new Set(
        pieces.map((f) => (topOf(f) < 0.5 ? 'låg' : topOf(f) < 1.2 ? 'mellan' : 'hög')),
      );
      if (bands.size >= 3) return ok;
      const missing = (['låg', 'mellan', 'hög'] as const).filter((b) => !bands.has(b));
      return fail([
        {
          message: `Rummet saknar möbler i höjdled (${missing.join(' och ')}) — blanda lågt, mellan och högt så att blicken vandrar.`,
          furnitureIds: [],
        },
      ]);
    },
  },
  {
    id: 'EST-05',
    title: 'Visuell balans i rummet',
    category: 'Estetik',
    importance: 1,
    source: 'Best practice',
    check(ctx) {
      const pieces = ctx.design.furniture.filter((f) => f.kind !== 'rug');
      if (pieces.length < 3) return na;
      let wx = 0;
      let wz = 0;
      let wSum = 0;
      for (const f of pieces) {
        const w = f.size.width * f.size.depth * f.size.height;
        wx += f.position.x * w;
        wz += f.position.z * w;
        wSum += w;
      }
      const centroid = { x: wx / wSum, z: wz / wSum };
      const c = polygonCenter(ctx.poly);
      const b = polygonBounds(ctx.poly);
      const halfDiag = Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ) / 2;
      const offset = Math.hypot(centroid.x - c.x, centroid.z - c.z);
      if (offset <= 0.35 * halfDiag) return ok;
      return fail([
        {
          message:
            'Den visuella vikten samlas på ena sidan av rummet — balansera med en möbel, bokhylla eller mörk textil på motstående sida.',
          furnitureIds: [],
        },
      ]);
    },
  },
];

/** Segmentkorsning utan beröringstolerans (sikt genom dörröppning ska inte stoppas av väggens ändpunkter). */
function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const o = (p: Point, q: Point, r: Point) => Math.sign((q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b) && o(a, b, c) !== 0 && o(c, d, a) !== 0;
}

export function buildCtx(design: Design): RuleCtx {
  const byKindCache = new Map<FurnitureKind, FurnitureItem[]>();
  return {
    design,
    poly: floorPolygon(design.walls),
    roomTypes: inferRoomTypes(design),
    doors: openingInfos(design, 'door'),
    windows: openingInfos(design, 'window'),
    byKind: (k) => {
      let list = byKindCache.get(k);
      if (!list) {
        list = design.furniture.filter((f) => f.kind === k);
        byKindCache.set(k, list);
      }
      return list;
    },
  };
}
