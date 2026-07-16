import type { IncomingMessage } from 'node:http';

// Hostnames that only ever resolve to this machine. Trusting a same-host mismatch
// between two loopback addresses is safe: it can only ever be true when the request
// physically originated and terminated on this machine (local dev), never in a real
// deployment where the server's own Host is its public domain, not localhost.
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

/** Hostname (no port) from a raw `Host` header value, or undefined if unparseable. */
function hostnameOf(hostHeader: string | undefined): string | undefined {
  if (!hostHeader) return undefined;
  try {
    return new URL(`http://${hostHeader}`).hostname;
  } catch {
    return undefined;
  }
}

function isLoopback(hostname: string | undefined): boolean {
  return hostname != null && LOOPBACK_HOSTNAMES.has(hostname);
}

/**
 * Extra origins (full URLs, comma-separated) to trust beyond the request's own Host
 * and the loopback dev case below — e.g. a custom domain in front of a reverse proxy
 * that also rewrites Host. Unset by default; only needed for deployments where
 * `isSameOrigin`'s other two checks don't already cover the setup.
 */
function trustedOriginHosts(): string[] {
  const raw = process.env.APP_ORIGIN;
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      try {
        return new URL(s).host;
      } catch {
        return s;
      }
    });
}

/**
 * Rejects cross-site POSTs as a second CSRF guard on top of the session cookie's
 * `SameSite=Lax`. When a browser sends an `Origin`, it must match our host; a
 * missing `Origin` (non-browser clients, some same-origin requests) is allowed.
 *
 * A request that reaches us through a trusted reverse proxy — notably Vite's dev
 * server, which proxies `/api` to this server per `vite.config.ts` — arrives with
 * `Host` rewritten to the proxy target while `Origin` stays the browser's real page
 * origin, so a direct `Origin`-vs-`Host` comparison never matches. Accept it anyway
 * when both sides are loopback addresses (the documented `npm run dev` setup), or
 * when the Origin is on an explicit allow-list (`APP_ORIGIN`), while still rejecting
 * a genuinely foreign Origin.
 */
export function isSameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  if (originUrl.host === req.headers.host) return true;
  if (isLoopback(originUrl.hostname) && isLoopback(hostnameOf(req.headers.host))) return true;
  return trustedOriginHosts().includes(originUrl.host);
}
