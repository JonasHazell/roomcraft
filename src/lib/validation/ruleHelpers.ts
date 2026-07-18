import type { Design, FurnitureItem, FurnitureKind, Point } from '../../types';
import { floorPolygon, pointInPolygon } from '../polygon.ts';
import {
  add,
  blockers,
  convexOverlap,
  footprint,
  frontDir,
  nearestWall,
  openingInfos,
  rightDir,
  stripZone,
} from './geo.ts';
import type { RuleCtx, RoomType, RuleOutcome, Violation } from './ruleTypes';
import { inferZones } from './zones.ts';

/** Minimum mattress width counted as a double bed (needs access on both sides). */
export const DOUBLE_BED_MIN_WIDTH = 1.35;

export const na: RuleOutcome = { status: 'not-applicable' };
export const ok: RuleOutcome = { status: 'passed' };

export function fail(violations: Violation[]): RuleOutcome {
  return violations.length > 0 ? { status: 'violated', violations } : ok;
}

export function isDiningTable(f: FurnitureItem): boolean {
  return f.kind === 'table' && f.size.height >= 0.6 && f.size.height <= 0.9;
}

export function isCoffeeTable(f: FurnitureItem): boolean {
  return f.kind === 'table' && f.size.height < 0.6;
}

export function topOf(f: FurnitureItem): number {
  return f.elevation + f.size.height;
}

/** Midpoint of the back edge (opposite the front). */
export function backEdgeMid(f: FurnitureItem): Point {
  return add(f.position, frontDir(f.rotationY), -f.size.depth / 2);
}

/** True if the back of the furniture sits flush (≤ tol) against a wall. */
export function backAgainstWall(design: Design, f: FurnitureItem, tol = 0.18) {
  const hit = nearestWall(design, backEdgeMid(f));
  return hit && hit.distance <= tol ? hit.wall : null;
}

/** Zone along one of the furniture's long sides (side = ±1 along the right axis), depth outward. */
export function sideZone(f: FurnitureItem, side: 1 | -1, depth: number): Point[] {
  const fwd = frontDir(f.rotationY);
  const right = rightDir(f.rotationY);
  const n = { x: right.x * side, z: right.z * side };
  const edgeMid = add(f.position, n, f.size.width / 2);
  const s = add(edgeMid, fwd, -f.size.depth / 2);
  const e = add(edgeMid, fwd, f.size.depth / 2);
  return stripZone(s, e, n, depth);
}

/** Zone in front of the furniture's front face, as wide as the piece. */
export function frontZone(f: FurnitureItem, depth: number): Point[] {
  const fwd = frontDir(f.rotationY);
  const right = rightDir(f.rotationY);
  const faceMid = add(f.position, fwd, f.size.depth / 2);
  const s = add(faceMid, right, -f.size.width / 2);
  const e = add(faceMid, right, f.size.width / 2);
  return stripZone(s, e, fwd, depth);
}

/**
 * Fraction (0–1) of the clearance rectangle in front of `f` — as wide as the
 * piece and `depth` deep — that is inside the room and free of blocking
 * furniture, sampled on a ~10 cm grid. This measures how *usable* the space in
 * front of a piece really is, rather than just whether a single sliver is free:
 * a bed shoved against the front of a desk drives the fraction toward zero even
 * though a walking path still reaches the last free cell. `ignore` exempts
 * blockers that legitimately belong in the zone (e.g. a coffee table in front of
 * a sofa). Non-blocking pieces (chairs, rugs) never count against the clearance.
 */
export function frontClearFraction(
  design: Design,
  poly: Point[],
  f: FurnitureItem,
  depth: number,
  ignore: (b: FurnitureItem) => boolean = () => false,
): number {
  const fwd = frontDir(f.rotationY);
  const right = rightDir(f.rotationY);
  const faceMid = add(f.position, fwd, f.size.depth / 2);
  const obstacles = blockers(design.furniture, new Set([f.id]))
    .filter((b) => !ignore(b))
    .map(footprint);
  const nu = Math.max(1, Math.round(f.size.width / 0.1));
  const nv = Math.max(1, Math.round(depth / 0.1));
  let total = 0;
  let clear = 0;
  for (let iu = 0; iu < nu; iu++) {
    for (let iv = 0; iv < nv; iv++) {
      const p = add(
        add(faceMid, right, ((iu + 0.5) / nu - 0.5) * f.size.width),
        fwd,
        ((iv + 0.5) / nv) * depth,
      );
      total++;
      if (!pointInPolygon(p, poly)) continue; // outside the room / behind a wall
      if (obstacles.some((q) => pointInPolygon(p, q))) continue; // under a blocker
      clear++;
    }
  }
  return total > 0 ? clear / total : 1;
}

/** Blocking furniture that overlaps the zone. */
export function blockersInZone(
  ctx: RuleCtx,
  zone: Point[],
  except: Set<string> = new Set(),
  minTop = 0,
): FurnitureItem[] {
  return blockers(ctx.design.furniture, except).filter(
    (f) => topOf(f) > minTop && convexOverlap(footprint(f), zone),
  );
}

export function names(items: FurnitureItem[]): string {
  return items.map((f) => `"${f.name}"`).join(', ');
}

/**
 * Seats that belong to a conversation group: sofas plus the armchairs the
 * engine assigns to the seating zone. Chairs the engine routes to the dining
 * or work zone (a chair pulled up to a dining table, or a desk chair facing
 * its desk) are excluded, so living-room rules don't fire on them. This reuses
 * {@link inferZones}' own chair-to-zone assignment rather than a separate
 * dining-only proximity test, keeping it consistent with the rest of the engine.
 */
export function seatingSeats(design: Design): FurnitureItem[] {
  const seating = inferZones(design).find((z) => z.kind === 'seating');
  if (!seating) return [];
  return seating.members
    .map((m) => m.item)
    .filter((f) => f.kind === 'sofa' || f.kind === 'chair');
}

/** Infers room types from the furnishing (mixed rooms can yield several). */
export function inferRoomTypes(design: Design): Set<RoomType> {
  const kinds = new Set(design.furniture.map((f) => f.kind));
  const types = new Set<RoomType>();
  if (kinds.has('bed')) types.add('sovrum');
  if (kinds.has('sofa')) types.add('vardagsrum');
  if (kinds.has('desk')) types.add('hemmakontor');
  if (design.furniture.some(isDiningTable) && kinds.has('chair')) types.add('matplats');
  if (kinds.has('counter') || kinds.has('stove') || kinds.has('fridge')) types.add('kök');
  if (kinds.has('toilet') || kinds.has('bathtub') || kinds.has('sink')) types.add('badrum');
  return types;
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
