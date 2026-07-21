import { beforeEach, describe, expect, it, vi } from 'vitest';

// runClaude creates its Anthropic client once at module load and calls
// `client.messages.stream(params, options)`. Mock the SDK's constructor so we can
// inspect exactly what `options` (in particular `signal`) each call received,
// without making a real network call.
// vi.mock's factory is hoisted above regular module-scope const declarations, so the
// mock fn it closes over must itself be created via vi.hoisted (a plain `const
// streamMock = vi.fn()` above would throw a TDZ error at hoist time).
const streamMock = vi.hoisted(() => vi.fn());
vi.mock('@anthropic-ai/sdk', () => {
  class FakeAnthropic {
    messages = { stream: streamMock };
  }
  return { default: FakeAnthropic };
});

// Vitest hoists vi.mock calls above imports, so this import receives the mock above
// (same pattern as judge.test.ts's `vi.mock('./claude.ts', ...)`).
import { runClaude } from './claude.ts';

function okFinalMessage() {
  return {
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: '{"ok":true}' }],
    usage: { input_tokens: 1, output_tokens: 1 },
  };
}

beforeEach(() => streamMock.mockReset());

// This is the direct, isolated proof of the #381 wiring: server/index.ts derives an
// AbortSignal from the client connection ('close' event) and passes it all the way
// down through generateProposals → generateOneProposal/generatePlan → runClaude.
// The two behaviours that make that wiring actually work are both below:
// runClaude must hand the signal to the underlying SDK call, and it must not
// swallow the rejection an abort produces (so it propagates up to the request
// handler's `catch`, whose `finally` releases the concurrency slot immediately —
// see server/index.ts's `/api/proposals` handler). Exercising the real
// req/res socket-close path would require booting the actual http.Server that
// server/index.ts starts as a side effect of being imported (it also calls
// `server.listen(...)` at module scope), which isn't something the rest of the
// test suite does for index.ts either (no index.test.ts exists) — so this test
// verifies the mechanism one layer down, where it's directly observable.
describe('runClaude — abort wiring (#381)', () => {
  it('forwards the given AbortSignal to the underlying stream() call', async () => {
    streamMock.mockReturnValue({ finalMessage: () => Promise.resolve(okFinalMessage()) });
    const controller = new AbortController();

    await runClaude({
      messages: [],
      jsonSchema: {},
      model: 'claude-sonnet-5',
      signal: controller.signal,
    });

    expect(streamMock).toHaveBeenCalledTimes(1);
    const [, options] = streamMock.mock.calls[0] as [unknown, { signal?: AbortSignal }];
    expect(options?.signal).toBe(controller.signal);
  });

  it('runs normally when no signal is provided (no new required option)', async () => {
    streamMock.mockReturnValue({ finalMessage: () => Promise.resolve(okFinalMessage()) });

    const result = await runClaude({ messages: [], jsonSchema: {}, model: 'claude-sonnet-5' });

    expect(result.structuredOutput).toEqual({ ok: true });
    const [, options] = streamMock.mock.calls[0] as [unknown, { signal?: AbortSignal }];
    expect(options?.signal).toBeUndefined();
  });

  it('propagates the abort rejection instead of swallowing it, so a disconnect surfaces as a real failure', async () => {
    const controller = new AbortController();
    const abortError = new DOMException('This operation was aborted', 'AbortError');
    streamMock.mockReturnValue({ finalMessage: () => Promise.reject(abortError) });
    controller.abort();

    await expect(
      runClaude({ messages: [], jsonSchema: {}, model: 'claude-sonnet-5', signal: controller.signal }),
    ).rejects.toBe(abortError);
  });
});
