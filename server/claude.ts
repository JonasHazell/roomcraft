import { spawn } from 'node:child_process';

export interface ClaudeRunOptions {
  prompt: string;
  jsonSchema: object;
  model: string;
  /** Sätts bara på första anropet i en session. */
  systemPrompt?: string;
  /** Session-id från ett tidigare svar — fortsätter samma konversation. */
  resume?: string;
  timeoutMs?: number;
}

export interface ClaudeRunResult {
  structuredOutput: unknown;
  sessionId: string;
  costUsd: number;
  durationMs: number;
}

interface ClaudeCliResult {
  subtype: string;
  is_error: boolean;
  result: string;
  structured_output?: unknown;
  session_id: string;
  total_cost_usd: number;
  duration_ms: number;
}

/**
 * Kör Claude Code i headless-läge (`claude -p`) utan verktyg och med
 * strukturerad output. Använder den lokala Claude Code-inloggningen —
 * ingen API-nyckel behövs. OBS: `--bare` bryter inloggningen (CLI 2.1.174),
 * använd inte den flaggan här.
 */
export function runClaude(opts: ClaudeRunOptions): Promise<ClaudeRunResult> {
  const args = [
    '-p',
    '--output-format',
    'json',
    '--model',
    opts.model,
    '--tools',
    '',
    '--json-schema',
    JSON.stringify(opts.jsonSchema),
  ];
  if (opts.systemPrompt) args.push('--system-prompt', opts.systemPrompt);
  if (opts.resume) args.push('--resume', opts.resume);

  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, opts.timeoutMs ?? 300_000);

    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Kunde inte starta \`claude\`: ${err.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        return reject(new Error('Claude-anropet tog för lång tid och avbröts.'));
      }
      if (code !== 0) {
        return reject(new Error(`\`claude\` avslutades med kod ${code}: ${stderr || stdout}`));
      }
      let parsed: ClaudeCliResult;
      try {
        parsed = JSON.parse(stdout) as ClaudeCliResult;
      } catch {
        return reject(new Error(`Oväntat svar från \`claude\`: ${stdout.slice(0, 300)}`));
      }
      if (parsed.is_error || parsed.subtype !== 'success') {
        return reject(new Error(`Claude-anropet misslyckades: ${parsed.result}`));
      }
      if (parsed.structured_output === undefined) {
        return reject(new Error('Svaret saknar strukturerad output.'));
      }
      resolve({
        structuredOutput: parsed.structured_output,
        sessionId: parsed.session_id,
        costUsd: parsed.total_cost_usd,
        durationMs: parsed.duration_ms,
      });
    });

    child.stdin.write(opts.prompt);
    child.stdin.end();
  });
}
