import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchProposals, toFurnitureItem, type AiFurniture } from './aiProposals';
import { FURNITURE_CATALOG } from './furnitureCatalog';
import { DEFAULT_MATERIAL } from './materials';
import type { Design } from '../types';

// Minimal stand-in — fetchProposals only serializes this into the request body.
const design = {} as Design;

// Minimal stand-in for a piece in a mocked AI response — only the fields
// toFurnitureItem reads matter here.
function aiFurniture(overrides: Partial<AiFurniture>): AiFurniture {
  return {
    kind: 'sofa',
    name: 'Sofa',
    x: 0,
    z: 0,
    rotationY: 0,
    size: { width: 2.2, depth: 0.9, height: 0.8 },
    elevation: 0,
    color: '#b06a45',
    reasoning: 'Because.',
    ...overrides,
  };
}

describe('toFurnitureItem', () => {
  it('keeps a well-formed AI colour', () => {
    const item = toFurnitureItem(aiFurniture({ color: '#123abc' }));
    expect(item.color).toBe('#123abc');
  });

  it('degrades a malformed AI colour to the same default an ordinary piece gets', () => {
    const item = toFurnitureItem(aiFurniture({ color: 'not-a-colour' }));
    expect(item.color).toBe(FURNITURE_CATALOG.sofa.defaultColor);
  });

  it('degrades a missing AI colour to the same default an ordinary piece gets', () => {
    const item = toFurnitureItem(aiFurniture({ color: undefined as unknown as string }));
    expect(item.color).toBe(FURNITURE_CATALOG.sofa.defaultColor);
  });

  it('falls back to the flat default materials when the model omits per-part materials', () => {
    const item = toFurnitureItem(aiFurniture({}));
    // A sofa's parts default to fabric frame + fabric cushions (furnitureParts.ts).
    expect(item.materials).toEqual({ frame: 'fabric', cushions: 'fabric' });
    expect(item.colors).toBeUndefined();
  });

  it('keeps a well-formed per-part material the model supplied, defaulting the rest', () => {
    const item = toFurnitureItem(aiFurniture({ materials: { frame: 'wood' } }));
    expect(item.materials).toEqual({ frame: 'wood', cushions: 'fabric' });
  });

  it('degrades an unknown material id to the same flat default an ordinary piece gets', () => {
    const item = toFurnitureItem(aiFurniture({ materials: { frame: 'not-a-material' } }));
    expect(item.materials).toEqual({ frame: DEFAULT_MATERIAL, cushions: 'fabric' });
  });

  it('keeps a well-formed per-part colour override the model supplied', () => {
    const item = toFurnitureItem(aiFurniture({ colors: { cushions: '#223344' } }));
    expect(item.colors).toEqual({ cushions: '#223344' });
  });

  it('drops a malformed per-part colour override and an unknown part key', () => {
    const item = toFurnitureItem(
      aiFurniture({ colors: { cushions: 'not-a-colour', bogusPart: '#223344' } }),
    );
    expect(item.colors).toBeUndefined();
  });
});

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
