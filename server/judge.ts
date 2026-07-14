import { z } from 'zod';
import { runClaude } from './claude.ts';
import type { ProposalScore } from './ruleValidation.ts';
import type { ResolvedProposals } from './schema.ts';

/**
 * Optional final ranking step. The deterministic score (server/ruleValidation.ts)
 * already orders proposals on hard failures then a weighted 0–100 rule total, but
 * it is blind to holistic fit — how well a layout actually reads as a room for the
 * stated needs, how coherent the palette is, whether the concept lands. When
 * AI_JUDGE is enabled, one cheap model call re-ranks the already-generated set on
 * exactly that, best first. It never drops or edits a proposal (the user still sees
 * every direction) — it only reorders, so the strongest starting point leads.
 *
 * Off by default: it adds one extra call per request, so it stays an opt-in knob
 * (like AI_TWO_PHASE) rather than a cost every request pays.
 */
export const JUDGE_ENABLED = ['1', 'true', 'on', 'yes'].includes(
  (process.env.AI_JUDGE ?? '').trim().toLowerCase(),
);

const JUDGE_SYSTEM_PROMPT = `You are an experienced interior designer choosing which of several furnishing
proposals best serves a client. Each proposal already passed automated safety and fit checks; your job is
the holistic judgement those checks cannot make: which layout reads as the most liveable, coherent room
for THIS client's stated needs — good flow and function, a palette that hangs together, and a concept that
genuinely fits the brief. Rank them best first. Do not invent or edit proposals; only order the ones given.
Respond only according to the given JSON schema.`;

const judgeSchema = z.strictObject({
  order: z
    .array(z.number())
    .describe('The proposal numbers, best first. Include every number exactly once.'),
  reason: z
    .string()
    .describe("One sentence: why the top proposal best furnishes the room for the client's needs."),
});

const judgeJsonSchema = z.toJSONSchema(judgeSchema);
delete judgeJsonSchema.$schema;

/** A generated proposal paired with its deterministic score — what the judge ranks. */
interface Ranked {
  proposal: ResolvedProposals['proposals'][number];
  score: ProposalScore;
}

/** Compact, judge-facing summary of one proposal: the concept plus what's in it. */
function summarize(r: Ranked, index: number): string {
  const p = r.proposal;
  const pieces = p.furniture.map((f) => f.name).join(', ') || '(empty)';
  return [
    `### Proposal ${index}: ${p.title}`,
    p.concept,
    `Palette: floor ${p.floorColor}, walls ${p.wallColor}.`,
    `Furniture: ${pieces}.`,
  ].join('\n');
}

/**
 * Reorders `order` into a full permutation of `[0, n)`: valid, in-range, first-seen
 * indices are kept in the model's order, then any index it dropped or duplicated is
 * appended in the original order. So even a partial or dirty response still yields a
 * complete, deterministic ranking rather than losing a proposal.
 */
function normalizeOrder(order: number[], n: number): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const i of order) {
    if (Number.isInteger(i) && i >= 0 && i < n && !seen.has(i)) {
      seen.add(i);
      result.push(i);
    }
  }
  for (let i = 0; i < n; i++) if (!seen.has(i)) result.push(i);
  return result;
}

/**
 * Re-ranks the proposals holistically with a single model call, best first. `items`
 * comes in already sorted by the deterministic score, so on any failure — a bad
 * response, a model error — it is returned unchanged and the caller still gets that
 * ordering. Returns a new array; never mutates the input or its proposals.
 */
export async function rankByJudge<T extends Ranked>(
  items: T[],
  needs: string,
  model: string,
): Promise<T[]> {
  if (items.length <= 1) return items;

  const userPrompt = [
    "## The client's needs",
    needs.trim(),
    '',
    '## The proposals',
    ...items.map((r, i) => summarize(r, i)),
    '',
    `Rank all ${items.length} proposals (numbers 0–${items.length - 1}) best first.`,
  ].join('\n');

  try {
    const result = await runClaude({
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt: JUDGE_SYSTEM_PROMPT,
      jsonSchema: judgeJsonSchema,
      model,
      maxTokens: 1000,
    });
    const parsed = judgeSchema.safeParse(result.structuredOutput);
    if (!parsed.success) {
      console.error('[judge] response did not match schema; keeping deterministic order.');
      return items;
    }
    const order = normalizeOrder(parsed.data.order, items.length);
    console.log(`[judge] re-ranked ${items.length} proposals; top pick: ${parsed.data.reason}`);
    return order.map((i) => items[i]);
  } catch (e) {
    console.error('[judge] ranking failed; keeping deterministic order:', e);
    return items;
  }
}
