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
      if (body.length > MAX_BODY) reject(new Error('Anropet är för stort.'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

/** Grov formkontroll — servern kör lokalt och litar på klientens designdata. */
function parseRequest(raw: string): ProposalRequest {
  const body = JSON.parse(raw) as Partial<ProposalRequest>;
  const design = body.design;
  if (!design || !Array.isArray(design.walls) || design.walls.length === 0 || !design.room) {
    throw new Error('Fältet "design" saknas eller innehåller inget rum.');
  }
  if (typeof body.needs !== 'string' || body.needs.trim().length === 0) {
    throw new Error('Fältet "needs" (behovsbeskrivning) saknas.');
  }
  return { design, needs: body.needs };
}

async function generateProposals(design: Design, needs: string) {
  console.log(`[proposals] genererar med modell "${MODEL}" …`);
  const first = await runClaude({
    prompt: buildUserPrompt(design, needs),
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: proposalsJsonSchema,
    model: MODEL,
  });
  console.log(
    `[proposals] första svaret klart (${Math.round(first.durationMs / 1000)} s, $${first.costUsd.toFixed(2)})`,
  );

  let data: ResolvedProposals = resolveProposals(proposalsSchema.parse(first.structuredOutput), design);
  let errors = validateProposals(data, design);
  if (errors.length === 0) return { data, warnings: [] as string[] };

  console.log(`[proposals] ${errors.length} valideringsfel — begär rättning …`);
  const repaired = await runClaude({
    prompt: buildRepairPrompt(errors),
    resume: first.sessionId,
    jsonSchema: proposalsJsonSchema,
    model: MODEL,
  });
  console.log(
    `[proposals] rättning klar (${Math.round(repaired.durationMs / 1000)} s, $${repaired.costUsd.toFixed(2)})`,
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
      return json(res, 404, { error: 'Okänd endpoint. Använd POST /api/proposals.' });
    }
    let request: ProposalRequest;
    try {
      request = parseRequest(await readBody(req));
    } catch (e) {
      return json(res, 400, { error: e instanceof Error ? e.message : 'Ogiltigt anrop.' });
    }
    try {
      const { data, warnings } = await generateProposals(request.design, request.needs);
      return json(res, 200, { proposals: data.proposals, warnings });
    } catch (e) {
      console.error('[proposals] fel:', e);
      return json(res, 502, {
        error: e instanceof Error ? e.message : 'Genereringen misslyckades.',
      });
    }
  })();
});

server.listen(PORT, () => {
  console.log(`Rumskiss AI-server lyssnar på http://localhost:${PORT} (modell: ${MODEL})`);
  console.log('Anropen görs via Claude Code-CLI:t med din lokala inloggning.');
});
