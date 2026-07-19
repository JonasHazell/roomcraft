import type { Design } from '../types';

/**
 * Thin client for the server's read-only room-sharing endpoints (#353,
 * server/share.ts). Mirrors the shape of `authApi.ts`: no token handling here,
 * just a request/response pair per endpoint.
 */

interface ErrorPayload {
  error?: string;
}

/** Posts a point-in-time snapshot of a room and returns its opaque share id. */
export async function apiCreateShare(design: Design): Promise<string> {
  let res: Response;
  try {
    res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ design }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const payload = (await res.json().catch(() => null)) as ({ id?: string } & ErrorPayload) | null;
  if (!res.ok || !payload?.id) {
    throw new Error(payload?.error ?? `The server responded with an error (${res.status}).`);
  }
  return payload.id;
}

/** Fetches a shared room snapshot by id. Throws if it's missing, expired, or invalid. */
export async function apiGetShare(id: string): Promise<Design> {
  let res: Response;
  try {
    res = await fetch(`/api/share/${encodeURIComponent(id)}`);
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const payload = (await res.json().catch(() => null)) as
    | ({ design?: Design } & ErrorPayload)
    | null;
  if (!res.ok || !payload?.design) {
    throw new Error(payload?.error ?? `The server responded with an error (${res.status}).`);
  }
  return payload.design;
}
