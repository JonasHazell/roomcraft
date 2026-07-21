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
  /**
   * Aborts this call the moment the signal fires — wired by the caller from the
   * originating client request (see server/index.ts's `/api/proposals` handler), so
   * a client that disconnects, backgrounds the tab, or drops the network stops the
   * in-flight Claude call immediately instead of running (and billing) to
   * completion. The Anthropic SDK forwards this straight to the underlying
   * `fetch`, so an already-aborted signal short-circuits before any network call
   * is even made. Independent of REQUEST_TIMEOUT_MS below, which bounds a call
   * that has no client-side signal to react to at all.
   */
  signal?: AbortSignal;
}

/** Token counts for one Messages API call, split so cache tokens are visible. */
export interface ClaudeUsage {
  /** Uncached input tokens, billed at the full input rate. */
  inputTokens: number;
  /** Cache-write tokens (first time a prefix is cached), billed at ~1.25× input. */
  cacheWriteTokens: number;
  /** Cache-read tokens (prefix served from cache), billed at ~0.1× input. */
  cacheReadTokens: number;
  /** Generated output tokens, billed at the output rate. */
  outputTokens: number;
}

export interface ClaudeRunResult {
  structuredOutput: unknown;
  /** The assistant's reply — append this to the history before a follow-up turn. */
  assistant: Anthropic.MessageParam;
  /** Rough USD estimate from token usage, for logging only. */
  costUsd: number;
  durationMs: number;
  /** Per-call token breakdown, for logging/aggregation. */
  usage: ClaudeUsage;
}

// Approximate per-million-token prices (USD) for the cost figures in the logs.
// Not billing-accurate — just enough to gauge relative call cost.
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-opus-4-7': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

// Cache tokens are not billed at the plain input rate: a cache write costs ~1.25×
// the input rate (5-minute ephemeral) and a cache read only ~0.1×. Both the system
// prompt and the shared room/catalog block carry cache breakpoints, so ignoring
// these multipliers would overstate the cost of every proposal and repair call.
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

// Each Messages API call is a streamed HTTP request with no deadline of its own, and
// one /api/proposals request fans out into up to ~15 sequential logical calls (planning,
// three directions × up to 4 rounds each, an optional judge) behind a small
// MAX_CONCURRENT gate (=2, server/index.ts). So a single wedged stream can hold a scarce
// concurrency slot and shed ALL AI traffic (503s) until it finally gives up — the
// reliability failure #331 is about. These two knobs bound how long that can last.
//
// REQUEST_TIMEOUT_MS — per-call ceiling. The [proposals] logs measure real calls in
// seconds to low tens of seconds, and even a maximal 16k-token streamed completion lands
// comfortably inside two minutes, so this will not cut off a legitimately slow
// generation. It is ~5× tighter than the SDK's ~10-minute default, so a truly stuck
// stream frees its slot in minutes rather than ten. It also sits under the client's own
// 240s whole-request budget (TIMEOUT_MS in src/store/useAiStore.ts). If production
// durationMs shows a higher real p99 per call, raise this — it is the one number a
// reviewer with logs will want to tune.
const REQUEST_TIMEOUT_MS = 120_000;

// MAX_RETRIES — set explicitly (this equals the SDK's own default of 2, previously
// inherited invisibly). Kept at 2 so transient 429/500/529 blips still recover: each
// request issues many calls, so one flake should not fail a whole direction. Pinning it
// here makes the behaviour visible to the cost/latency accounting and independent of any
// future SDK default change. Retries only re-fire on retryable errors (which include
// connection timeouts), so in the pathological case a stuck stream gives up after at most
// (MAX_RETRIES + 1) × REQUEST_TIMEOUT_MS = 6 min — still well under the SDK default.
const MAX_RETRIES = 2;

// Reads credentials from the environment (ANTHROPIC_API_KEY, or ANTHROPIC_AUTH_TOKEN).
const client = new Anthropic({ timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES });

/**
 * Calls the Anthropic Messages API with structured outputs, constraining the
 * response to `jsonSchema`. Streams the response so long generations don't hit
 * the HTTP timeout, then returns the parsed JSON. Uses an API key — no local
 * Claude Code login or `claude` subprocess involved.
 *
 * The system prompt is sent as a cached block (`cache_control`): it is identical
 * across every proposal and repair call, so after the first request it is served
 * from cache — cheaper and faster to first token. Caching of the shared room /
 * catalog context is set up by the caller (a `cache_control` breakpoint on that
 * block); see server/index.ts.
 *
 * Thinking is disabled: the previous model (Opus 4.8) ran without it, structured
 * output already blocks any stray reasoning from leaking into the JSON, and for a
 * latency-sensitive endpoint the extra thinking tokens would eat into the speedup
 * from running the proposals in parallel. Flip to `{ type: 'adaptive' }` if a
 * future model needs the reasoning depth.
 */
export async function runClaude(opts: ClaudeRunOptions): Promise<ClaudeRunResult> {
  const start = Date.now();
  const message = await client.messages
    .stream(
      {
        model: opts.model,
        max_tokens: opts.maxTokens ?? 16000,
        thinking: { type: 'disabled' },
        system: opts.systemPrompt
          ? [{ type: 'text', text: opts.systemPrompt, cache_control: { type: 'ephemeral' } }]
          : undefined,
        messages: opts.messages,
        output_config: { format: { type: 'json_schema', schema: opts.jsonSchema } },
      },
      { signal: opts.signal },
    )
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

  // `input_tokens` from the API is the uncached remainder; cache reads and writes
  // are reported separately (and may be undefined when nothing was cached).
  const usage: ClaudeUsage = {
    inputTokens: message.usage.input_tokens,
    cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
    outputTokens: message.usage.output_tokens,
  };

  const price = PRICES[opts.model] ?? PRICES['claude-opus-4-8'];
  const costUsd =
    (usage.inputTokens * price.input +
      usage.cacheWriteTokens * price.input * CACHE_WRITE_MULTIPLIER +
      usage.cacheReadTokens * price.input * CACHE_READ_MULTIPLIER +
      usage.outputTokens * price.output) /
    1_000_000;

  return {
    structuredOutput,
    assistant: { role: 'assistant', content: message.content },
    costUsd,
    durationMs,
    usage,
  };
}
