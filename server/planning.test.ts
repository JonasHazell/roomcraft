import { beforeEach, describe, expect, it, vi } from 'vitest';

// generatePlan calls runClaude directly; mock it (same pattern as judge.test.ts) so
// we can assert the AbortSignal handed to generatePlan (see #381 — server/index.ts
// derives this from the client connection so a disconnect aborts the in-flight
// Claude call) reaches every runClaude call it makes, including the repair turn.
vi.mock('./claude.ts', () => ({
  runClaude: vi.fn(),
  // Real implementation (not a spy): generatePlan uses this to fold the repair
  // round's usage into the running total, so it needs to actually add.
  addUsage: (a: Record<string, number>, b: Record<string, number>) => ({
    inputTokens: a.inputTokens + b.inputTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    outputTokens: a.outputTokens + b.outputTokens,
  }),
}));
import type { Design, Wall } from '../src/types.ts';
import { runClaude } from './claude.ts';
import { buildPlanBrief, checkPlan, generatePlan, type FurniturePlan, type PlanItem } from './planning.ts';

const mockRun = vi.mocked(runClaude);

const item = (over: Partial<PlanItem>): PlanItem => ({
  kind: 'box',
  name: 'Box',
  quantity: 1,
  priority: 'need',
  sleeps: 0,
  reason: '',
  ...over,
});

/** Minimal 4×4 m square room, just enough for buildUserPrompt's serializeRoom to run. */
function makeRoom(): Design {
  const pts = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 4 },
    { x: 0, z: 4 },
  ];
  const walls: Wall[] = pts.map((a, i) => ({
    id: `w${i}`,
    kind: 'exterior',
    a,
    b: pts[(i + 1) % pts.length],
  }));
  return {
    id: 'r0',
    name: 'test',
    updatedAt: '',
    room: { height: 2.4 },
    floorColor: '#ffffff',
    wallColor: '#ffffff',
    floorMaterial: 'matte',
    wallMaterial: 'matte',
    walls,
    openings: [],
    furniture: [],
    proposals: [
      {
        id: 'p0',
        name: 'Proposal 1',
        furniture: [],
        floorColor: '#ffffff',
        wallColor: '#ffffff',
        floorMaterial: 'matte',
        wallMaterial: 'matte',
      },
    ],
    activeProposalId: 'p0',
  };
}

function planResult(plan: FurniturePlan) {
  return {
    structuredOutput: plan,
    assistant: { role: 'assistant' as const, content: [] },
    costUsd: 0,
    durationMs: 0,
    usage: { inputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, outputTokens: 0 },
  };
}

const plan = (items: PlanItem[]): FurniturePlan => ({ items });

describe('checkPlan', () => {
  it('passes a single bed with one nightstand', () => {
    const p = plan([
      item({ kind: 'bed', name: 'Single bed', sleeps: 1 }),
      item({ kind: 'nightstand', name: 'Nightstand', quantity: 1 }),
    ]);
    expect(checkPlan(p)).toHaveLength(0);
  });

  it('flags two nightstands beside a single bed', () => {
    const p = plan([
      item({ kind: 'bed', name: 'Single bed', sleeps: 1 }),
      item({ kind: 'nightstand', name: 'Nightstands', quantity: 2 }),
    ]);
    const findings = checkPlan(p);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain('at most one nightstand');
  });

  it('flags two nightstands as one item and as two separate items alike', () => {
    const asOne = plan([
      item({ kind: 'bed', name: 'Single bed', sleeps: 1 }),
      item({ kind: 'nightstand', name: 'Nightstands', quantity: 2 }),
    ]);
    const asTwo = plan([
      item({ kind: 'bed', name: 'Single bed', sleeps: 1 }),
      item({ kind: 'nightstand', name: 'Left nightstand', quantity: 1 }),
      item({ kind: 'nightstand', name: 'Right nightstand', quantity: 1 }),
    ]);
    expect(checkPlan(asOne)).toHaveLength(1);
    expect(checkPlan(asTwo)).toHaveLength(1);
  });

  it('allows two nightstands beside a double bed', () => {
    const p = plan([
      item({ kind: 'bed', name: 'Double bed', sleeps: 2 }),
      item({ kind: 'nightstand', name: 'Nightstands', quantity: 2 }),
    ]);
    expect(checkPlan(p)).toHaveLength(0);
  });

  it('flags nightstands with no bed at all', () => {
    const p = plan([item({ kind: 'nightstand', name: 'Nightstand', quantity: 1 })]);
    const findings = checkPlan(p);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain('no bed');
  });

  it('sums nightstand allowance across mixed bedrooms', () => {
    // One double (2) + one single (1) → up to 3 nightstands is fine, 4 is not.
    const base = [
      item({ kind: 'bed', name: 'Double bed', sleeps: 2 }),
      item({ kind: 'bed', name: 'Single bed', sleeps: 1 }),
    ];
    expect(checkPlan(plan([...base, item({ kind: 'nightstand', quantity: 3 })]))).toHaveLength(0);
    expect(checkPlan(plan([...base, item({ kind: 'nightstand', quantity: 4 })]))).toHaveLength(1);
  });
});

describe('buildPlanBrief', () => {
  it('separates need-to-have from nice-to-have and lists quantities', () => {
    const brief = buildPlanBrief(
      plan([
        item({ kind: 'bed', name: 'Double bed', priority: 'need' }),
        item({ kind: 'rug', name: 'Wool rug', priority: 'nice' }),
      ]),
    );
    expect(brief).toContain('Need-to-have');
    expect(brief).toContain('1× Double bed (bed)');
    expect(brief).toContain('Nice-to-have');
    expect(brief).toContain('1× Wool rug (rug)');
  });

  it('marks an empty priority group as (none)', () => {
    const brief = buildPlanBrief(plan([item({ kind: 'bed', name: 'Bed', priority: 'need' })]));
    expect(brief).toContain('- (none)'); // nice-to-have group is empty
  });
});

// #381: server/index.ts derives an AbortSignal from the client connection and
// passes it into generateProposals → generatePlan so a disconnect during the
// planning phase aborts its Claude call(s) too, not just the per-direction ones.
describe('generatePlan — abort signal threading (#381)', () => {
  beforeEach(() => mockRun.mockReset());

  it('forwards the given signal to the first runClaude call', async () => {
    mockRun.mockResolvedValueOnce(planResult(plan([item({ kind: 'bed', name: 'Bed' })])));
    const controller = new AbortController();

    await generatePlan(makeRoom(), 'a bedroom', 'claude-sonnet-5', controller.signal);

    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(mockRun.mock.calls[0][0]).toMatchObject({ signal: controller.signal });
  });

  it('forwards the same signal to the repair round when checkPlan finds a problem', async () => {
    // No bed → checkPlan flags the nightstand, triggering a repair call.
    mockRun.mockResolvedValueOnce(
      planResult(plan([item({ kind: 'nightstand', name: 'Nightstand', quantity: 1 })])),
    );
    mockRun.mockResolvedValueOnce(planResult(plan([item({ kind: 'nightstand', name: 'Nightstand', quantity: 1 })])));
    const controller = new AbortController();

    await generatePlan(makeRoom(), 'a bedroom', 'claude-sonnet-5', controller.signal);

    expect(mockRun).toHaveBeenCalledTimes(2);
    expect(mockRun.mock.calls[0][0]).toMatchObject({ signal: controller.signal });
    expect(mockRun.mock.calls[1][0]).toMatchObject({ signal: controller.signal });
  });

  it('propagates a rejection from an aborted call rather than swallowing it', async () => {
    const controller = new AbortController();
    const abortError = new DOMException('This operation was aborted', 'AbortError');
    mockRun.mockRejectedValueOnce(abortError);
    controller.abort();

    await expect(
      generatePlan(makeRoom(), 'a bedroom', 'claude-sonnet-5', controller.signal),
    ).rejects.toBe(abortError);
  });
});
