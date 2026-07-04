import { z } from 'zod';
import { FURNITURE_KINDS } from '../src/lib/furnitureCatalog.ts';

/**
 * Response schema for AI-generated furnishing proposals. Sent as --json-schema
 * to Claude Code (structured output) and used to validate the response.
 * No numeric bounds here — structured output does not support them; the
 * geometry is checked in validate.ts instead.
 */
const aiFurnitureSchema = z.strictObject({
  kind: z
    .enum(FURNITURE_KINDS)
    .describe('Furniture type from the catalog; "box" for furniture without a dedicated type.'),
  name: z.string().describe('Short name, e.g. "Double bed" or "Desk".'),
  x: z.number().describe('Center of the footprint, x in meters in the room coordinate system.'),
  z: z.number().describe('Center of the footprint, z in meters in the room coordinate system.'),
  facing: z
    .strictObject({
      x: z.number(),
      z: z.number(),
    })
    .describe(
      "A point (x, z) in the room that the furniture's FRONT should point toward. The server " +
        "computes and snaps the rotation in that direction. Examples: a chair's front points " +
        "toward the table's center; a sofa's toward the center of the room or the TV; a " +
        "wardrobe's toward a point a bit out into the room (away from the wall). Never " +
        'specify the same point as x/z.',
    ),
  againstWall: z
    .boolean()
    .describe(
      "true if the furniture's back should stand flush against the nearest wall (wardrobe, " +
        'bookshelf, bed, sofa, TV bench). The server then snaps the furniture flush against ' +
        'the wall and turns the front out into the room. false for freestanding furniture ' +
        '(table, rug, chair).',
    ),
  size: z.strictObject({
    width: z.number().describe("Width in meters (along the furniture's own x-axis)."),
    depth: z.number().describe("Depth in meters (along the furniture's own z-axis)."),
    height: z.number().describe('Height in meters.'),
  }),
  elevation: z
    .number()
    .describe(
      'Underside above the floor in meters. 0 for furniture standing on the floor; > 0 for wall-mounted items (shelves etc.).',
    ),
  color: z.string().describe("Color as #rrggbb, harmonized with the proposal's palette."),
  reasoning: z
    .string()
    .describe('One sentence: why the furniture is placed exactly here (rule/principle).'),
});

export const proposalsSchema = z.strictObject({
  proposals: z
    .array(
      z.strictObject({
        title: z.string().describe('Short title, e.g. "Light and airy".'),
        concept: z.string().describe("2–3 sentences about the proposal's core idea."),
        furniture: z.array(aiFurnitureSchema),
      }),
    )
    .describe('2–3 deliberately different proposals.'),
});

export type AiProposals = z.infer<typeof proposalsSchema>;
export type AiFurniture = z.infer<typeof aiFurnitureSchema>;

/**
 * A furniture item after the server has resolved `facing`/`againstWall` into a
 * concrete `rotationY` (radians) and possibly adjusted x/z (flush against a wall).
 * This is the shape that gets validated and sent to the client — same fields as
 * the client's AiFurniture (src/lib/aiProposals.ts).
 */
export interface ResolvedFurniture {
  kind: AiFurniture['kind'];
  name: string;
  x: number;
  z: number;
  rotationY: number;
  size: AiFurniture['size'];
  elevation: number;
  color: string;
  reasoning: string;
}

export interface ResolvedProposals {
  proposals: { title: string; concept: string; furniture: ResolvedFurniture[] }[];
}

// NOTE: the $schema key must be removed — with it, `claude --json-schema`
// silently drops the structured output (CLI 2.1.174).
const jsonSchema = z.toJSONSchema(proposalsSchema);
delete jsonSchema.$schema;
export const proposalsJsonSchema = jsonSchema;
