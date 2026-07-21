import type { AuthUser } from './auth.ts';

/**
 * Freemium cap (#352): total AI furnishing generations a 'free'-plan account
 * may run, lifetime. Each generation already returns three complete layouts,
 * so 5 generations is enough to genuinely evaluate the product (up to 15 full
 * layouts across a couple of rooms) before hitting the upgrade prompt.
 *
 * Kept in its own module (rather than inline in server/index.ts, alongside the
 * gate it drives) so the predicate below can be unit tested without importing
 * server/index.ts — that module starts listening and touches the database as
 * a side effect of being imported, which a plain unit test shouldn't trigger.
 */
export const FREE_TIER_GENERATION_CAP = 5;

/**
 * True once a signed-in 'free'-plan account has used up its lifetime cap and
 * must be shown the upgrade prompt instead of running another (costly)
 * generation. A 'pro' account is never capped.
 */
export function overFreeTierCap(user: AuthUser): boolean {
  return user.plan === 'free' && user.aiGenerationsUsed >= FREE_TIER_GENERATION_CAP;
}

/** The message sent back with the 402 `{ error: 'limit' }` response when
 * {@link overFreeTierCap} blocks a request (server/index.ts's /api/proposals gate). */
export function limitReachedMessage(): string {
  return `You've used all ${FREE_TIER_GENERATION_CAP} of your free AI generations. Upgrade to Pro for unlimited AI furnishing.`;
}
