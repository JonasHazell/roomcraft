import { describe, expect, it } from 'vitest';
import { renderMarkdown, summarize, type GenerationRow } from './export-ai-metrics.ts';

function row(partial: Partial<GenerationRow>): GenerationRow {
  return {
    createdAt: '2026-07-20T00:00:00.000Z',
    durationMs: 1000,
    costUsd: 0.01,
    calls: 4,
    outcome: 'success',
    ...partial,
  };
}

describe('summarize', () => {
  it('returns an empty-window summary for zero rows', () => {
    const summary = summarize([]);
    expect(summary.windowSize).toBe(0);
    expect(summary.medianDurationMs).toBeNull();
    expect(summary.p95DurationMs).toBeNull();
    expect(summary.totalCostUsd).toBe(0);
    expect(summary.avgCallsPerProposal).toBeNull();
    expect(summary.failureTimeoutRate).toBeNull();
    expect(summary.outcomeCounts).toEqual({ success: 0, repaired: 0, failed: 0, timed_out: 0 });
  });

  it('computes median/p95 duration, total cost, average calls and outcome counts', () => {
    const rows: GenerationRow[] = [
      row({ durationMs: 1000, costUsd: 0.01, calls: 3, outcome: 'success' }),
      row({ durationMs: 2000, costUsd: 0.02, calls: 5, outcome: 'repaired' }),
      row({ durationMs: 3000, costUsd: 0.03, calls: 7, outcome: 'success' }),
      row({ durationMs: 4000, costUsd: null, calls: null, outcome: 'failed' }),
      row({ durationMs: 100_000, costUsd: null, calls: null, outcome: 'timed_out' }),
    ];
    const summary = summarize(rows);

    expect(summary.windowSize).toBe(5);
    expect(summary.medianDurationMs).toBe(3000);
    expect(summary.p95DurationMs).toBe(100_000);
    expect(summary.totalCostUsd).toBeCloseTo(0.06, 6);
    expect(summary.costSampleCount).toBe(3);
    expect(summary.avgCallsPerProposal).toBe(5);
    expect(summary.callsSampleCount).toBe(3);
    expect(summary.outcomeCounts).toEqual({ success: 2, repaired: 1, failed: 1, timed_out: 1 });
    // 1 failed + 1 timed_out out of 5.
    expect(summary.failureTimeoutRate).toBeCloseTo(0.4, 6);
  });

  it('never fails cost/calls averages just because some rows have a null total', () => {
    const rows: GenerationRow[] = [
      row({ costUsd: null, calls: null, outcome: 'failed' }),
      row({ costUsd: null, calls: null, outcome: 'timed_out' }),
    ];
    const summary = summarize(rows);
    expect(summary.totalCostUsd).toBe(0);
    expect(summary.costSampleCount).toBe(0);
    expect(summary.avgCallsPerProposal).toBeNull();
    expect(summary.callsSampleCount).toBe(0);
    expect(summary.failureTimeoutRate).toBe(1);
  });
});

describe('renderMarkdown', () => {
  it('renders a "no data yet" state for an empty window without fabricating numbers', () => {
    const md = renderMarkdown(summarize([]), new Date('2026-07-22T00:00:00.000Z'));
    expect(md).toContain('No AI generations recorded yet');
    expect(md).toContain('| AI proposal latency (median) | — |');
    expect(md).toContain('success 0 · repaired 0 · failed 0 · timed out 0');
  });

  it('renders real numbers for a populated window', () => {
    const rows: GenerationRow[] = [
      row({ durationMs: 12_000, costUsd: 0.05, calls: 4, outcome: 'success' }),
      row({ durationMs: 18_000, costUsd: 0.08, calls: 6, outcome: 'repaired' }),
    ];
    const md = renderMarkdown(summarize(rows), new Date('2026-07-22T00:00:00.000Z'));
    expect(md).toContain('Window: last 2 generation(s)');
    expect(md).toContain('15.0 s'); // median of 12s and 18s
    expect(md).toContain('$0.1300'); // total cost
    expect(md).toContain('success 1 · repaired 1 · failed 0 · timed out 0');
  });
});
