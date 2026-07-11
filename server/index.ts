import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Design } from '../src/types.ts';
import { runClaude } from './claude.ts';
import { resolveProposals } from './orient.ts';
import { SYSTEM_PROMPT, buildRepairPrompt, buildUserPrompt } from './prompt.ts';
import { proposalsJsonSchema, proposalsSchema, type ResolvedProposals } from './schema.ts';
import { validateProposals } from './validate.ts';

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.AI_MODEL ?? 'sonnet';
const MAX_BODY = 2 * 1024 * 1024;

// AI calls spawn a `claude` subprocess that can run for minutes, so unbounded
// concurrency would exhaust the container's CPU/memory. Cap how many run at once
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

function json(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'content-type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload));
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
  const first = await runClaude({
    prompt: buildUserPrompt(design, needs),
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: proposalsJsonSchema,
    model: MODEL,
  });
  console.log(
    `[proposals] first response done (${Math.round(first.durationMs / 1000)} s, $${first.costUsd.toFixed(2)})`,
  );

  let data: ResolvedProposals = resolveProposals(proposalsSchema.parse(first.structuredOutput), design);
  let errors = validateProposals(data, design);
  if (errors.length === 0) return { data, warnings: [] as string[] };

  console.log(`[proposals] ${errors.length} validation errors — requesting a fix …`);
  const repaired = await runClaude({
    prompt: buildRepairPrompt(errors),
    resume: first.sessionId,
    jsonSchema: proposalsJsonSchema,
    model: MODEL,
  });
  console.log(
    `[proposals] repair done (${Math.round(repaired.durationMs / 1000)} s, $${repaired.costUsd.toFixed(2)})`,
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
    if (req.method === 'GET' || req.method === 'HEAD') {
      return serveStatic(req, res);
    }
    if (req.method !== 'POST' || req.url !== '/api/proposals') {
      return json(res, 404, { error: 'Unknown endpoint. Use POST /api/proposals.' });
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

server.listen(PORT, () => {
  console.log(`Roomcraft server listening on port ${PORT} (model: ${MODEL})`);
  console.log('Serves the built frontend from dist/ and AI proposals on POST /api/proposals.');
  console.log('AI requests run through the Claude Code CLI using its stored login.');
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
