/**
 * Thin client for the server's auth endpoints (server/index.ts). The session is
 * a `HttpOnly` cookie set by the server, so there's no token to store here — the
 * browser sends it automatically on same-origin requests.
 */

/** A user's subscription tier (#352). Everyone starts on 'free'; 'pro' has no
 * real billing behind it yet — see the upgrade prompt in useAiStore/AiProposalsPanel. */
export type Plan = 'free' | 'pro';

export interface AuthUser {
  id: string;
  email: string;
  plan: Plan;
  /** Lifetime count of successful AI furnishing generations this account has run. */
  aiGenerationsUsed: number;
}

export interface MeResponse {
  user: AuthUser | null;
  /** Whether the server has sign-in configured (a database is connected). */
  authEnabled: boolean;
  /** Free-tier generation cap (server/index.ts's FREE_TIER_GENERATION_CAP), or
   * null when auth is disabled and the cap doesn't apply. */
  aiGenerationCap: number | null;
}

interface ErrorPayload {
  error?: string;
}

async function postJson(url: string, body: unknown): Promise<{ user: AuthUser }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const payload = (await res.json().catch(() => null)) as ({ user: AuthUser } & ErrorPayload) | null;
  if (!res.ok || !payload?.user) {
    throw new Error(payload?.error ?? `The server responded with an error (${res.status}).`);
  }
  return payload;
}

/**
 * Returns the current user (or null) and whether sign-in is configured. If the
 * server is unreachable (e.g. frontend-only dev with no backend) it resolves to
 * "not signed in, auth disabled" so the rest of the app keeps working.
 */
export async function apiMe(): Promise<MeResponse> {
  try {
    const res = await fetch('/api/auth/me');
    const payload = (await res.json().catch(() => null)) as Partial<MeResponse> | null;
    return {
      user: payload?.user ?? null,
      authEnabled: payload?.authEnabled ?? false,
      aiGenerationCap: payload?.aiGenerationCap ?? null,
    };
  } catch {
    return { user: null, authEnabled: false, aiGenerationCap: null };
  }
}

export async function apiLogin(email: string, password: string): Promise<AuthUser> {
  return (await postJson('/api/auth/login', { email, password })).user;
}

export async function apiRegister(email: string, password: string): Promise<AuthUser> {
  return (await postJson('/api/auth/register', { email, password })).user;
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Best-effort: clearing local state on logout matters more than the round-trip.
  }
}
