import { describe, expect, it } from 'vitest';
import type { AuthUser } from './auth.ts';
import { FREE_TIER_GENERATION_CAP, limitReachedMessage, overFreeTierCap } from './planLimits.ts';

function user(over: Partial<AuthUser>): AuthUser {
  return { id: 'u1', email: 'a@b.com', plan: 'free', aiGenerationsUsed: 0, ...over };
}

/**
 * #352: server/index.ts's `/api/proposals` handler blocks a request with a
 * 402 `{ error: 'limit' }` response — without ever calling `generateProposals`
 * — the moment `overFreeTierCap` returns true for the signed-in user. There's
 * no live Postgres in this test environment to exercise the full HTTP handler
 * end to end, so this covers the predicate that decision is entirely made
 * from: a free user under the cap is let through, one at or over it is
 * blocked, and a 'pro' user is never blocked regardless of usage.
 */
describe('overFreeTierCap', () => {
  it('allows a free-plan user under the cap', () => {
    expect(overFreeTierCap(user({ aiGenerationsUsed: 0 }))).toBe(false);
    expect(overFreeTierCap(user({ aiGenerationsUsed: FREE_TIER_GENERATION_CAP - 1 }))).toBe(false);
  });

  it('blocks a free-plan user at or over the cap', () => {
    expect(overFreeTierCap(user({ aiGenerationsUsed: FREE_TIER_GENERATION_CAP }))).toBe(true);
    expect(overFreeTierCap(user({ aiGenerationsUsed: FREE_TIER_GENERATION_CAP + 5 }))).toBe(true);
  });

  it('never blocks a pro-plan user, however many generations used', () => {
    expect(overFreeTierCap(user({ plan: 'pro', aiGenerationsUsed: FREE_TIER_GENERATION_CAP + 100 }))).toBe(
      false,
    );
  });
});

describe('limitReachedMessage', () => {
  it('names the actual cap so the copy never drifts from the enforced number', () => {
    expect(limitReachedMessage()).toContain(String(FREE_TIER_GENERATION_CAP));
  });
});
