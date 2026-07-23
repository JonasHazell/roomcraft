import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { authEnabled, pool } from '../server/db.ts';

/**
 * Aggregates `ai_generations` (server/db.ts, written by server/aiMetrics.ts's
 * `recordAiGeneration`) into the compact, checked-in snapshot
 * `docs/AI_RUNTIME_METRICS.md` — the durability half of #402: Stage C's own
 * `AGENT_METRICS.md` snapshot has repeatedly read "not sampled this run" for AI
 * latency/cost/reliability because Stage C runs in a fresh, GitHub-only session
 * with no access to the production server's console logs the numbers were only
 * ever printed to. This script (run on a schedule by
 * `.github/workflows/export-ai-metrics.yml`) is how those numbers become
 * something a GitHub-only session can read directly from the repo, the same way
 * it already reads every other agent-pipeline doc.
 *
 * No-op, by design, exactly like `db.ts`'s own `authEnabled` gate: with no
 * `DATABASE_URL` there is nothing to read, so the doc is left untouched rather
 * than overwritten with a misleading "no data" state.
 */

/** One row read back from `ai_generations`, in the shape server/aiMetrics.ts writes. */
export interface GenerationRow {
  createdAt: string;
  durationMs: number;
  costUsd: number | null;
  calls: number | null;
  outcome: 'success' | 'repaired' | 'failed' | 'timed_out';
}

export interface MetricsSummary {
  windowSize: number;
  oldestAt: string | null;
  newestAt: string | null;
  medianDurationMs: number | null;
  p95DurationMs: number | null;
  totalCostUsd: number;
  costSampleCount: number;
  avgCallsPerProposal: number | null;
  callsSampleCount: number;
  outcomeCounts: Record<GenerationRow['outcome'], number>;
  /** (failed + timed_out) ÷ windowSize, or null when the window is empty. */
  failureTimeoutRate: number | null;
}

function median(sortedAsc: number[]): number | null {
  if (sortedAsc.length === 0) return null;
  const mid = Math.floor(sortedAsc.length / 2);
  return sortedAsc.length % 2 === 0
    ? (sortedAsc[mid - 1] + sortedAsc[mid]) / 2
    : sortedAsc[mid];
}

/** Nearest-rank percentile (p in [0, 100]) over an ascending-sorted array. */
function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1));
  return sortedAsc[idx];
}

/**
 * Pure aggregation over already-fetched rows — no I/O, so this (and
 * {@link renderMarkdown}) are unit-testable without a database.
 */
export function summarize(rows: GenerationRow[]): MetricsSummary {
  const durationsAsc = rows.map((r) => r.durationMs).sort((a, b) => a - b);
  const costs = rows.map((r) => r.costUsd).filter((c): c is number => c !== null);
  const calls = rows.map((r) => r.calls).filter((c): c is number => c !== null);
  const times = rows.map((r) => r.createdAt).sort();

  const outcomeCounts: Record<GenerationRow['outcome'], number> = {
    success: 0,
    repaired: 0,
    failed: 0,
    timed_out: 0,
  };
  for (const r of rows) outcomeCounts[r.outcome]++;

  const windowSize = rows.length;
  return {
    windowSize,
    oldestAt: times[0] ?? null,
    newestAt: times[times.length - 1] ?? null,
    medianDurationMs: median(durationsAsc),
    p95DurationMs: percentile(durationsAsc, 95),
    totalCostUsd: costs.reduce((sum, c) => sum + c, 0),
    costSampleCount: costs.length,
    avgCallsPerProposal: calls.length ? calls.reduce((sum, c) => sum + c, 0) / calls.length : null,
    callsSampleCount: calls.length,
    outcomeCounts,
    failureTimeoutRate: windowSize
      ? (outcomeCounts.failed + outcomeCounts.timed_out) / windowSize
      : null,
  };
}

const fmtSeconds = (ms: number | null): string => (ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`);
const fmtUsd = (usd: number): string => `$${usd.toFixed(4)}`;
const fmtPct = (frac: number | null): string => (frac === null ? '—' : `${(frac * 100).toFixed(1)}%`);
const fmtCount = (n: number | null): string => (n === null ? '—' : n.toFixed(1));

/** Renders the compact shape `AGENT_METRICS.md`'s product-observability table expects. */
export function renderMarkdown(summary: MetricsSummary, generatedAt: Date): string {
  const { outcomeCounts } = summary;
  const windowNote =
    summary.windowSize === 0
      ? 'No AI generations recorded yet in `ai_generations`.'
      : `Window: last ${summary.windowSize} generation(s), ${summary.oldestAt} → ${summary.newestAt}.`;

  return `# AI runtime metrics

This file is a **machine-generated snapshot**, not a hand-maintained doc — do not
edit it directly, edits will be overwritten by the next scheduled run. It exists so
a fresh, GitHub-only session (Stage C of the agent pipeline, see
[\`AGENT_ANALYSIS.md\`](AGENT_ANALYSIS.md)) can read real AI cost/latency/reliability
numbers straight from the repo, instead of from production server console logs it has
no access to — see [\`AGENT_METRICS.md\`](AGENT_METRICS.md)'s "Product observability"
section and issue #402.

Generated by [\`scripts/export-ai-metrics.ts\`](../scripts/export-ai-metrics.ts) from the
\`ai_generations\` table (see [\`server/db.ts\`](../server/db.ts)), which
[\`server/aiMetrics.ts\`](../server/aiMetrics.ts) writes one row to per AI furnishing
generation. Refreshed on a schedule by
[\`.github/workflows/export-ai-metrics.yml\`](../.github/workflows/export-ai-metrics.yml).

**Last export:** ${generatedAt.toISOString()}. ${windowNote}

| Metric | Value | Note |
| --- | --- | --- |
| AI proposal latency (median) | ${fmtSeconds(summary.medianDurationMs)} | wall-clock per generation |
| AI proposal latency (p95) | ${fmtSeconds(summary.p95DurationMs)} | wall-clock per generation |
| AI proposal cost (total, this window) | ${fmtUsd(summary.totalCostUsd)} | ${summary.costSampleCount} of ${summary.windowSize} generation(s) had a known cost |
| AI calls per proposal (avg) | ${fmtCount(summary.avgCallsPerProposal)} | ${summary.callsSampleCount} of ${summary.windowSize} generation(s) had a known call count |
| AI failure/timeout rate | ${fmtPct(summary.failureTimeoutRate)} | ${outcomeCounts.failed + outcomeCounts.timed_out} of ${summary.windowSize} generation(s) failed or timed out |
| Outcome breakdown | success ${outcomeCounts.success} · repaired ${outcomeCounts.repaired} · failed ${outcomeCounts.failed} · timed out ${outcomeCounts.timed_out} | counts over the window above |

Copy the values above into \`AGENT_METRICS.md\`'s own "Product observability" rows when
refreshing its snapshot — this file is the source, not a replacement for it.
`;
}

const DEFAULT_WINDOW = Math.max(1, Number(process.env.AI_METRICS_WINDOW ?? 500));
const OUT_PATH = fileURLToPath(new URL('../docs/AI_RUNTIME_METRICS.md', import.meta.url));

async function main(): Promise<void> {
  if (!authEnabled || !pool) {
    console.log(
      '[export-ai-metrics] no DATABASE_URL configured — nothing to export (no-op), leaving docs/AI_RUNTIME_METRICS.md untouched.',
    );
    return;
  }
  try {
    const { rows } = await pool.query<{
      created_at: Date;
      duration_ms: number;
      cost_usd: string | null;
      calls: number | null;
      outcome: GenerationRow['outcome'];
    }>(
      `SELECT created_at, duration_ms, cost_usd, calls, outcome
         FROM ai_generations
        ORDER BY created_at DESC
        LIMIT $1`,
      [DEFAULT_WINDOW],
    );
    const parsed: GenerationRow[] = rows.map((r) => ({
      createdAt: r.created_at.toISOString(),
      durationMs: Number(r.duration_ms),
      // node-postgres returns `double precision` as a string; NULL stays null.
      costUsd: r.cost_usd === null ? null : Number(r.cost_usd),
      calls: r.calls === null ? null : Number(r.calls),
      outcome: r.outcome,
    }));
    const summary = summarize(parsed);
    const markdown = renderMarkdown(summary, new Date());
    writeFileSync(OUT_PATH, markdown);
    console.log(
      `[export-ai-metrics] wrote docs/AI_RUNTIME_METRICS.md from ${parsed.length} generation(s).`,
    );
  } finally {
    await pool.end();
  }
}

// Only run when executed directly (`node scripts/export-ai-metrics.ts`) — importing
// this module (e.g. from a unit test, to exercise summarize()/renderMarkdown()) must
// not open a database connection or write the file as a side effect.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((e) => {
    console.error('[export-ai-metrics] failed:', e);
    process.exitCode = 1;
  });
}
