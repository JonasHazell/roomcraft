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
  | 'Safety'
  | 'Accessibility'
  | 'Ergonomics & dimensions'
  | 'Feng shui'
  | 'Light'
  | 'Color & textiles'
  | 'Acoustics'
  | 'Aesthetics';

export const CATEGORY_ORDER: RuleCategory[] = [
  'Safety',
  'Accessibility',
  'Ergonomics & dimensions',
  'Feng shui',
  'Light',
  'Color & textiles',
  'Acoustics',
  'Aesthetics',
];

export type RoomType = 'sovrum' | 'vardagsrum' | 'hemmakontor' | 'matplats';

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  sovrum: 'Bedroom',
  vardagsrum: 'Living room',
  hemmakontor: 'Home office',
  matplats: 'Dining area',
};

/** Score weight per importance level according to the rule catalog. */
export const IMPORTANCE_WEIGHT: Record<number, number> = { 5: 16, 4: 8, 3: 4, 2: 2, 1: 1 };

export interface Violation {
  message: string;
  /** Furniture highlighted in the 3D view when the issue is selected. */
  furnitureIds: string[];
  /** Floor zones (polygons) highlighted in the 3D view. */
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
  /** Linked twin rule (e.g. FEN-03 for ERG-08): reported in both categories, counted once in the total. */
  twin?: { id: string; category: RuleCategory };
  /** Room types the rule requires; omitted = all rooms. */
  appliesTo?: RoomType[];
  check: (ctx: RuleCtx) => RuleOutcome;
}

/** Infers room types from the furnishing (mixed rooms can yield several). */
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

/** Midpoint of the back edge (opposite the front). */
function backEdgeMid(f: FurnitureItem): Point {
  return add(f.position, frontDir(f.rotationY), -f.size.depth / 2);
}

/** True if the back of the furniture sits flush (≤ tol) against a wall. */
function backAgainstWall(design: Design, f: FurnitureItem, tol = 0.18) {
  const hit = nearestWall(design, backEdgeMid(f));
  return hit && hit.distance <= tol ? hit.wall : null;
}

/** Zone along one of the furniture's long sides (side = ±1 along the right axis), depth outward. */
function sideZone(f: FurnitureItem, side: 1 | -1, depth: number): Point[] {
  const fwd = frontDir(f.rotationY);
  const right = rightDir(f.rotationY);
  const n = { x: right.x * side, z: right.z * side };
  const edgeMid = add(f.position, n, f.size.width / 2);
  const s = add(edgeMid, fwd, -f.size.depth / 2);
  const e = add(edgeMid, fwd, f.size.depth / 2);
  return stripZone(s, e, n, depth);
}

/** Zone in front of the furniture's front face, as wide as the piece. */
function frontZone(f: FurnitureItem, depth: number): Point[] {
  const fwd = frontDir(f.rotationY);
  const right = rightDir(f.rotationY);
  const faceMid = add(f.position, fwd, f.size.depth / 2);
  const s = add(faceMid, right, -f.size.width / 2);
  const e = add(faceMid, right, f.size.width / 2);
  return stripZone(s, e, fwd, depth);
}

/** Blocking furniture that overlaps the zone. */
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
// Rules
// ---------------------------------------------------------------------------

export const RULES: RuleDef[] = [
  // ---- Level 5: Safety ----
  {
    id: 'SAK-02',
    title: 'Doors must be able to open fully',
    category: 'Safety',
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
              message: `${names(inWay)} is in the door's swing area — move it so the door can open fully (80 cm clear).`,
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
    title: 'Escape route must not be blocked',
    category: 'Safety',
    importance: 5,
    source: 'BBR 5:3, MSB',
    check(ctx) {
      if (ctx.doors.length === 0) return na;
      const spots = ctx.design.furniture.filter(
        (f) => f.kind === 'bed' || f.kind === 'sofa' || f.kind === 'desk' || isDiningTable(f),
      );
      if (spots.length === 0) return na;
      // 0.4 m erosion ⇒ free passage ≈ 80 cm wide.
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
            message: `There is no clear path (at least 80 cm wide) from "${f.name}" to a door — move the furniture boxing it in.`,
            furnitureIds: [f.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'SAK-03',
    title: 'Escape window must be reachable',
    category: 'Safety',
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
              message: `${names(inWay)} blocks the escape window — keep 60 cm of floor space clear in front of the window.`,
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
    title: 'No heavy objects above where people lie or sit',
    category: 'Safety',
    importance: 5,
    source: 'Best practice child safety; Feng shui',
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
              message: `"${h.name}" hangs directly above "${rest.name}" — move it to a wall without a bed or sofa below.`,
              furnitureIds: [h.id, rest.id],
            });
          }
        }
      }
      return fail(violations);
    },
  },

  // ---- Level 4: Accessibility ----
  {
    id: 'TIL-02',
    title: 'Wheelchair turning space (130 cm)',
    category: 'Accessibility',
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
            'No clear 130 cm turning circle fits in the room — move or remove furniture to open up a contiguous floor area.',
          furnitureIds: [],
        },
      ]);
    },
  },
  {
    id: 'TIL-05',
    title: 'Access around the bed',
    category: 'Accessibility',
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
              ? `The double bed "${bed.name}" needs 60 cm clear along both long sides — currently ${blockedCount === 2 ? 'both sides are' : 'one side is'} blocked.`
              : `The bed "${bed.name}" needs 60 cm clear along at least one long side.`,
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
    title: 'Clear space in front of storage',
    category: 'Accessibility',
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
            message: `110 cm of clear space is needed in front of "${w.name}" (open door + person) — ${
              inWay.length > 0 ? `${names(inWay)} is in the way` : 'the wall is too close'
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
    title: 'Space around the dining area',
    category: 'Accessibility',
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
          if (quadGap(footprint(chair), tQuad) > 0.35) continue; // not at this table
          const away = norm(sub(chair.position, table.position));
          // From the table edge there should be 70 cm back (chair + standing up).
          const edgeReach = support(tQuad.map((p) => sub(p, table.position)), away);
          const s1 = add(add(table.position, away, edgeReach), rightDir(chair.rotationY), -0.3);
          const s2 = add(add(table.position, away, edgeReach), rightDir(chair.rotationY), 0.3);
          const zone = stripZone(s1, s2, away, 0.7);
          const inWay = blockersInZone(ctx, zone, new Set([table.id, ...chairs.map((c) => c.id)]));
          if (wallsHitQuad(ctx.design, zone) || inWay.length > 0) {
            violations.push({
              message: `Behind the chair "${chair.name}" there is less than 70 cm to ${
                inWay.length > 0 ? names(inWay) : 'the wall'
              } — pull the table the other way or remove the seat.`,
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
    title: 'Windows must be reachable and openable',
    category: 'Accessibility',
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
              message: `${names(inWay)} sits flush against the window — deep furniture prevents opening it for ventilation.`,
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
    title: 'The room must not be over-furnished',
    category: 'Accessibility',
    importance: 4,
    source: 'Best practice; feng shui (free flow of chi)',
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
          message: `The room has only about ${freePct}% free floor area (guideline ≥ 40%) — remove or downsize furniture.`,
          furnitureIds: [],
        },
      ]);
    },
  },

  // ---- Level 3: Ergonomics & feng shui placement ----
  {
    id: 'ERG-01',
    title: 'Sofa to coffee table distance',
    category: 'Ergonomics & dimensions',
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
            message: `Adjust "${near.t.name}" to 30–45 cm from the front edge of the sofa (currently ${formatCm(near.gap)}).`,
            furnitureIds: [sofa.id, near.t.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'ERG-02',
    title: 'TV viewing distance',
    category: 'Ergonomics & dimensions',
    importance: 3,
    source: 'SMPTE/THX',
    appliesTo: ['vardagsrum', 'sovrum'],
    check(ctx) {
      const tvs = ctx.byKind('tv');
      const seats = [...ctx.byKind('sofa'), ...ctx.byKind('bed')];
      if (tvs.length === 0 || seats.length === 0) return na;
      const violations: Violation[] = [];
      for (const tv of tvs) {
        const diagonal = (tv.size.width * 0.92) / 0.87; // screen width → diagonal (16:9)
        const min = 1.2 * diagonal;
        const max = 2.6 * diagonal; // 1.6× for 4K, up to ~2.5× for HD
        const nearest = seats
          .map((s) => ({ s, d: Math.hypot(s.position.x - tv.position.x, s.position.z - tv.position.z) }))
          .sort((a, b) => a.d - b.d)[0];
        if (nearest.d < min || nearest.d > max) {
          violations.push({
            message: `The seat "${nearest.s.name}" is ${nearest.d.toFixed(1)} m from the TV — the guideline for this screen size is ${min.toFixed(1)}–${max.toFixed(1)} m.`,
            furnitureIds: [tv.id, nearest.s.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'ERG-05',
    title: 'Sofa placement in the room',
    category: 'Ergonomics & dimensions',
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
        // A free passage behind (room divider) is also accepted.
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
          message: `"${sofa.name}" floats freely with no backing — place it against a wall or give it 60 cm of free passage behind.`,
          furnitureIds: [sofa.id],
        });
      }
      return fail(violations);
    },
  },
  {
    id: 'ERG-08',
    title: 'Headboard against a solid wall',
    category: 'Ergonomics & dimensions',
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
            message: `The headboard of "${bed.name}" has no wall support — turn the bed so the head end is against a wall.`,
            furnitureIds: [bed.id],
          });
          continue;
        }
        // Window on the wall behind the headboard?
        const headMid = backEdgeMid(bed);
        const underWindow = ctx.windows.find(
          (w) =>
            w.wall.id === wall.id &&
            w.sill < 1.2 &&
            distToQuad(headMid, stripZone(w.s, w.e, w.normals[0], 1.0)) < bed.size.width / 2,
        );
        if (underWindow) {
          violations.push({
            message: `"${bed.name}" has its headboard under a window — move it to a solid wall, or compensate with a tall headboard and thick curtains.`,
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
    title: 'Nightstands at bed height',
    category: 'Ergonomics & dimensions',
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
              dot(v, fwd) < 0 && // the head-end half
              dot(v, right) * side > bed.size.width / 2 - 0.1 &&
              quadGap(footprint(bed), footprint(ns)) <= 0.35
            );
          });
        // Sides against a wall do not need a nightstand.
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
              ? `The double bed "${bed.name}" should have nightstands on both usable sides (couple symmetry) — ${usableCount - foundCount === 1 ? 'one side is missing' : 'both sides are missing'} a table.`
              : `The bed "${bed.name}" is missing a nightstand at the head end.`,
            furnitureIds: [bed.id],
            zones: missing.map((side) => sideZone(bed, side, 0.45)),
          });
          continue;
        }
        for (const ns of found) {
          if (ns && Math.abs(topOf(ns) - topOf(bed)) > 0.1) {
            violations.push({
              message: `"${ns.name}" (${formatCm(topOf(ns))}) should be within ±5 cm of the top of the bed (${formatCm(topOf(bed))}).`,
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
    title: 'Desk dimensions',
    category: 'Ergonomics & dimensions',
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
            message: `"${d.name}" (${Math.round(d.size.width * 100)}×${Math.round(d.size.depth * 100)} cm) is smaller than the 100×60 cm guideline for a workstation.`,
            furnitureIds: [d.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'ERG-14',
    title: 'Workstation perpendicular to the window',
    category: 'Ergonomics & dimensions',
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
                  ? `"${d.name}" has its screen facing the window (backlighting) — rotate the desk 90° so daylight comes in from the side.`
                  : `"${d.name}" has the window directly behind it (screen reflections) — rotate the desk 90°.`,
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
    title: 'Bed in the command position',
    category: 'Feng shui',
    importance: 3,
    source: 'Feng shui (form school)',
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
          if (dot(sub(door.center, eye), frontDir(bed.rotationY)) < -0.1) return false; // behind the headboard
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
            message: `No door is visible from "${bed.name}" — move the bed so the door can be seen diagonally from a lying position.`,
            furnitureIds: [bed.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FEN-02',
    title: 'Avoid the coffin position',
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
              message: `The foot of "${bed.name}" points straight at the door (the coffin position) — rotate or shift the bed out of the door line.`,
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
    title: 'Bed not in the door–window line',
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
              message: `"${bed.name}" lies in the straight line between the door and the window (chi drafting across the bed) — shift the bed out of the line.`,
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
    title: 'No mirror facing the bed',
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
              message: `"${m.name}" reflects the bed "${bed.name}" — move or angle the mirror away from the bed.`,
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
    title: 'Desk in the command position',
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
        // The sitter faces -fwd; a door in the +fwd half is behind their back.
        const doorInBack = ctx.doors.some((door) => dot(sub(door.center, seat), fwd) > 0.2);
        if (doorInBack) {
          violations.push({
            message: `Whoever sits at "${d.name}" has their back to the door — rotate the desk so the door is visible diagonally in front.`,
            furnitureIds: [d.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FEN-10',
    title: 'Mirror not directly facing the door',
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
                message: `"${m.name}" hangs directly opposite the door — move the mirror to a wall perpendicular to the door.`,
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
    title: 'No arrow-straight chi corridor',
    category: 'Feng shui',
    importance: 3,
    source: 'Feng shui',
    check(ctx) {
      if (ctx.doors.length === 0 || ctx.windows.length === 0) return na;
      const violations: Violation[] = [];
      for (const door of ctx.doors) {
        for (const win of ctx.windows) {
          if (win.sill > 1.0) continue; // a high window does not count as a large opening
          const dir = norm(sub(win.center, door.center));
          if (Math.abs(dot(dir, door.normals[0])) < 0.7) continue; // not straight through
          const broken = ctx.design.furniture.some((f) =>
            segmentHitsQuad(door.center, win.center, footprint(f)),
          );
          if (!broken) {
            const perp = { x: -dir.z, z: dir.x };
            violations.push({
              message:
                'The door is in a straight, unbroken sightline with the window — break the line with a rug, piece of furniture or plant along the way.',
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
    title: 'Minimal electronics in the bedroom',
    category: 'Feng shui',
    importance: 2,
    source: 'Feng shui; sleep best practice',
    appliesTo: ['sovrum'],
    check(ctx) {
      if (ctx.byKind('bed').length === 0) return na;
      const tvs = ctx.byKind('tv');
      if (tvs.length === 0) return ok;
      return fail(
        tvs.map((tv) => ({
          message: `"${tv.name}" is in the bedroom — move it out or hide the screen in closed storage at night.`,
          furnitureIds: [tv.id],
        })),
      );
    },
  },

  // ---- Level 2: Light, color, acoustics ----
  {
    id: 'LJS-05',
    title: 'Make the most of daylight',
    category: 'Light',
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
              message: `${names(tallInWay)} blocks daylight in front of the window — move tall furniture away from the window wall.`,
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
    title: 'Rug size in the seating group',
    category: 'Color & textiles',
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
        if (rug.gap > 1.5) continue; // no rug belongs to this seating group
        const fwd = frontDir(sofa.rotationY);
        const right = rightDir(sofa.rotationY);
        const frontEdge = add(sofa.position, fwd, sofa.size.depth / 2 - 0.05);
        const frontCorners = [
          add(frontEdge, right, -(sofa.size.width / 2 - 0.05)),
          add(frontEdge, right, sofa.size.width / 2 - 0.05),
        ];
        if (!frontCorners.every((p) => pointInPolygon(p, footprint(rug.r)))) {
          violations.push({
            message: `"${rug.r.name}" is too small for the seating group — at least the sofa's front legs should stand on the rug.`,
            furnitureIds: [rug.r.id, sofa.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'FRG-06',
    title: 'Rug under the dining table',
    category: 'Color & textiles',
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
        if (!rug) continue; // no rug under the table → the rule does not apply to that table
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
            message: `"${rug.name}" extends only ${formatCm(Math.max(0, margin))} beyond the dining table — it needs 60–70 cm so the chairs stay on the rug when pulled out.`,
            furnitureIds: [rug.id, table.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'AKU-03',
    title: 'Plants for air and comfort',
    category: 'Acoustics',
    importance: 2,
    source: 'Best practice; feng shui (the wood element)',
    check(ctx) {
      if (ctx.design.furniture.length === 0) return na;
      if (ctx.byKind('plant').length > 0) return ok;
      return fail([
        {
          message: 'The room has no living plants — add at least one plant suited to the light conditions.',
          furnitureIds: [],
        },
      ]);
    },
  },

  // ---- Level 1: Aesthetics ----
  {
    id: 'EST-04',
    title: 'Scale and height variation',
    category: 'Aesthetics',
    importance: 1,
    source: 'Best practice (proportion theory)',
    check(ctx) {
      const pieces = ctx.design.furniture.filter((f) => f.kind !== 'rug');
      if (pieces.length < 5) return na;
      const bands = new Set(
        pieces.map((f) => (topOf(f) < 0.5 ? 'low' : topOf(f) < 1.2 ? 'medium' : 'high')),
      );
      if (bands.size >= 3) return ok;
      const missing = (['low', 'medium', 'high'] as const).filter((b) => !bands.has(b));
      return fail([
        {
          message: `The room lacks furniture at some heights (${missing.join(' and ')}) — mix low, medium and high so the eye wanders.`,
          furnitureIds: [],
        },
      ]);
    },
  },
  {
    id: 'EST-05',
    title: 'Visual balance in the room',
    category: 'Aesthetics',
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
            'The visual weight gathers on one side of the room — balance it with a piece of furniture, a bookshelf or dark textiles on the opposite side.',
          furnitureIds: [],
        },
      ]);
    },
  },
];

/** Segment crossing without touch tolerance (sight through a doorway should not be stopped by the wall's endpoints). */
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
