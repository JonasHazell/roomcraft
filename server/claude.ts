import { spawn } from 'node:child_process';

export interface ClaudeRunOptions {
  prompt: string;
  jsonSchema: object;
  model: string;
  /** Only set on the first call in a session. */
  systemPrompt?: string;
  /** Session id from a previous response — continues the same conversation. */
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
 * Runs Claude Code in headless mode (`claude -p`) with no tools and with
 * structured output. Uses the local Claude Code login — no API key needed.
 * NOTE: `--bare` breaks the login (CLI 2.1.174), do not use that flag here.
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
      reject(new Error(`Could not start \`claude\`: ${err.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        return reject(new Error('The Claude call took too long and was aborted.'));
      }
      if (code !== 0) {
        return reject(new Error(`\`claude\` exited with code ${code}: ${stderr || stdout}`));
      }
      let parsed: ClaudeCliResult;
      try {
        parsed = JSON.parse(stdout) as ClaudeCliResult;
      } catch {
        return reject(new Error(`Unexpected response from \`claude\`: ${stdout.slice(0, 300)}`));
      }
      if (parsed.is_error || parsed.subtype !== 'success') {
        return reject(new Error(`The Claude call failed: ${parsed.result}`));
      }
      if (parsed.structured_output === undefined) {
        return reject(new Error('The response has no structured output.'));
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
