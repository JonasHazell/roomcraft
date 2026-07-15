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
});
