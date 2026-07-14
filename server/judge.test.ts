import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProposalScore } from './ruleValidation.ts';
import type { ResolvedProposals } from './schema.ts';

// The judge makes a real model call; mock it so the ranking logic is tested in
// isolation (order handling, fallbacks) without hitting the API.
vi.mock('./claude.ts', () => ({ runClaude: vi.fn() }));
import { runClaude } from './claude.ts';
import { rankByJudge } from './judge.ts';

const mockRun = vi.mocked(runClaude);

function makeItem(id: string): {
  id: string;
  proposal: ResolvedProposals['proposals'][number];
  score: ProposalScore;
  warnings: never[];
} {
  return {
    id,
    proposal: { title: id, concept: 'c', floorColor: '#fff', wallColor: '#fff', furniture: [] },
    score: { findings: [], blocking: 0, quality: 50 },
    warnings: [],
  };
}

function judgeReturns(output: unknown) {
  mockRun.mockResolvedValueOnce({
    structuredOutput: output,
    assistant: { role: 'assistant', content: [] },
    costUsd: 0,
    durationMs: 0,
  });
}

const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe('rankByJudge', () => {
  beforeEach(() => mockRun.mockReset());

  it('reorders the proposals to the ranking the model returns', async () => {
    judgeReturns({ order: [2, 0, 1], reason: 'best fit' });
    const items = [makeItem('a'), makeItem('b'), makeItem('c')];
    const ranked = await rankByJudge(items, 'a bedroom', 'claude-sonnet-5');
    expect(ids(ranked)).toEqual(['c', 'a', 'b']);
  });

  it('preserves each item whole (warnings and score ride along with the proposal)', async () => {
    judgeReturns({ order: [1, 0], reason: 'x' });
    const items = [makeItem('a'), makeItem('b')];
    const ranked = await rankByJudge(items, 'needs', 'claude-sonnet-5');
    expect(ranked[0]).toBe(items[1]);
    expect(ranked[1]).toBe(items[0]);
  });

  it('completes a partial ranking without dropping any proposal', async () => {
    // Model names only two of three (and repeats one) — the missing index is appended.
    judgeReturns({ order: [2, 2], reason: 'x' });
    const items = [makeItem('a'), makeItem('b'), makeItem('c')];
    const ranked = await rankByJudge(items, 'needs', 'claude-sonnet-5');
    expect(ids(ranked)).toEqual(['c', 'a', 'b']);
    expect(ranked).toHaveLength(3);
  });

  it('ignores out-of-range indices and keeps a full permutation', async () => {
    judgeReturns({ order: [5, 1, -1], reason: 'x' });
    const items = [makeItem('a'), makeItem('b')];
    const ranked = await rankByJudge(items, 'needs', 'claude-sonnet-5');
    expect(ids(ranked)).toEqual(['b', 'a']);
  });

  it('keeps the deterministic order when the response does not match the schema', async () => {
    judgeReturns({ nonsense: true });
    const items = [makeItem('a'), makeItem('b'), makeItem('c')];
    const ranked = await rankByJudge(items, 'needs', 'claude-sonnet-5');
    expect(ids(ranked)).toEqual(['a', 'b', 'c']);
  });

  it('keeps the deterministic order when the model call throws', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRun.mockImplementationOnce(() => {
      throw new Error('api down');
    });
    const items = [makeItem('a'), makeItem('b')];
    const ranked = await rankByJudge(items, 'needs', 'claude-sonnet-5');
    expect(ids(ranked)).toEqual(['a', 'b']);
    errorLog.mockRestore();
  });

  it('short-circuits without a model call for a single proposal', async () => {
    const items = [makeItem('a')];
    const ranked = await rankByJudge(items, 'needs', 'claude-sonnet-5');
    expect(ids(ranked)).toEqual(['a']);
    expect(mockRun).not.toHaveBeenCalled();
  });
});
