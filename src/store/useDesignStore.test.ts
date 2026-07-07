import { beforeEach, describe, expect, it } from 'vitest';
import { useDesignStore } from './useDesignStore';
import { DEFAULT_FLOOR_COLOR, DEFAULT_WALL_COLOR } from '../types';

const store = () => useDesignStore.getState();

describe('per-proposal floor and wall colours', () => {
  beforeEach(() => {
    store().newProject();
  });

  it('recolours only the active proposal and keeps each proposal its own palette', () => {
    const first = store().design.activeProposalId;
    store().setColors({ floorColor: '#111111', wallColor: '#222222' });
    expect(store().design.floorColor).toBe('#111111');
    expect(store().design.wallColor).toBe('#222222');

    // A new proposal starts from the current palette, then diverges.
    const second = store().addProposal({ copyCurrent: false });
    expect(store().design.floorColor).toBe('#111111');
    store().setColors({ wallColor: '#333333' });
    expect(store().design.wallColor).toBe('#333333');

    // Switching back restores the first proposal's colours…
    store().setActiveProposal(first);
    expect(store().design.wallColor).toBe('#222222');
    expect(store().design.floorColor).toBe('#111111');

    // …and forward again the second's.
    store().setActiveProposal(second);
    expect(store().design.wallColor).toBe('#333333');
  });

  it('gives an applied AI layout its own palette', () => {
    const id = store().addProposalFromFurniture('AI', [], {
      floorColor: '#0a0a0a',
      wallColor: '#0b0b0b',
    });
    expect(store().design.activeProposalId).toBe(id);
    expect(store().design.floorColor).toBe('#0a0a0a');
    expect(store().design.wallColor).toBe('#0b0b0b');
  });

  it('a fresh room uses the default palette', () => {
    expect(store().design.floorColor).toBe(DEFAULT_FLOOR_COLOR);
    expect(store().design.wallColor).toBe(DEFAULT_WALL_COLOR);
    expect(store().design.proposals[0].floorColor).toBe(DEFAULT_FLOOR_COLOR);
  });
});
