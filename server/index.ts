import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Design } from '../src/types.ts';
import { authEnabled, initSchema } from './db.ts';
import {
  EmailTakenError,
  MIN_PASSWORD_LENGTH,
  SESSION_COOKIE,
  authenticate,
  createSession,
  createUser,
  deleteSession,
  getSessionUser,
  isValidPassword,
  normalizeEmail,
  parseCookies,
  serializeClearCookie,
  serializeSessionCookie,
} from './auth.ts';
import { runClaude, type ChatMessages } from './claude.ts';
import { resolveProposals } from './orient.ts';
import { SYSTEM_PROMPT, buildRepairPrompt, buildUserPrompt } from './prompt.ts';
import { proposalsJsonSchema, proposalsSchema, type ResolvedProposals } from './schema.ts';
import { validateProposals } from './validate.ts';

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.AI_MODEL ?? 'claude-opus-4-8';
const MAX_BODY = 2 * 1024 * 1024;

// True when an Anthropic API credential is present. The AI endpoint needs it;
// without it the call fails fast with a clear message instead of a 502.
const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

// Each AI request makes one or two Messages API calls that can run for a minute,
// so unbounded concurrency would pile up in-flight work. Cap how many run at once
// and how many may wait; everything beyond that is shed with a 503 rather than
// piling up. Both are overridable so a bigger box can serve more.
const MAX_CONCURRENT = Math.max(1, Number(process.env.AI_MAX_CONCURRENT ?? 2));
const MAX_QUEUE = Math.max(0, Number(process.env.AI_MAX_QUEUE ?? 8));

// Per-IP rate limit for the AI endpoint. Each proposal costs real money and CPU,
// so a single client can't be allowed to hammer it. Sliding window, in-memory
// (fine for the single always-on container this ships as).
const RATE_LIMIT_MAX = Math.max(1, Number(process.env.AI_RATE_LIMIT_MAX ?? 20));
const RATE_LIMIT_WINDOW_MS = Math.max(1000, Number(process.env.AI_RATE_LIMIT_WINDOW_MS ?? 60_000));

// Built frontend (npm run build → dist/). Only present in production images;
// in local dev the Vite server serves the app and proxies /api here instead.
const DIST_DIR = fileURLToPath(new URL('../dist', import.meta.url));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

/**
 * Serves the built SPA from dist/. Real files are returned as-is; anything else
 * falls back to index.html so client-side routing/deep links work. Returns 404
 * only when no build is present (e.g. running the server without `npm run build`).
 */
async function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  // Block path traversal: normalise and keep the result inside dist/.
  const safePath = normalize(join(DIST_DIR, urlPath === '/' ? '/index.html' : urlPath));
  if (!safePath.startsWith(DIST_DIR)) return json(res, 403, { error: 'Forbidden.' });

  const tryFiles = [safePath];
  if (!extname(safePath)) tryFiles.push(join(DIST_DIR, 'index.html'));

  for (const file of tryFiles) {
    try {
      const body = await readFile(file);
      const type = MIME[extname(file)] ?? 'application/octet-stream';
      const immutable = file.includes(`${DIST_DIR}/assets/`);
      res.writeHead(200, {
        ...SECURITY_HEADERS,
        'content-type': type,
        'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      });
      return res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      // try next candidate
    }
  }
  return json(res, 404, { error: 'Not found. Build the frontend with `npm run build`.' });
}

interface ProposalRequest {
  design: Design;
  needs: string;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let done = false;
    // Overflowing the limit or an error stops the read and tears down the socket
    // so a malicious/oversized upload can't keep growing memory past MAX_BODY.
    const fail = (err: Error) => {
      if (done) return;
      done = true;
      req.destroy();
      reject(err);
    };
    req.on('data', (chunk: Buffer) => {
      if (done) return;
      body += chunk.toString();
      if (body.length > MAX_BODY) fail(new Error('The request body is too large.'));
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      resolve(body);
    });
    req.on('error', fail);
  });
}

// Baseline hardening headers applied to every response. The app is fully
// self-hosted (no third-party scripts/styles/images), so a strict CSP is safe
// and blocks injected content from loading anything off-origin.
const SECURITY_HEADERS: Record<string, string> = {
  'content-security-policy':
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
};

function json(
  res: ServerResponse,
  status: number,
  payload: unknown,
  headers?: Record<string, string>,
) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'content-type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

/**
 * True when the request reached us over HTTPS. Behind Railway's proxy the
 * original scheme is in `x-forwarded-proto`; locally we fall back to the socket.
 * Drives whether the session cookie gets the `Secure` attribute (which would
 * stop it working on `http://localhost`).
 */
function isSecureRequest(req: IncomingMessage): boolean {
  const proto = req.headers['x-forwarded-proto'];
  const first = Array.isArray(proto) ? proto[0] : proto;
  if (first) return first.split(',')[0].trim() === 'https';
  return Boolean((req.socket as { encrypted?: boolean }).encrypted);
}

/**
 * Rejects cross-site POSTs as a second CSRF guard on top of the session cookie's
 * `SameSite=Lax`. When a browser sends an `Origin`, it must match our host; a
 * missing `Origin` (non-browser clients, some same-origin requests) is allowed.
 */
function isSameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/** The session token from the request's cookies, if any. */
function sessionToken(req: IncomingMessage): string | undefined {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE];
}

interface Credentials {
  email: string | null;
  password: unknown;
}

/** Parses `{ email, password }` from a request body, normalising the email. */
function parseCredentials(raw: string): Credentials {
  const body = JSON.parse(raw) as { email?: unknown; password?: unknown };
  return { email: normalizeEmail(body.email), password: body.password };
}

async function handleRegister(req: IncomingMessage, res: ServerResponse) {
  let creds: Credentials;
  try {
    creds = parseCredentials(await readBody(req));
  } catch {
    return json(res, 400, { error: 'Invalid request.' });
  }
  if (!creds.email) return json(res, 400, { error: 'Please enter a valid email address.' });
  if (!isValidPassword(creds.password)) {
    return json(res, 400, {
      error: `The password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    });
  }
  try {
    const user = await createUser(creds.email, creds.password);
    const token = await createSession(user.id);
    return json(res, 200, { user }, { 'set-cookie': serializeSessionCookie(token, isSecureRequest(req)) });
  } catch (e) {
    if (e instanceof EmailTakenError) return json(res, 409, { error: e.message });
    console.error('[auth] register error:', e);
    return json(res, 500, { error: 'Could not create the account. Please try again.' });
  }
}

async function handleLogin(req: IncomingMessage, res: ServerResponse) {
  let creds: Credentials;
  try {
    creds = parseCredentials(await readBody(req));
  } catch {
    return json(res, 400, { error: 'Invalid request.' });
  }
  if (!creds.email || typeof creds.password !== 'string') {
    return json(res, 401, { error: 'Wrong email or password.' });
  }
  try {
    const user = await authenticate(creds.email, creds.password);
    if (!user) return json(res, 401, { error: 'Wrong email or password.' });
    const token = await createSession(user.id);
    return json(res, 200, { user }, { 'set-cookie': serializeSessionCookie(token, isSecureRequest(req)) });
  } catch (e) {
    console.error('[auth] login error:', e);
    return json(res, 500, { error: 'Could not sign you in. Please try again.' });
  }
}

async function handleLogout(req: IncomingMessage, res: ServerResponse) {
  try {
    await deleteSession(sessionToken(req));
  } catch (e) {
    console.error('[auth] logout error:', e);
  }
  return json(res, 200, { ok: true }, { 'set-cookie': serializeClearCookie(isSecureRequest(req)) });
}

/**
 * Bounded concurrency gate. `acquire` resolves a release fn when a slot is free;
 * it rejects immediately when both the running slots and the wait queue are full
 * so callers can shed load (503) instead of buffering requests forever.
 */
function createGate(maxConcurrent: number, maxQueue: number) {
  let active = 0;
  const waiters: Array<() => void> = [];
  const release = () => {
    active--;
    const next = waiters.shift();
    if (next) {
      active++;
      next();
    }
  };
  return {
    get pending() {
      return active + waiters.length;
    },
    acquire(): Promise<() => void> {
      if (active < maxConcurrent) {
        active++;
        return Promise.resolve(release);
      }
      if (waiters.length >= maxQueue) {
        return Promise.reject(new Error('busy'));
      }
      return new Promise((resolve) => waiters.push(() => resolve(release)));
    },
  };
}

const aiGate = createGate(MAX_CONCURRENT, MAX_QUEUE);

// Sliding-window request timestamps per client IP for the AI endpoint.
const rateHits = new Map<string, number[]>();

/** True when the client is within its allowance; records the hit when allowed. */
function allowRequest(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const hits = (rateHits.get(ip) ?? []).filter((t) => t > cutoff);
  if (hits.length >= RATE_LIMIT_MAX) {
    rateHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  rateHits.set(ip, hits);
  // Opportunistically drop cold entries so the map can't grow without bound.
  if (rateHits.size > 10_000) {
    for (const [key, ts] of rateHits) {
      if (ts.every((t) => t <= cutoff)) rateHits.delete(key);
    }
  }
  return true;
}

/** Client IP, trusting the proxy's first X-Forwarded-For hop (Railway sets it). */
function clientIp(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd;
  const first = raw?.split(',')[0].trim();
  return first || req.socket.remoteAddress || 'unknown';
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isPoint(p: unknown): boolean {
  const q = p as { x?: unknown; z?: unknown } | null;
  return !!q && isFiniteNumber(q.x) && isFiniteNumber(q.z);
}

function isWall(w: unknown): boolean {
  const q = w as { kind?: unknown; a?: unknown; b?: unknown } | null;
  return !!q && (q.kind === 'exterior' || q.kind === 'interior') && isPoint(q.a) && isPoint(q.b);
}

/**
 * Structural validation of the incoming design. The geometry math downstream
 * assumes well-formed walls/openings, so a malformed request is rejected here
 * with a 400 instead of throwing deep inside the pipeline (which would surface
 * as an opaque 502).
 */
function parseRequest(raw: string): ProposalRequest {
  const body = JSON.parse(raw) as Partial<ProposalRequest>;
  const design = body.design;
  if (!design || !Array.isArray(design.walls) || design.walls.length === 0 || !design.room) {
    throw new Error('The "design" field is missing or contains no room.');
  }
  if (!design.walls.every(isWall)) {
    throw new Error('The "design" contains a malformed wall (each needs kind and points a/b).');
  }
  if (!isFiniteNumber(design.room.height) || design.room.height <= 0) {
    throw new Error('The "design" has an invalid room height.');
  }
  if (design.openings !== undefined && !Array.isArray(design.openings)) {
    throw new Error('The "design.openings" field must be an array.');
  }
  if (design.furniture !== undefined && !Array.isArray(design.furniture)) {
    throw new Error('The "design.furniture" field must be an array.');
  }
  if (typeof body.needs !== 'string' || body.needs.trim().length === 0) {
    throw new Error('The "needs" field (description of needs) is missing.');
  }
  return { design, needs: body.needs };
}

async function generateProposals(design: Design, needs: string) {
  console.log(`[proposals] generating with model "${MODEL}" …`);
  // The full conversation is resent on every call (the API is stateless); the
  // repair turn below appends to this same history.
  const messages: ChatMessages = [{ role: 'user', content: buildUserPrompt(design, needs) }];
  const first = await runClaude({
    messages,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: proposalsJsonSchema,
    model: MODEL,
  });
  console.log(
    `[proposals] first response done (${Math.round(first.durationMs / 1000)} s, ~$${first.costUsd.toFixed(2)})`,
  );

  let data: ResolvedProposals = resolveProposals(proposalsSchema.parse(first.structuredOutput), design);
  let errors = validateProposals(data, design);
  if (errors.length === 0) return { data, warnings: [] as string[] };

  console.log(`[proposals] ${errors.length} validation errors — requesting a fix …`);
  messages.push(first.assistant, { role: 'user', content: buildRepairPrompt(errors) });
  const repaired = await runClaude({
    messages,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: proposalsJsonSchema,
    model: MODEL,
  });
  console.log(
    `[proposals] repair done (${Math.round(repaired.durationMs / 1000)} s, ~$${repaired.costUsd.toFixed(2)})`,
  );

  const repairedData = resolveProposals(proposalsSchema.parse(repaired.structuredOutput), design);
  const repairedErrors = validateProposals(repairedData, design);
  if (repairedErrors.length <= errors.length) {
    data = repairedData;
    errors = repairedErrors;
  }
  return { data, warnings: errors };
}

const server = createServer((req, res) => {
  void (async () => {
    // Liveness/readiness probe for the platform (Railway) — cheap and unauthenticated.
    if ((req.method === 'GET' || req.method === 'HEAD') && req.url === '/api/health') {
      return json(res, 200, { status: 'ok', pending: aiGate.pending });
    }
    // Current user for the session cookie. `authEnabled` tells the frontend
    // whether to show sign-in at all (false in dev with no DATABASE_URL).
    if (req.method === 'GET' && req.url === '/api/auth/me') {
      const user = await getSessionUser(sessionToken(req));
      return json(res, 200, { user, authEnabled });
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      return serveStatic(req, res);
    }
    if (req.method !== 'POST') {
      return json(res, 404, { error: 'Unknown endpoint.' });
    }
    // Every state-changing request is same-origin only (CSRF guard).
    if (!isSameOrigin(req)) {
      return json(res, 403, { error: 'Cross-origin request rejected.' });
    }
    // Auth endpoints. Rate-limited like the AI endpoint so credentials can't be
    // brute-forced, and disabled with a clear 503 when no database is configured.
    if (req.url === '/api/auth/register' || req.url === '/api/auth/login') {
      if (!authEnabled) {
        return json(res, 503, { error: 'Sign-in is not configured on this server.' });
      }
      if (!allowRequest(clientIp(req))) {
        return json(res, 429, { error: 'Too many attempts. Please wait a moment and try again.' });
      }
      return req.url === '/api/auth/register' ? handleRegister(req, res) : handleLogin(req, res);
    }
    if (req.url === '/api/auth/logout') {
      return handleLogout(req, res);
    }
    if (req.url !== '/api/proposals') {
      return json(res, 404, { error: 'Unknown endpoint. Use POST /api/proposals.' });
    }
    // No API credential → the AI call can't run; fail fast with a clear message.
    if (!aiConfigured) {
      return json(res, 503, { error: 'AI furnishing is not configured on this server.' });
    }
    // When auth is configured, AI furnishing requires a signed-in user (each call
    // costs real money and runs on the owner's Claude login). With no database
    // the endpoint stays open so the frontend-only/local dev flow is unchanged.
    if (authEnabled && !(await getSessionUser(sessionToken(req)))) {
      return json(res, 401, { error: 'Please sign in to use AI furnishing.' });
    }
    if (!allowRequest(clientIp(req))) {
      return json(res, 429, { error: 'Too many requests. Please wait a moment and try again.' });
    }
    let request: ProposalRequest;
    try {
      request = parseRequest(await readBody(req));
    } catch (e) {
      return json(res, 400, { error: e instanceof Error ? e.message : 'Invalid request.' });
    }
    // Take a concurrency slot before doing the expensive AI work; shed load if
    // the server is already saturated so requests fail fast instead of stacking.
    let release: () => void;
    try {
      release = await aiGate.acquire();
    } catch {
      return json(res, 503, {
        error: 'The AI service is busy right now. Please try again in a moment.',
      });
    }
    try {
      const { data, warnings } = await generateProposals(request.design, request.needs);
      return json(res, 200, { proposals: data.proposals, warnings });
    } catch (e) {
      // Log the full error server-side; return a generic message so raw CLI
      // stderr or ZodError internals aren't leaked to the client.
      console.error('[proposals] error:', e);
      return json(res, 502, {
        error: 'The AI proposal generation failed. Check the server logs for details.',
      });
    } finally {
      release();
    }
  })();
});

// Ensure the auth tables exist before accepting traffic. If the database is
// unreachable we log and carry on: the app and (dev) AI endpoint still work; only
// the auth endpoints will error until the database comes back.
if (authEnabled) {
  try {
    await initSchema();
    console.log('Auth enabled — database schema is ready.');
  } catch (e) {
    console.error('Could not initialise the auth database schema:', e);
  }
} else {
  console.log('Auth disabled — set DATABASE_URL to enable sign-in.');
}

server.listen(PORT, () => {
  console.log(`Roomcraft server listening on port ${PORT} (model: ${MODEL})`);
  console.log('Serves the built frontend from dist/ and AI proposals on POST /api/proposals.');
  if (aiConfigured) {
    console.log('AI requests use the Anthropic API (ANTHROPIC_API_KEY).');
  } else {
    console.log('AI furnishing disabled — set ANTHROPIC_API_KEY to enable it.');
  }
});

// Stop accepting connections and drain in-flight work when the platform asks the
// container to stop (Railway sends SIGTERM on redeploy/scale-down).
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    console.log(`Received ${signal}, shutting down …`);
    server.close(() => process.exit(0));
    // Don't hang forever if a long AI call is still running.
    setTimeout(() => process.exit(0), 10_000).unref();
  });
}
