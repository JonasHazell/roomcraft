import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Design } from '../src/types.ts';
import { runClaude } from './claude.ts';
import { resolveProposals } from './orient.ts';
import { SYSTEM_PROMPT, buildRepairPrompt, buildUserPrompt } from './prompt.ts';
import { proposalsJsonSchema, proposalsSchema, type ResolvedProposals } from './schema.ts';
import { validateProposals } from './validate.ts';

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.AI_MODEL ?? 'sonnet';
const MAX_BODY = 2 * 1024 * 1024;

interface ProposalRequest {
  design: Design;
  needs: string;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > MAX_BODY) reject(new Error('The request body is too large.'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

/** Rough shape check — the server runs locally and trusts the client's design data. */
function parseRequest(raw: string): ProposalRequest {
  const body = JSON.parse(raw) as Partial<ProposalRequest>;
  const design = body.design;
  if (!design || !Array.isArray(design.walls) || design.walls.length === 0 || !design.room) {
    throw new Error('The "design" field is missing or contains no room.');
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
    if (req.method !== 'POST' || req.url !== '/api/proposals') {
      return json(res, 404, { error: 'Unknown endpoint. Use POST /api/proposals.' });
    }
    let request: ProposalRequest;
    try {
      request = parseRequest(await readBody(req));
    } catch (e) {
      return json(res, 400, { error: e instanceof Error ? e.message : 'Invalid request.' });
    }
    try {
      const { data, warnings } = await generateProposals(request.design, request.needs);
      return json(res, 200, { proposals: data.proposals, warnings });
    } catch (e) {
      console.error('[proposals] error:', e);
      return json(res, 502, {
        error: e instanceof Error ? e.message : 'Generation failed.',
      });
    }
  })();
});

server.listen(PORT, () => {
  console.log(`Room sketch AI server listening on http://localhost:${PORT} (model: ${MODEL})`);
  console.log('Requests are made via the Claude Code CLI using your local login.');
});
