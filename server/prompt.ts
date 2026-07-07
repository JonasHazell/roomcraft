import type { Design } from '../src/types.ts';
import { FURNITURE_CATALOG } from '../src/lib/furnitureCatalog.ts';
import { floorPolygon, signedArea, wallDir, wallLen } from '../src/lib/polygon.ts';

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
- Every piece of furniture used daily must be REACHABLE: in front of its front side, the catalog's
  specified clearance ("fri_yta_framfor_m") must be free AND have an unbroken walking path back to a
  door. Never place a furniture item so it ends up trapped behind other furniture or in a corner
  with no way to reach it (e.g. a play table behind a wardrobe).
- Leave at least 0.7 m of free passage through the room and to every piece of furniture used daily.
- Do not block windows with furniture taller than 1.2 m.
- Wardrobes and bookshelves must stand with their backs against a wall (againstWall = true).

## Soft principles (apply and justify)
Feng shui:
- Bed in the command position: from the bed you can see the door, but the bed is not in line with the doorway.
- The bed's headboard against a solid wall, preferably not under a window. Nightstands on both sides if there is room.
- Sofa with its back against a wall, not floating with its back toward the door.
- Soft, unbroken movement flows from the door into the room; no furniture as the first obstacle inside the door.
- Balance: avoid putting all the visual weight on one side of the room.
Ergonomics and function:
- Desk/workspace near a window with daylight at an angle from the side.
- About 0.6 m of table edge per seat at a dining table; chairs need 0.75 m behind the table edge to be pulled out.
- Sofa–coffee table about 0.4 m; sofa–TV/bookshelf at least 2 m for viewing distance.
- Bed sides that are used need about 0.6 m of free space.

## Task
Produce 2–3 deliberately different proposals (e.g. "maximize space", "maximize coziness", "work focus").
Each proposal: a title, a short concept, and a complete furnishing that meets the user's needs.
Start from the catalog's default dimensions but adjust sizes reasonably when needed (e.g. bed 1.4/1.6/1.8 m).
Use "box" with a descriptive name for furniture missing from the catalog (e.g. desk, TV bench, armchair).
Choose colors that give a cohesive palette per proposal — including the floor and wall colours
(floorColor, wallColor) for the room, so different proposals can present distinct looks. Write all
user-facing text in English.
Respond only according to the given JSON schema.`;

const round = (v: number) => Math.round(v * 1000) / 1000;

/** Compact, self-explanatory room description for the model. */
function serializeRoom(design: Design) {
  const poly = floorPolygon(design.walls);
  return {
    takhojd_m: design.room.height,
    golvyta_m2: round(Math.abs(signedArea(poly))),
    golvpolygon: poly,
    vaggar: design.walls.map((w) => ({
      id: w.id,
      typ: w.kind === 'exterior' ? 'exterior wall' : 'interior wall',
      fran: w.a,
      till: w.b,
      langd_m: round(wallLen(w)),
    })),
    oppningar: design.openings.map((o) => {
      const wall = design.walls.find((w) => w.id === o.wallId);
      if (!wall) return { typ: o.kind, vagg: o.wallId, fel: 'wall missing' };
      const d = wallDir(wall);
      return {
        typ: o.kind === 'door' ? 'door' : 'window',
        vagg: o.wallId,
        fran: { x: round(wall.a.x + d.x * o.offset), z: round(wall.a.z + d.z * o.offset) },
        till: {
          x: round(wall.a.x + d.x * (o.offset + o.width)),
          z: round(wall.a.z + d.z * (o.offset + o.width)),
        },
        bredd_m: o.width,
        underkant_m: o.elevation,
        hojd_m: o.height,
      };
    }),
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

export function buildRepairPrompt(errors: string[]): string {
  return [
    'The automated check found the following errors in your proposal:',
    ...errors.map((e) => `- ${e}`),
    '',
    'Fix the errors and respond with ALL proposals again, complete and following the same JSON schema.',
    'Move or remove the furniture items that violate the requirements; keep everything that is already correct.',
  ].join('\n');
}
