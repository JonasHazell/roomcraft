import Anthropic from '@anthropic-ai/sdk';

/**
 * A conversation history for the Messages API. The API is stateless, so the
 * full history (plus the system prompt) is sent on every call; a follow-up turn
 * appends the previous assistant reply and a new user message. This replaces the
 * Claude Code CLI's `--resume` session model.
 */
export type ChatMessages = Anthropic.MessageParam[];

export interface ClaudeRunOptions {
  messages: ChatMessages;
  /** JSON Schema the response is constrained to (structured outputs). */
  jsonSchema: Record<string, unknown>;
  model: string;
  systemPrompt?: string;
  maxTokens?: number;
}

export interface ClaudeRunResult {
  structuredOutput: unknown;
  /** The assistant's reply — append this to the history before a follow-up turn. */
  assistant: Anthropic.MessageParam;
  /** Rough USD estimate from token usage, for logging only. */
  costUsd: number;
  durationMs: number;
}

// Approximate per-million-token prices (USD) for the cost figures in the logs.
// Not billing-accurate — just enough to gauge relative call cost.
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-opus-4-7': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

// Reads credentials from the environment (ANTHROPIC_API_KEY, or ANTHROPIC_AUTH_TOKEN).
const client = new Anthropic();

/**
 * Calls the Anthropic Messages API with structured outputs, constraining the
 * response to `jsonSchema`. Streams the response so long generations don't hit
 * the HTTP timeout, then returns the parsed JSON. Uses an API key — no local
 * Claude Code login or `claude` subprocess involved.
 */
export async function runClaude(opts: ClaudeRunOptions): Promise<ClaudeRunResult> {
  const start = Date.now();
  const message = await client.messages
    .stream({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 16000,
      system: opts.systemPrompt,
      messages: opts.messages,
      output_config: { format: { type: 'json_schema', schema: opts.jsonSchema } },
    })
    .finalMessage();
  const durationMs = Date.now() - start;

  if (message.stop_reason === 'refusal') {
    throw new Error('The model declined to answer this request.');
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('The response was cut off (max_tokens). Try a smaller room or raise the limit.');
  }

  // With json_schema structured output the reply is a single text block of JSON.
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  let structuredOutput: unknown;
  try {
    structuredOutput = JSON.parse(text);
  } catch {
    throw new Error('The model returned a response that was not valid JSON.');
  }

  const price = PRICES[opts.model] ?? PRICES['claude-opus-4-8'];
  const costUsd =
    (message.usage.input_tokens * price.input + message.usage.output_tokens * price.output) /
    1_000_000;

  return {
    structuredOutput,
    assistant: { role: 'assistant', content: message.content },
    costUsd,
    durationMs,
  };
}
