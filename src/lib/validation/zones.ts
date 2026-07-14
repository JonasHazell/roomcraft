import type { Design, FurnitureItem, Point } from '../../types';
import { footprint, quadGap } from './geo.ts';
import { isCoffeeTable, isDiningTable } from './ruleHelpers.ts';

/**
 * A functional area of the room, inferred purely from the furniture. Each zone
 * is centred on one or more *anchor* pieces (the piece that defines the
 * activity) and gathers the *satellites* that serve it. The room's inferred
 * type (see {@link inferRoomTypes}) is the set of zone kinds present.
 */
export type ZoneKind = 'sleeping' | 'seating' | 'dining' | 'work';

/** Human-readable name used in rule messages ("the sleeping area", …). */
export const ZONE_LABEL: Record<ZoneKind, string> = {
  sleeping: 'sleeping',
  seating: 'seating',
  dining: 'dining',
  work: 'work',
};

export interface ZoneMember {
  item: FurnitureItem;
  /** True for the pieces that define the zone (bed, sofa, dining table, desk). */
  anchor: boolean;
  /** Edge-to-edge gap (m) to the nearest anchor; 0 for anchors. */
  gapToAnchor: number;
}

export interface Zone {
  kind: ZoneKind;
  anchors: FurnitureItem[];
  members: ZoneMember[];
  /** Centroid of the anchor pieces. */
  center: Point;
}

/**
 * How far (edge-to-edge, m) a satellite of each kind may sit from its nearest
 * anchor and still read as part of the same zone. Beyond this the piece is a
 * stray and the zone no longer "hangs together" (rule ZON-01).
 */
export const ZONE_GAP: Record<ZoneKind, number> = {
  sleeping: 0.4, // a nightstand hugs the bed
  seating: 2.5, // an armchair / coffee table stays within the seating group
  dining: 0.6, // a chair pulled up to the table
  work: 0.7, // the desk chair
};

/**
 * The looser radius used only to *assign* a chair to a zone (dining vs work vs
 * seating). Wider than {@link ZONE_GAP} so a chair that has drifted a bit is
 * still recognised as belonging to the table/desk — and can then be flagged as
 * a stray by ZON-01 — rather than silently becoming an unrelated armchair.
 */
const CHAIR_ASSIGN_GAP = 1.2;

function centroid(items: FurnitureItem[]): Point {
  if (items.length === 0) return { x: 0, z: 0 };
  return {
    x: items.reduce((s, f) => s + f.position.x, 0) / items.length,
    z: items.reduce((s, f) => s + f.position.z, 0) / items.length,
  };
}

/** Smallest edge-to-edge gap from `f` to any of the `anchors` (Infinity if none). */
function nearestGap(f: FurnitureItem, anchors: FurnitureItem[]): number {
  let best = Infinity;
  const q = footprint(f);
  for (const a of anchors) best = Math.min(best, quadGap(q, footprint(a)));
  return best;
}

/**
 * Divides the furniture into functional zones. A zone is created only when its
 * anchor is present; satellites without an anchor (e.g. a nightstand in a room
 * with no bed) are left unassigned because there is no activity to judge them
 * against. Chairs are routed to the dining, work or seating zone by proximity.
 */
export function inferZones(design: Design): Zone[] {
  const beds = design.furniture.filter((f) => f.kind === 'bed');
  const sofas = design.furniture.filter((f) => f.kind === 'sofa');
  const desks = design.furniture.filter((f) => f.kind === 'desk');
  const diningTables = design.furniture.filter(isDiningTable);

  // Route each chair to the closest activity it plausibly serves.
  const chairZone = (chair: FurnitureItem): ZoneKind | null => {
    const dining = diningTables.length ? nearestGap(chair, diningTables) : Infinity;
    const work = desks.length ? nearestGap(chair, desks) : Infinity;
    if (dining <= CHAIR_ASSIGN_GAP && dining <= work) return 'dining';
    if (work <= CHAIR_ASSIGN_GAP) return 'work';
    return sofas.length ? 'seating' : null; // a lone armchair without a sofa has no group
  };

  const zones: Zone[] = [];

  const build = (kind: ZoneKind, anchors: FurnitureItem[], satellites: FurnitureItem[]): void => {
    if (anchors.length === 0) return;
    const members: ZoneMember[] = [
      ...anchors.map((item) => ({ item, anchor: true, gapToAnchor: 0 })),
      ...satellites.map((item) => ({
        item,
        anchor: false,
        gapToAnchor: nearestGap(item, anchors),
      })),
    ];
    zones.push({ kind, anchors, members, center: centroid(anchors) });
  };

  build(
    'sleeping',
    beds,
    design.furniture.filter((f) => f.kind === 'nightstand'),
  );
  build(
    'work',
    desks,
    design.furniture.filter((f) => f.kind === 'chair' && chairZone(f) === 'work'),
  );
  build(
    'dining',
    diningTables,
    design.furniture.filter((f) => f.kind === 'chair' && chairZone(f) === 'dining'),
  );
  build('seating', sofas, [
    ...design.furniture.filter((f) => isCoffeeTable(f)),
    ...design.furniture.filter((f) => f.kind === 'chair' && chairZone(f) === 'seating'),
  ]);

  return zones;
}

/** All anchor pieces across every zone (beds, sofas, dining tables, desks). */
export function zoneAnchors(design: Design): FurnitureItem[] {
  return inferZones(design).flatMap((z) => z.anchors);
}
