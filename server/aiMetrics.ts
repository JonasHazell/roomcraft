import { randomUUID } from 'node:crypto';
import { pool } from './db.ts';
import type { ClaudeUsage } from './claude.ts';

/**
 * How one `/api/proposals` request is classified once it's done, for the
 * `ai_generations.outcome` column:
 * - `success` — delivered proposals, no repair/polish round was needed anywhere.
 * - `repaired` — delivered proposals, but at least one repair or polish round ran
 *   (the planning phase's self-critique round, or a per-proposal repair/polish
 *   round — see server/planning.ts / server/index.ts).
 * - `timed_out` — the generation was aborted mid-flight because the client
 *   disconnected, backgrounded the tab, or hit its own request timeout (both
 *   read the same way server-side: `res`'s 'close' event firing before the
 *   response was sent — see server/index.ts's `onClientClose`).
 * - `failed` — the generation threw for a real reason (every direction failed,
 *   an API error, a bad response) while the client was still connected.
 */
export type AiGenerationOutcome = 'success' | 'repaired' | 'failed' | 'timed_out';

export interface AiGenerationRecord {
  durationMs: number;
  /** Null when the outcome ended before a reliable total was available. */
  costUsd: number | null;
  usage: ClaudeUsage | null;
  calls: number | null;
  outcome: AiGenerationOutcome;
}

/**
 * Persists one row per AI furnishing generation into `ai_generations` (see
 * server/db.ts's `initSchema`) — the durability half of the `[proposals]`
 * cost/latency/token console logs (server/planning.ts, server/index.ts), which
 * otherwise evaporate the moment they scroll past, per #402.
 *
 * Fire-and-forget, mirroring the failure-isolation guard
 * src/lib/safeStorage.ts's `safeSetItem` uses for localStorage writes: wrapped
 * in its own try/catch that swallows every error (never throws), and the
 * caller must NOT `await` it in the request path — call it and move on, so a
 * metrics-logging failure (or a merely slow one) can never fail or delay the
 * actual generation response. A no-op when no database is configured (no
 * `DATABASE_URL`), the same "absent → feature just doesn't run" pattern
 * `db.ts`'s `authEnabled` already establishes for the auth system.
 */
export async function recordAiGeneration(record: AiGenerationRecord): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO ai_generations
         (id, duration_ms, cost_usd, input_tokens, cache_write_tokens, cache_read_tokens, output_tokens, calls, outcome)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        Math.max(0, Math.round(record.durationMs)),
        record.costUsd,
        record.usage?.inputTokens ?? null,
        record.usage?.cacheWriteTokens ?? null,
        record.usage?.cacheReadTokens ?? null,
        record.usage?.outputTokens ?? null,
        record.calls,
        record.outcome,
      ],
    );
  } catch (e) {
    // Never let a metrics-logging failure surface to the user or affect the
    // generation result — log and move on, exactly like safeSetItem's guard.
    console.error('[ai-metrics] could not record AI generation (non-fatal):', e);
  }
}
