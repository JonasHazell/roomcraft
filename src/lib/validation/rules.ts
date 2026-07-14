import type { FurnitureItem, FurnitureKind, Point } from '../../types';
import { FURNITURE_CATALOG } from '../furnitureCatalog.ts';
import {
  formatCm,
  pointInPolygon,
  polygonBounds,
  polygonCenter,
  segmentsCross,
  signedArea,
} from '../polygon.ts';
import {
  add,
  blockers,
  clearanceZones,
  convexOverlap,
  distToNearestWall,
  distToQuad,
  dot,
  erodedGrid,
  floodFill,
  footprint,
  freeComponents,
  frontDir,
  norm,
  quadGap,
  rightDir,
  segmentHitsQuad,
  stripZone,
  sub,
  support,
  wallsHitQuad,
} from './geo.ts';
import {
  backAgainstWall,
  backEdgeMid,
  blockersInZone,
  DOUBLE_BED_MIN_WIDTH,
  fail,
  frontClearFraction,
  frontZone,
  isCoffeeTable,
  isDiningTable,
  na,
  names,
  ok,
  seatingSeats,
  sideZone,
  topOf,
} from './ruleHelpers.ts';
import type { RuleDef, Violation } from './ruleTypes';
import { inferZones, zoneAnchors, ZONE_GAP, ZONE_LABEL } from './zones.ts';

// The rule catalog's taxonomy and types live in ruleTypes.ts and the rule-local
// geometry helpers (plus buildCtx/inferRoomTypes) in ruleHelpers.ts; both are
// re-exported here so consumers keep importing everything from ./rules.
export {
  CATEGORY_ORDER,
  IMPORTANCE_WEIGHT,
  ROOM_TYPE_LABEL,
  type RoomType,
  type RuleCategory,
  type RuleCtx,
  type RuleDef,
  type RuleOutcome,
  type Violation,
} from './ruleTypes.ts';
export { buildCtx, inferRoomTypes } from './ruleHelpers.ts';

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/** Widest uncovered run within [0, width] given covered [lo, hi] intervals. */
function widestGap(width: number, covered: Array<[number, number]>): number {
  const sorted = [...covered].sort((a, b) => a[0] - b[0]);
  let best = 0;
  let cursor = 0;
  for (const [lo, hi] of sorted) {
    if (lo > cursor) best = Math.max(best, lo - cursor);
    cursor = Math.max(cursor, hi);
  }
  return Math.max(best, width - cursor);
}

export const RULES: RuleDef[] = [
  // ---- Level 5: Safety ----
  {
    id: 'SAF-02',
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
    id: 'SAF-01',
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
    id: 'SAF-03',
    title: 'Escape window must be reachable',
    category: 'Safety',
    importance: 5,
    source: 'BBR 5:323',
    appliesTo: ['sovrum', 'vardagsrum'],
    check(ctx) {
      // BBR 5:323: a window counts as an escape route when the lower edge of the
      // opening sits at most 1.2 m above the floor.
      const escapeWindows = ctx.windows.filter((w) => w.sill <= 1.2);
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
    id: 'SAF-10',
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
    id: 'ACC-01',
    title: 'Main passages at least 90 cm',
    category: 'Accessibility',
    importance: 4,
    source: 'SS 91 42 21, BBR 3:1, NKBA',
    check(ctx) {
      if (ctx.design.furniture.length === 0) return na;
      if (Math.abs(signedArea(ctx.poly)) < 2) return na; // too small to reason about circulation
      // Walkable floor for a 90 cm passage (0.45 m erosion each side).
      const grid = erodedGrid(ctx.design, 0.45);
      // Connected walkable regions, largest first. Ignore pockets < 0.4 m²
      // (40 cells) — true slivers behind furniture nobody needs to walk to.
      // Anything bigger is a part of the room people should be able to reach;
      // if more than one such region survives, furniture is walling one off so
      // you cannot pass by it at 90 cm (only fully split at the old 0.8 m²
      // threshold was caught before, which let beds barricading a strip of the
      // room slip through).
      const regions = freeComponents(grid)
        .filter((cells) => cells.length >= 40)
        .sort((a, b) => b.length - a.length);
      if (regions.length <= 1) return ok;
      // The largest region is the main floor; every other region is cut off
      // from it — you would have to climb over furniture to reach it.
      const walledOff = regions
        .slice(1)
        .flat()
        .map((i) => grid.center(i % grid.cols, Math.floor(i / grid.cols)));
      // The furniture forming the barrier: blockers hugging the cut-off floor.
      const barrier = blockers(ctx.design.furniture).filter((f) => {
        const quad = footprint(f);
        return walledOff.some((p) => distToQuad(p, quad) < 0.55);
      });
      const xs = walledOff.map((p) => p.x);
      const zs = walledOff.map((p) => p.z);
      const zone: Point[] = [
        { x: Math.min(...xs) - 0.05, z: Math.min(...zs) - 0.05 },
        { x: Math.max(...xs) + 0.05, z: Math.min(...zs) - 0.05 },
        { x: Math.max(...xs) + 0.05, z: Math.max(...zs) + 0.05 },
        { x: Math.min(...xs) - 0.05, z: Math.max(...zs) + 0.05 },
      ];
      return fail([
        {
          message:
            barrier.length > 0
              ? `${names(barrier)} blocks the way through the room — there is no 90 cm passage past it to the rest of the floor. Move it, or open a gap beside it, so you can walk past.`
              : 'Part of the walkable floor is cut off by a passage narrower than 90 cm — widen the gap between the furniture (or between furniture and wall) so you can move through at 90 cm.',
          furnitureIds: barrier.map((f) => f.id),
          zones: [zone],
        },
      ]);
    },
  },
  {
    id: 'ACC-03',
    title: 'Clear passage width in doorways',
    category: 'Accessibility',
    importance: 4,
    source: 'BBR 3:143, SS 91 42 21',
    check(ctx) {
      if (ctx.doors.length === 0) return na;
      const violations: Violation[] = [];
      for (const door of ctx.doors) {
        const width = Math.hypot(door.e.x - door.s.x, door.e.z - door.s.z);
        if (width < 0.8) continue; // the opening itself is narrow — a building matter, not furniture
        const axis = norm(sub(door.e, door.s));
        for (const n of door.normals) {
          const throat = stripZone(door.s, door.e, n, 0.25);
          const intruders = blockersInZone(ctx, throat);
          if (intruders.length === 0) continue;
          // Project each intruder onto the door line and subtract the covered span.
          const covered = intruders.map((f): [number, number] => {
            const proj = footprint(f).map((p) => dot(sub(p, door.s), axis));
            return [Math.max(0, Math.min(...proj)), Math.min(width, Math.max(...proj))];
          });
          const clear = widestGap(width, covered);
          if (clear < 0.8) {
            violations.push({
              message: `${names(intruders)} narrows the passage through the doorway to about ${formatCm(
                Math.max(0, clear),
              )} — keep at least 80 cm clear.`,
              furnitureIds: intruders.map((f) => f.id),
              zones: [throat],
            });
          }
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'ACC-02',
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
    id: 'ACC-05',
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
        const double = bed.size.width >= DOUBLE_BED_MIN_WIDTH;
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
    id: 'ACC-06',
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
    id: 'ACC-07',
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
    id: 'ACC-11',
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
    id: 'ACC-13',
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
  {
    id: 'ACC-14',
    title: 'Every function keeps its usable clearance',
    category: 'Accessibility',
    importance: 4,
    source: 'SS 91 42 21',
    check(ctx) {
      // Pieces that are only usable if the space in front of them stays clear.
      // Beds (side access → ACC-05) and wardrobes (front clearance → ACC-06) are
      // covered by their own rules, so they are not re-checked here.
      const subjects = ctx.design.furniture.filter(
        (f) => f.kind === 'desk' || f.kind === 'sofa' || f.kind === 'box' || isDiningTable(f),
      );
      if (subjects.length === 0) return na;
      const violations: Violation[] = [];
      for (const f of subjects) {
        const depth = FURNITURE_CATALOG[f.kind].accessDepth;
        if (depth <= 0) continue;
        // A coffee table belongs in front of a sofa — don't count it as blocking.
        const ignore = (b: FurnitureItem) => f.kind === 'sofa' && isCoffeeTable(b);
        // Needs a clear majority of the front zone to be genuinely usable; a lone
        // reachable sliver (e.g. a bed pushed against the desk) is not enough.
        if (frontClearFraction(ctx.design, ctx.poly, f, depth, ignore) >= 0.6) continue;
        const zone = frontZone(f, depth);
        const inWay = blockersInZone(ctx, zone, new Set([f.id])).filter((b) => !ignore(b));
        violations.push({
          message:
            inWay.length > 0
              ? `"${f.name}" can't be used as intended — ${names(inWay)} takes up the clear space needed in front of it (about ${formatCm(depth)}). Move it away from the front of "${f.name}".`
              : `"${f.name}" has too little usable space in front — it is pushed against a wall or the edge of the room. Turn it toward open floor or move it out.`,
          furnitureIds: [f.id, ...inWay.map((b) => b.id)],
          zones: [zone],
        });
      }
      return fail(violations);
    },
  },

  // ---- Layout & zoning ----
  {
    id: 'ZON-01',
    title: 'Each activity zone stays grouped together',
    category: 'Layout & zoning',
    importance: 3,
    source: 'Best practice (zoning); feng shui (grouping chi)',
    check(ctx) {
      const zones = inferZones(ctx.design);
      if (zones.length === 0) return na;
      const violations: Violation[] = [];
      for (const zone of zones) {
        const label = ZONE_LABEL[zone.kind];
        for (const m of zone.members) {
          if (m.anchor) continue; // anchors define the zone; they can't stray from themselves
          if (m.gapToAnchor <= ZONE_GAP[zone.kind]) continue;
          const anchorNames = names(zone.anchors);
          violations.push({
            message: `"${m.item.name}" belongs to the ${label} area but sits ${formatCm(
              m.gapToAnchor,
            )} away from ${anchorNames} — pull it in so the ${label} zone reads as one group instead of scattered pieces.`,
            furnitureIds: [m.item.id, ...zone.anchors.map((a) => a.id)],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'ZON-02',
    title: 'No storage marooned in the middle of the room',
    category: 'Layout & zoning',
    importance: 3,
    source: 'Best practice; feng shui (keep the centre open)',
    check(ctx) {
      // Only tall/storage pieces read as "stranded" when they float centrally;
      // beds, sofas and tables are judged by their own placement rules.
      const STORAGE = new Set<FurnitureKind>(['wardrobe', 'bookshelf', 'box']);
      const subjects = ctx.design.furniture.filter((f) => STORAGE.has(f.kind));
      if (subjects.length === 0) return na;
      const anchors = zoneAnchors(ctx.design);
      const violations: Violation[] = [];
      for (const f of subjects) {
        const quad = footprint(f);
        // Against a wall (perimeter)? Any corner close to a wall line counts.
        const nearWall = quad.some((c) => distToNearestWall(ctx.design, c) <= 0.35);
        if (nearWall) continue;
        // Functional in the middle: standing right beside an activity zone it can
        // serve or divide (e.g. a bookshelf back-to-back with a sofa).
        const dividesZone = anchors.some((a) => quadGap(quad, footprint(a)) <= 0.8);
        if (dividesZone) continue;
        violations.push({
          message: `"${f.name}" stands in the middle of the room with open floor all around it and no wall or activity behind it — a marooned storage piece cramps the room and breaks up sightlines. Move it against a wall, or place it directly beside a seating/sleeping area so it works as a room divider.`,
          furnitureIds: [f.id],
        });
      }
      return fail(violations);
    },
  },
  {
    id: 'ZON-03',
    title: 'Keep the open floor generous and in one piece',
    category: 'Layout & zoning',
    importance: 3,
    source: 'Best practice; feng shui (free flow of chi)',
    check(ctx) {
      if (ctx.design.furniture.length === 0) return na;
      const roomArea = Math.abs(signedArea(ctx.poly));
      if (roomArea < 8) return na; // a small room is simply full; nothing to open up
      // Walkable floor for a comfortable 60 cm passage (0.3 m erosion each side).
      const grid = erodedGrid(ctx.design, 0.3);
      const comps = freeComponents(grid);
      const totalFree = comps.reduce((s, c) => s + c.length, 0);
      const largest = comps.reduce((m, c) => Math.max(m, c.length), 0);
      // A 10 cm grid ⇒ each cell is 0.01 m².
      const openArea = largest * 0.01;
      const roomFrac = openArea / roomArea; // largest open expanse vs the whole floor
      const contiguity = totalFree > 0 ? largest / totalFree : 0; // is the open floor one piece?
      // Pass if there is a genuinely generous open expanse, or if what open floor
      // there is stays essentially in one piece rather than chopped into pockets.
      if (roomFrac >= 0.3 || contiguity >= 0.75) return ok;
      return fail([
        {
          message: `The largest uninterrupted open area is only about ${Math.round(
            roomFrac * 100,
          )}% of the floor and the open space is broken into pockets — pull furniture back against the walls so the room keeps one generous, connected open area.`,
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
    id: 'ERG-03',
    title: 'Conversation-friendly seating group',
    category: 'Ergonomics & dimensions',
    importance: 3,
    source: 'Best practice (interior design practice)',
    appliesTo: ['vardagsrum'],
    check(ctx) {
      const seats = seatingSeats(ctx.design);
      if (seats.length < 2) return na;
      const center = {
        x: seats.reduce((s, f) => s + f.position.x, 0) / seats.length,
        z: seats.reduce((s, f) => s + f.position.z, 0) / seats.length,
      };
      const violations: Violation[] = [];
      for (const seat of seats) {
        const nearest = Math.min(
          ...seats
            .filter((o) => o.id !== seat.id)
            .map((o) => Math.hypot(o.position.x - seat.position.x, o.position.z - seat.position.z)),
        );
        if (nearest > 3.5) {
          violations.push({
            message: `"${seat.name}" sits more than 3.5 m from the rest of the seating group — pull the seats closer so conversation stays easy.`,
            furnitureIds: [seat.id],
          });
          continue;
        }
        const toCenter = sub(center, seat.position);
        const d = Math.hypot(toCenter.x, toCenter.z);
        if (d > 0.3 && dot(norm(toCenter), frontDir(seat.rotationY)) < -0.3) {
          violations.push({
            message: `"${seat.name}" faces away from the seating group — turn it toward the centre so it joins the conversation.`,
            furnitureIds: [seat.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'ERG-04',
    title: 'Surface within reach of every seat',
    category: 'Ergonomics & dimensions',
    importance: 3,
    source: 'Best practice',
    appliesTo: ['vardagsrum'],
    check(ctx) {
      const seats = seatingSeats(ctx.design);
      if (seats.length === 0) return na;
      const surfaces = ctx.design.furniture.filter(
        (f) =>
          isCoffeeTable(f) || f.kind === 'nightstand' || (f.kind === 'table' && !isDiningTable(f)),
      );
      const violations: Violation[] = [];
      for (const seat of seats) {
        const near = surfaces.some((s) => quadGap(footprint(seat), footprint(s)) <= 0.45);
        if (!near) {
          violations.push({
            message: `"${seat.name}" has no surface within arm's reach (45 cm) — add a coffee or side table beside it.`,
            furnitureIds: [seat.id],
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
        const double = bed.size.width >= DOUBLE_BED_MIN_WIDTH;
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
    id: 'FEN-14',
    title: 'Sharp corners not aimed at resting places',
    category: 'Feng shui',
    importance: 3,
    source: 'Feng shui (sha chi)',
    appliesTo: ['sovrum', 'vardagsrum'],
    check(ctx) {
      const resting = [...ctx.byKind('bed'), ...ctx.byKind('sofa')];
      if (resting.length === 0) return na;
      const SHARP = new Set<FurnitureKind>(['table', 'desk', 'wardrobe', 'bookshelf', 'box']);
      const sharp = ctx.design.furniture.filter((f) => SHARP.has(f.kind) && topOf(f) >= 0.6);
      if (sharp.length === 0) return ok;
      const violations: Violation[] = [];
      for (const rest of resting) {
        const target = footprint(rest);
        for (const f of sharp) {
          const quad = footprint(f);
          const gap = quadGap(quad, target);
          if (gap === 0 || gap > 1.0) continue; // overlapping is a collision, not a poison arrow
          let aimed = false;
          for (let i = 0; i < quad.length && !aimed; i++) {
            const c = quad[i];
            if (distToQuad(c, target) > 1.0) continue;
            const e1 = norm(sub(quad[(i + 3) % quad.length], c));
            const e2 = norm(sub(quad[(i + 1) % quad.length], c));
            const toRest = norm(sub(rest.position, c));
            // The resting place sits in the corner's outward wedge (both edges point away).
            if (dot(toRest, e1) < 0 && dot(toRest, e2) < 0) aimed = true;
          }
          if (aimed) {
            violations.push({
              message: `A corner of "${f.name}" points straight at "${rest.name}" from close range (a "poison arrow") — angle the piece, round the corner, or soften it with a plant.`,
              furnitureIds: [f.id, rest.id],
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
    id: 'LGT-05',
    title: 'Make the most of daylight',
    category: 'Light',
    importance: 2,
    source: 'BBR 6:322',
    check(ctx) {
      if (ctx.windows.length === 0) return na;
      const violations: Violation[] = [];
      for (const win of ctx.windows) {
        for (const zone of clearanceZones(win, 0.35)) {
          // Any furniture taller than 120 cm shades the window — a deep wardrobe
          // blocks daylight more than a shallow shelf, not less, so depth is not a
          // qualifier here (the catalog condition is height-only).
          const tallInWay = ctx.design.furniture.filter(
            (f) => topOf(f) > 1.2 && convexOverlap(footprint(f), zone),
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
    id: 'LGT-06',
    title: 'Screens free of window reflections',
    category: 'Light',
    importance: 2,
    source: 'AFS 2020:1, best practice',
    check(ctx) {
      const tvs = ctx.byKind('tv');
      if (tvs.length === 0 || ctx.windows.length === 0) return na;
      const violations: Violation[] = [];
      for (const tv of tvs) {
        const screen = frontDir(tv.rotationY); // the screen faces this way
        for (const win of ctx.windows) {
          const toWin = sub(win.center, tv.position);
          const distance = Math.hypot(toWin.x, toWin.z);
          if (distance > 4) continue;
          if (dot(norm(toWin), screen) > 0.6) {
            violations.push({
              message: `"${tv.name}" faces the window — daylight reflects on the screen. Angle it away from the window or plan for a curtain.`,
              furnitureIds: [tv.id],
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
    id: 'COL-05',
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
    id: 'COL-06',
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
    id: 'FEN-26',
    title: 'Rugs zone an open-plan room',
    category: 'Feng shui',
    importance: 2,
    source: 'Feng shui (grounding chi); best practice (zoning)',
    twin: { id: 'COL-08', category: 'Color & textiles' },
    appliesTo: ['vardagsrum', 'matplats'],
    check(ctx) {
      const sofas = ctx.byKind('sofa');
      const diningTables = ctx.design.furniture.filter(isDiningTable);
      // Only an open-plan room — one that holds two different activity zones —
      // needs rugs to divide it; a single-function room does not.
      if (sofas.length === 0 || diningTables.length === 0) return na;
      const rugs = ctx.byKind('rug');
      const anchors = [
        ...sofas.map((f) => ({ f, zone: 'seating' as const })),
        ...diningTables.map((f) => ({ f, zone: 'dining' as const })),
      ];
      const violations: Violation[] = [];
      // 1. Each activity zone should sit on its own rug, so the areas read as
      //    separate "rooms" and each zone's energy (chi) stays grounded.
      for (const { f, zone } of anchors) {
        if (rugs.some((r) => convexOverlap(footprint(f), footprint(r)))) continue;
        violations.push({
          message: `The ${zone} area around "${f.name}" is not anchored by a rug — in an open-plan room a rug under each activity zone divides it into its own space and grounds the zone's energy.`,
          furnitureIds: [f.id],
        });
      }
      // 2. A single rug spanning both a seating and a dining anchor merges the
      //    two zones back into one — the opposite of dividing the space.
      for (const r of rugs) {
        const spanned = new Set(
          anchors.filter((a) => convexOverlap(footprint(a.f), footprint(r))).map((a) => a.zone),
        );
        if (spanned.size > 1) {
          violations.push({
            message: `"${r.name}" runs under both the seating and dining zones and merges them — give each zone its own rug so the areas stay distinct.`,
            furnitureIds: [r.id],
          });
        }
      }
      return fail(violations);
    },
  },
  {
    id: 'ACO-03',
    title: 'Plants for air and comfort',
    category: 'Acoustics & air',
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
    id: 'AES-04',
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
    id: 'AES-05',
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

