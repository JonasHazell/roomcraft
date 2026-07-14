import type { Design } from '../src/types.ts';
import { FURNITURE_CATALOG } from '../src/lib/furnitureCatalog.ts';
import { floorPolygon, polygonBounds, signedArea, wallDir, wallLen } from '../src/lib/polygon.ts';
import type { Point } from '../src/types.ts';

export const SYSTEM_PROMPT = `You are an experienced interior designer. You are given a room (geometry as JSON) and
the user's needs, and you produce concrete furnishing proposals.

## Coordinate system and orientation
- The floor plane is (x, z) in meters; y points up and is always 0 for placements.
- A furniture item's position is the center of its footprint.
- You do NOT specify rotation directly. Instead you describe orientation semantically:
  - "facing": a point (x, z) in the room that the furniture's FRONT should point toward. See the
    catalog's "framsida" field for where the front is on each furniture type. Examples: a chair's facing =
    the table's center point; a sofa's facing = the center of the room or the TV; a wardrobe's facing =
    a point a bit out into the room, away from the wall it stands against.
  - "againstWall": true if the back should stand flush against the nearest wall (wardrobe, bookshelf,
    bed, sofa, TV bench). The server then snaps the furniture flush against the wall and turns the front
    the right way automatically — you only need to set the position roughly right and point facing outward.
  - The server computes and snaps the rotation (quarter turns) toward the facing point. So think about
    where the front should be facing, not about degrees: the desk chair toward the desk,
    the wardrobe doors out toward the room, the sofa's seating side toward the room.
- elevation is the height of the underside above the floor in meters: 0 for everything standing on the
  floor, > 0 for wall-mounted items (e.g. a shelf above the desk). Wall-mounted furniture must
  sit flush against a wall and must not end above the ceiling height.
- The room is bounded by the floor polygon; any interior walls partition the area.

## Hard requirements (checked mechanically — never violate these)
- The furniture's entire footprint (all four corners, accounting for rotation) must lie inside the floor polygon.
- In front of every door, a zone as wide as the door and 0.8 m deep must be completely clear (door swing). Rugs are exempt.
- Furniture must not overlap. Exceptions: rugs may lie under other furniture, and chairs may be pushed in under tables/work surfaces.
- Every piece of furniture used daily must be USABLE: in front of its front side, the catalog's
  specified clearance ("fri_yta_framfor_m") must be almost entirely free — not just a narrow sliver —
  AND have an unbroken walking path back to a door. The clear zone is where a person sits or stands to
  use the piece, so another item must not eat into it: a bed pushed up against the front of a desk, a
  wardrobe blocking the seat of a sofa, or a chest across the working side of a table all make that
  piece unusable even if you can still squeeze a foot in. One function must never borrow the space
  another needs. Never place a furniture item so it ends up trapped behind other furniture or in a
  corner with no way to reach it (e.g. a play table behind a wardrobe).
- Leave at least 0.7 m of free passage through the room and to every piece of furniture used daily.
- Do not block windows with furniture taller than 1.2 m.
- Wardrobes and bookshelves must stand with their backs against a wall (againstWall = true).

## Soft principles (apply and justify)
Feng shui:
- Bed in the command position: from the bed you can see the door, but the bed is not in line with the doorway.
- The bed's headboard against a solid wall, preferably not under a window. A double bed shared by two
  people gets a nightstand on each side if there is room; a single or child's bed takes at most one
  nightstand, never two.
- Sofa with its back against a wall, not floating with its back toward the door.
- Soft, unbroken movement flows from the door into the room; no furniture as the first obstacle inside the door.
- Keep the straight line between a door and a window (see "nyckeltal.dorr_fonster_avstand_m") clear of the
  bed and the main seat, so the chi/draft does not run straight across where people rest.
- Balance: avoid putting all the visual weight on one side of the room.
Ergonomics and function:
- Desk/workspace near a window with daylight at an angle from the side.
- About 0.6 m of table edge per seat at a dining table; chairs need 0.75 m behind the table edge to be pulled out.
- Sofa–coffee table about 0.4 m; sofa–TV/bookshelf at least 2 m for viewing distance.
- Bed sides that are used need about 0.6 m of free space.

## Task
Produce ONE furnishing proposal that follows the design direction given at the end of the user
message. A proposal is: a title, a short concept, and a complete furnishing that meets the user's needs.
If the message includes an "agreed furniture plan" (chosen by a separate planning step), furnish
EXACTLY from it: place every need-to-have item, add the nice-to-have items only where they fit without
breaking a hard requirement, and never invent furniture that is not on the list.
Start from the catalog's default dimensions but adjust sizes reasonably when needed (e.g. bed 1.4/1.6/1.8 m).
Use "box" with a descriptive name for furniture missing from the catalog (e.g. desk, TV bench, armchair).
Choose colors that give a cohesive palette — including the floor and wall colours (floorColor,
wallColor) for the room — so the proposal has a distinct look that fits its direction. Write all
user-facing text in English.
Respond only according to the given JSON schema.`;

/**
 * The distinct design directions requested in parallel — one model call per brief,
 * so the three proposals come back roughly as fast as one used to (see
 * server/index.ts). Kept deliberately different so the user gets a real choice,
 * the way the single big prompt used to ask for "3 deliberately different proposals".
 */
export const PROPOSAL_BRIEFS: readonly string[] = [
  '## Design direction: Maximise space\n' +
    'Favour an open, airy layout with a small footprint and clear sightlines. Keep the floor as ' +
    'uncluttered as possible and let the room breathe. Give it a fitting title and a light, spacious palette.',
  '## Design direction: Maximise coziness\n' +
    'Create a warm, inviting, layered room — soft groupings, a rug, and furniture arranged for comfort ' +
    'and togetherness. Give it a fitting title and a warm, enveloping palette.',
  '## Design direction: Work focus\n' +
    'Prioritise a functional, well-lit workspace (desk near daylight, proper clearances) while still ' +
    "meeting the user's other needs. Give it a fitting title and a calm, focused palette.",
];

const round = (v: number) => Math.round(v * 1000) / 1000;

/** Compact, self-explanatory room description for the model. */
function serializeRoom(design: Design) {
  const poly = floorPolygon(design.walls);
  const openings = design.openings.map((o) => {
    const wall = design.walls.find((w) => w.id === o.wallId);
    if (!wall) return { typ: o.kind, vagg: o.wallId, fel: 'wall missing', mid: null as Point | null };
    const d = wallDir(wall);
    const fran = { x: round(wall.a.x + d.x * o.offset), z: round(wall.a.z + d.z * o.offset) };
    const till = {
      x: round(wall.a.x + d.x * (o.offset + o.width)),
      z: round(wall.a.z + d.z * (o.offset + o.width)),
    };
    return {
      typ: o.kind === 'door' ? ('door' as const) : ('window' as const),
      vagg: o.wallId,
      fran,
      till,
      bredd_m: o.width,
      underkant_m: o.elevation,
      hojd_m: o.height,
      mid: { x: round((fran.x + till.x) / 2), z: round((fran.z + till.z) / 2) },
    };
  });

  return {
    takhojd_m: design.room.height,
    golvyta_m2: round(Math.abs(signedArea(poly))),
    golvpolygon: poly,
    nyckeltal: roomMetrics(poly, openings),
    vaggar: design.walls.map((w) => ({
      id: w.id,
      typ: w.kind === 'exterior' ? 'exterior wall' : 'interior wall',
      fran: w.a,
      till: w.b,
      langd_m: round(wallLen(w)),
    })),
    // Drop the internal `mid` helper from the emitted opening list.
    oppningar: openings.map(({ mid: _mid, ...rest }) => rest),
  };
}

/**
 * Concrete numbers the model reasons better with than prose: overall footprint,
 * the daylight budget (total window width), and the straight-line distances
 * between each door and each window — the axes used for daylight, cross-flow and
 * the feng-shui door↔window "drafting" line.
 */
function roomMetrics(poly: Point[], openings: Array<{ typ: string; mid: Point | null; bredd_m?: number }>) {
  const b = polygonBounds(poly);
  const doors = openings.filter((o) => o.typ === 'door' && o.mid);
  const windows = openings.filter((o) => o.typ === 'window' && o.mid);
  const dist = (a: Point, c: Point) => round(Math.hypot(a.x - c.x, a.z - c.z));
  return {
    rummets_matt_m: { bredd: round(b.maxX - b.minX), djup: round(b.maxZ - b.minZ) },
    antal_dorrar: doors.length,
    antal_fonster: windows.length,
    total_fonsterbredd_m: round(windows.reduce((s, w) => s + (w.bredd_m ?? 0), 0)),
    dorr_fonster_avstand_m: doors.flatMap((d, di) =>
      windows.map((w, wi) => ({
        dorr: di + 1,
        fonster: wi + 1,
        avstand_m: dist(d.mid as Point, w.mid as Point),
      })),
    ),
  };
}

export function buildUserPrompt(design: Design, needs: string): string {
  const catalog = Object.entries(FURNITURE_CATALOG).map(([kind, e]) => ({
    kind,
    namn: e.label,
    standardmatt_m: e.defaultSize,
    framsida: e.front,
    fri_yta_framfor_m: e.accessDepth,
  }));
  return [
    '## The room',
    JSON.stringify(serializeRoom(design), null, 1),
    '',
    '## Furniture catalog',
    JSON.stringify(catalog, null, 1),
    '',
    "## The user's needs",
    needs.trim(),
  ].join('\n');
}

export function buildRepairPrompt(findings: { message: string; blocking: boolean }[]): string {
  const must = findings.filter((f) => f.blocking).map((f) => f.message);
  const should = findings.filter((f) => !f.blocking).map((f) => f.message);
  const lines = ['An automated check found problems in your proposal.'];
  if (must.length > 0) {
    lines.push(
      '',
      'MUST fix — hard requirements (safety, accessibility, fit); never leave these:',
      ...must.map((m) => `- ${m}`),
    );
  }
  if (should.length > 0) {
    lines.push(
      '',
      'SHOULD improve where possible (ergonomics and placement):',
      ...should.map((m) => `- ${m}`),
    );
  }
  lines.push(
    '',
    'Respond with the full proposal again, complete and following the same JSON schema.',
    'Move, resize or replace the furniture that violates a requirement; keep everything that is already correct.',
  );
  return lines.join('\n');
}
