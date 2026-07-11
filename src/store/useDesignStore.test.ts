import { beforeEach, describe, expect, it } from 'vitest';
import { useDesignStore } from './useDesignStore';
import { defaultOpening } from '../lib/polygon';
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

describe('naming and reordering proposals', () => {
  beforeEach(() => {
    store().newProject();
  });

  it('renames a proposal and falls back to a default name when blank', () => {
    const id = store().design.activeProposalId;
    store().renameProposal(id, '  Cosy layout  ');
    expect(store().design.proposals.find((p) => p.id === id)?.name).toBe('Cosy layout');

    // A blank name is not accepted — it falls back to the next free "Proposal N".
    store().renameProposal(id, '   ');
    expect(store().design.proposals.find((p) => p.id === id)?.name).toBe('Proposal 1');
  });

  it('reorders proposals by moving one to another position', () => {
    const first = store().design.activeProposalId;
    const second = store().addProposal({ copyCurrent: false });
    const third = store().addProposal({ copyCurrent: false });
    expect(store().design.proposals.map((p) => p.id)).toEqual([first, second, third]);

    // Drag the first onto the third's slot: it lands where the third was.
    store().reorderProposals(first, third);
    expect(store().design.proposals.map((p) => p.id)).toEqual([second, third, first]);

    // Reordering never changes which proposal is active.
    expect(store().design.activeProposalId).toBe(third);

    // A no-op move (unknown or identical ids) leaves the order untouched.
    store().reorderProposals(first, first);
    store().reorderProposals('nope', third);
    expect(store().design.proposals.map((p) => p.id)).toEqual([second, third, first]);
  });
});

describe('discarding an undrawn new room', () => {
  const RECT = [
    { x: -2, z: -2.5 },
    { x: 2, z: -2.5 },
    { x: 2, z: 2.5 },
    { x: -2, z: 2.5 },
  ];

  beforeEach(() => {
    store().newProject();
  });

  it('drops a new room that was never drawn and reactivates the previous one', () => {
    const firstId = store().design.id;
    const newId = store().createRoom();
    expect(store().project.rooms).toHaveLength(2);
    expect(store().project.activeRoomId).toBe(newId);

    store().discardRoomIfUndrawn(newId);

    expect(store().project.rooms.map((r) => r.id)).toEqual([firstId]);
    expect(store().project.activeRoomId).toBe(firstId);
    expect(store().design.id).toBe(firstId);
  });

  it('keeps a new room once its outline has been drawn', () => {
    const newId = store().createRoom();
    const result = store().commitExteriorPolygon(RECT);
    expect(result.ok).toBe(true);

    store().discardRoomIfUndrawn(newId);

    expect(store().project.rooms.map((r) => r.id)).toContain(newId);
    expect(store().project.activeRoomId).toBe(newId);
  });

  it('leaves an empty workspace when the only room is undrawn', () => {
    store().loadProject({ ...store().project, rooms: [], activeRoomId: '' });
    const onlyId = store().createRoom();
    expect(store().project.rooms).toHaveLength(1);

    store().discardRoomIfUndrawn(onlyId);

    expect(store().project.rooms).toHaveLength(0);
    expect(store().project.activeRoomId).toBe('');
  });
});

describe('adding doors and windows to a wall', () => {
  const RECT = [
    { x: -2, z: -2.5 },
    { x: 2, z: -2.5 },
    { x: 2, z: 2.5 },
    { x: -2, z: 2.5 },
  ];

  beforeEach(() => {
    store().newProject();
    store().commitExteriorPolygon(RECT);
  });

  it('adds an opening on the given wall and returns its id', () => {
    const wallId = store().design.walls[0].id;
    const id = store().addOpening(defaultOpening('door', wallId));

    expect(id).toBeTruthy();
    const openings = store().design.openings;
    expect(openings).toHaveLength(1);
    expect(openings[0].id).toBe(id);
    expect(openings[0]).toMatchObject({ kind: 'door', wallId, elevation: 0 });
  });

  it('refuses an opening on a wall that does not exist', () => {
    expect(store().addOpening(defaultOpening('window', 'nope'))).toBeNull();
    expect(store().design.openings).toHaveLength(0);
  });

  it('updates and removes an opening', () => {
    const wallId = store().design.walls[0].id;
    const id = store().addOpening(defaultOpening('window', wallId))!;

    store().updateOpening(id, { width: 1.5, elevation: 1 });
    const updated = store().design.openings.find((o) => o.id === id)!;
    expect(updated.width).toBe(1.5);
    expect(updated.elevation).toBe(1);

    store().removeOpening(id);
    expect(store().design.openings).toHaveLength(0);
  });
});
