import { z } from 'zod';
import { FURNITURE_KINDS } from '../src/lib/furnitureCatalog.ts';

/**
 * Svarschema för AI-genererade inredningsförslag. Skickas som --json-schema
 * till Claude Code (strukturerad output) och används för validering av svaret.
 * Inga numeriska gränser här — de stöds inte av strukturerad output; geometrin
 * kontrolleras i stället i validate.ts.
 */
const aiFurnitureSchema = z.strictObject({
  kind: z
    .enum(FURNITURE_KINDS)
    .describe('Möbeltyp ur katalogen; "box" för möbler som saknar egen typ.'),
  name: z.string().describe('Kort svenskt namn, t.ex. "Dubbelsäng" eller "Skrivbord".'),
  x: z.number().describe('Fotavtryckets centrum, x i meter i rummets koordinatsystem.'),
  z: z.number().describe('Fotavtryckets centrum, z i meter i rummets koordinatsystem.'),
  facing: z
    .strictObject({
      x: z.number(),
      z: z.number(),
    })
    .describe(
      'En punkt (x, z) i rummet som möbelns FRAMSIDA ska peka mot. Servern räknar ut och ' +
        'snäpper rotationen åt det hållet. Exempel: en stols framsida pekar mot bordets ' +
        'mittpunkt; en soffas mot rummets mitt eller TV:n; en garderobs mot en punkt en bit ' +
        'ut i rummet (bort från väggen). Ange aldrig samma punkt som x/z.',
    ),
  againstWall: z
    .boolean()
    .describe(
      'true om möbelns rygg/baksida ska stå dikt mot närmaste vägg (garderob, bokhylla, ' +
        'säng, soffa, TV-bänk). Servern snäpper då möbeln flush mot väggen och vänder ' +
        'framsidan ut i rummet. false för fristående möbler (bord, matta, stol).',
    ),
  size: z.strictObject({
    width: z.number().describe('Bredd i meter (längs möbelns egen x-axel).'),
    depth: z.number().describe('Djup i meter (längs möbelns egen z-axel).'),
    height: z.number().describe('Höjd i meter.'),
  }),
  elevation: z
    .number()
    .describe(
      'Underkant över golvet i meter. 0 för möbler som står på golvet; > 0 för väggmonterat (hyllor o.dyl.).',
    ),
  color: z.string().describe('Färg som #rrggbb, harmoniserad med förslagets palett.'),
  reasoning: z
    .string()
    .describe('En mening på svenska: varför står möbeln just här (regel/princip).'),
});

export const proposalsSchema = z.strictObject({
  proposals: z
    .array(
      z.strictObject({
        title: z.string().describe('Kort titel på svenska, t.ex. "Ljust och luftigt".'),
        concept: z.string().describe('2–3 meningar om förslagets grundidé, på svenska.'),
        furniture: z.array(aiFurnitureSchema),
      }),
    )
    .describe('2–3 medvetet olika förslag.'),
});

export type AiProposals = z.infer<typeof proposalsSchema>;
export type AiFurniture = z.infer<typeof aiFurnitureSchema>;

/**
 * En möbel efter att servern löst upp `facing`/`againstWall` till en konkret
 * `rotationY` (radianer) och eventuellt justerat x/z (flush mot vägg). Det är den
 * här formen som valideras och skickas till klienten — samma fält som klientens
 * AiFurniture (src/lib/aiProposals.ts).
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

// OBS: $schema-nyckeln måste bort — med den tappar `claude --json-schema`
// tyst den strukturerade outputen (CLI 2.1.174).
const jsonSchema = z.toJSONSchema(proposalsSchema);
delete jsonSchema.$schema;
export const proposalsJsonSchema = jsonSchema;
