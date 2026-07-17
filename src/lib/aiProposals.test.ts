import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchProposals } from './aiProposals';
import type { Design } from '../types';

// Minimal stand-in — fetchProposals only serializes this into the request body.
const design = {} as Design;

describe('fetchProposals', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a plain-language fallback when a failed response has no structured error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve(null),
      }),
    );

    await expect(fetchProposals(design, 'a cozy reading nook')).rejects.toThrow(
      "Couldn't get suggestions right now — please try again in a moment.",
    );
  });

  it('still surfaces the server-provided message when one is returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Needs must be under 500 characters.' }),
      }),
    );

    await expect(fetchProposals(design, 'a cozy reading nook')).rejects.toThrow(
      'Needs must be under 500 characters.',
    );
  });

  it('shows the network-failure message when the request itself fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(fetchProposals(design, 'a cozy reading nook')).rejects.toThrow(
      'Could not reach the AI service. Check your connection and try again.',
    );
  });

  it('applies a default abort signal when the caller supplies none', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ proposals: [], warnings: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchProposals(design, 'a cozy reading nook');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('forwards a caller-supplied signal unchanged instead of the default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ proposals: [], warnings: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    await fetchProposals(design, 'a cozy reading nook', controller.signal);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBe(controller.signal);
  });
});
