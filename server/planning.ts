import { z } from 'zod';
import { FURNITURE_KINDS } from '../src/lib/furnitureCatalog.ts';
import type { Design } from '../src/types.ts';
import { runClaude, type ChatMessages } from './claude.ts';
import { buildUserPrompt } from './prompt.ts';

/**
 * Phase 1 of proposal generation: decide WHICH furniture the room should contain
 * before any of it is placed. Splitting "what" from "where" fixes a whole class of
 * bad output that the geometric placement checks can never catch — e.g. two
 * nightstands beside a single bed — because those are errors in the shopping list,
 * not in the layout. The list this produces is validated semantically ({@link
 * checkPlan}) and then handed, unchanged, to every design direction's placement
 * call, so the three proposals furnish the same coherent set (see server/index.ts).
 */
export const PLANNING_SYSTEM_PROMPT = `You are an experienced interior designer. Given a room (geometry as JSON) and the
user's needs, decide WHICH furniture the room should contain — a shopping list, not a layout. You place
nothing; a later step arranges whatever you choose.

Split every item into a priority:
- "need": essential to meet the stated needs (a bed for a bedroom, a desk if they must work at home).
- "nice": would improve the room but can be dropped if it does not fit (a rug, a plant, an armchair).

Rules for a sensible list:
- Choose the fewest pieces that genuinely meet the needs; do not pad the room with furniture nobody asked for.
- Match quantities to how the furniture is actually used. Set "sleeps" to how many people sleep in a bed
  (1 or 2): a single or child's bed takes AT MOST ONE nightstand; only a double bed shared by two people
  warrants two. One wardrobe, desk or sofa per person or purpose unless the needs clearly call for more.
- Every item must trace back to a stated need or to sound, uncontroversial design sense.
- Prefer catalog kinds; use "box" with a descriptive name for anything without a dedicated kind
  (armchair, TV bench, chest of drawers, sideboard).
- Respect the room's size (see "golvyta_m2"): do not plan more than can plausibly fit.

Set "sleeps" to the number of sleepers for a bed, and 0 for every non-bed item.
Respond only according to the given JSON schema.`;

const planItemSchema = z.strictObject({
  kind: z
    .enum(FURNITURE_KINDS)
    .describe('Furniture type from the catalog; "box" for furniture without a dedicated type.'),
  name: z.string().describe('Short name, e.g. "Double bed", "Desk", "Reading armchair".'),
  quantity: z
    .number()
    .describe('How many of this item the room should have (a whole number, at least 1).'),
  priority: z
    .enum(['need', 'nice'])
    .describe('"need" = essential to meet the stated needs; "nice" = optional, may be dropped if it does not fit.'),
  sleeps: z
    .number()
    .describe('For a bed: how many people sleep in it (1 or 2). 0 for every non-bed item.'),
  reason: z.string().describe('One short sentence: which need or design principle this item serves.'),
});

export const planSchema = z.strictObject({
  items: z.array(planItemSchema).describe('The furniture the room should contain.'),
});

export type FurniturePlan = z.infer<typeof planSchema>;
export type PlanItem = z.infer<typeof planItemSchema>;

const planJson = z.toJSONSchema(planSchema);
delete planJson.$schema;
export const planJsonSchema = planJson;

const qty = (n: number) => Math.max(0, Math.round(n));

/**
 * Semantic checks on the furniture list itself — the counterpart to the geometric
 * checks in ruleValidation.ts, which only ever see a placed layout. These catch
 * "wrong set of furniture" mistakes: nightstands that outnumber the bed sides they
 * could sit beside, or nightstands with no bed at all. Returns human-readable
 * problems (empty when the list is coherent); each is fed back to the model for one
 * revision round in {@link generatePlan}.
 */
export function checkPlan(plan: FurniturePlan): string[] {
  const findings: string[] = [];

  const beds = plan.items.filter((i) => i.kind === 'bed');
  const bedCount = beds.reduce((n, b) => n + Math.max(1, qty(b.quantity)), 0);
  // The most nightstands the beds can justify: two per double bed (sleeps ≥ 2), one per single.
  const maxNightstands = beds.reduce(
    (n, b) => n + Math.max(1, qty(b.quantity)) * (Math.round(b.sleeps) >= 2 ? 2 : 1),
    0,
  );
  const nightstands = plan.items
    .filter((i) => i.kind === 'nightstand')
    .reduce((n, i) => n + qty(i.quantity), 0);

  if (nightstands > 0 && bedCount === 0) {
    findings.push(
      `The plan has ${nightstands} nightstand(s) but no bed for them to sit beside — drop them or add the bed they belong to.`,
    );
  } else if (nightstands > maxNightstands) {
    findings.push(
      `The plan has ${nightstands} nightstands for ${bedCount} bed(s): a single bed warrants at most one nightstand and a double bed at most two, so plan no more than ${maxNightstands}.`,
    );
  }

  return findings;
}

/** Turns a checked plan into the "agreed furniture plan" block appended to every placement call. */
export function buildPlanBrief(plan: FurniturePlan): string {
  const line = (i: PlanItem) => {
    const n = Math.max(1, qty(i.quantity));
    const reason = i.reason.trim();
    return `- ${n}× ${i.name} (${i.kind})${reason ? ` — ${reason}` : ''}`;
  };
  const need = plan.items.filter((i) => i.priority === 'need');
  const nice = plan.items.filter((i) => i.priority === 'nice');
  return [
    '## Agreed furniture plan',
    'A separate planning step chose the furniture for this room from the needs. Furnish from exactly this list:',
    '',
    'Need-to-have — every one of these MUST appear, in the stated quantity:',
    ...(need.length ? need.map(line) : ['- (none)']),
    '',
    'Nice-to-have — include as many as fit WITHOUT breaking any hard requirement; omit any that would not fit:',
    ...(nice.length ? nice.map(line) : ['- (none)']),
    '',
    'Do not invent furniture that is not on this list and do not exceed the stated quantities. You still ' +
      'choose sizes, colours and exact placement. If a need-to-have item genuinely cannot fit, place it as ' +
      'best you can rather than dropping it.',
  ].join('\n');
}

/** Repair turn sent to the planner when {@link checkPlan} finds problems with the list. */
function buildPlanRepairPrompt(findings: string[]): string {
  return [
    'A check found problems with the furniture list:',
    ...findings.map((f) => `- ${f}`),
    '',
    'Revise the list to fix these and respond again following the same JSON schema. Keep the items that are already sensible.',
  ].join('\n');
}

/**
 * Runs the planning phase: one model call to choose the furniture, then a single
 * self-critique round if {@link checkPlan} flags the list. The room + catalog +
 * needs context is sent as a cached block so the (rare) repair turn — and the
 * placement calls that reuse the identical prefix — are cheaper. The revision is
 * only kept when it is no worse than the original, so a bad repair can't degrade
 * the plan.
 */
export async function generatePlan(
  design: Design,
  needs: string,
  model: string,
  signal?: AbortSignal,
): Promise<{ plan: FurniturePlan; costUsd: number; calls: number }> {
  const shared = buildUserPrompt(design, needs);
  const messages: ChatMessages = [
    { role: 'user', content: [{ type: 'text', text: shared, cache_control: { type: 'ephemeral' } }] },
  ];

  const first = await runClaude({
    messages,
    systemPrompt: PLANNING_SYSTEM_PROMPT,
    jsonSchema: planJsonSchema,
    model,
    signal,
  });
  // Accumulate cost/calls so the caller can fold the planning phase into the
  // per-request total alongside the placement calls.
  let costUsd = first.costUsd;
  let calls = 1;
  console.log(
    `[proposals] plan: first response done (${(first.durationMs / 1000).toFixed(1)} s, ` +
      `~$${first.costUsd.toFixed(4)}; tokens in ${first.usage.inputTokens}, ` +
      `cache write ${first.usage.cacheWriteTokens}, cache read ${first.usage.cacheReadTokens}, ` +
      `out ${first.usage.outputTokens})`,
  );
  let plan = planSchema.parse(first.structuredOutput);
  const findings = checkPlan(plan);
  if (findings.length === 0) return { plan, costUsd, calls };

  messages.push(first.assistant, { role: 'user', content: buildPlanRepairPrompt(findings) });
  const repaired = await runClaude({
    messages,
    systemPrompt: PLANNING_SYSTEM_PROMPT,
    jsonSchema: planJsonSchema,
    model,
    signal,
  });
  costUsd += repaired.costUsd;
  calls += 1;
  console.log(
    `[proposals] plan: repair done (${(repaired.durationMs / 1000).toFixed(1)} s, ` +
      `~$${repaired.costUsd.toFixed(4)}; tokens in ${repaired.usage.inputTokens}, ` +
      `cache write ${repaired.usage.cacheWriteTokens}, cache read ${repaired.usage.cacheReadTokens}, ` +
      `out ${repaired.usage.outputTokens})`,
  );
  const revised = planSchema.parse(repaired.structuredOutput);
  // Only accept the revision if it fixed things (fewer problems), never if it made them worse.
  if (checkPlan(revised).length < findings.length) plan = revised;
  return { plan, costUsd, calls };
}
