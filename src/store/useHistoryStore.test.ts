import { beforeEach, describe, expect, it } from 'vitest';
import { useDesignStore } from './useDesignStore';
import { useHistoryStore } from './useHistoryStore';

function furnitureCount() {
  return useDesignStore.getState().design.furniture.length;
}

describe('history (undo/redo)', () => {
  beforeEach(() => {
    useDesignStore.getState().newProject();
    useHistoryStore.getState().clear();
  });

  it('starts with nothing to undo or redo', () => {
    expect(useHistoryStore.getState().canUndo).toBe(false);
    expect(useHistoryStore.getState().canRedo).toBe(false);
  });

  it('records a step per action and undoes/redoes it', () => {
    useDesignStore.getState().addFurniture('chair');
    expect(furnitureCount()).toBe(1);
    expect(useHistoryStore.getState().canUndo).toBe(true);
    expect(useHistoryStore.getState().canRedo).toBe(false);

    useHistoryStore.getState().undo();
    expect(furnitureCount()).toBe(0);
    expect(useHistoryStore.getState().canUndo).toBe(false);
    expect(useHistoryStore.getState().canRedo).toBe(true);

    useHistoryStore.getState().redo();
    expect(furnitureCount()).toBe(1);
    expect(useHistoryStore.getState().canRedo).toBe(false);
  });

  it('undoes multiple actions in reverse order', () => {
    useDesignStore.getState().addFurniture('chair');
    useDesignStore.getState().addFurniture('table');
    expect(furnitureCount()).toBe(2);

    useHistoryStore.getState().undo();
    expect(furnitureCount()).toBe(1);
    useHistoryStore.getState().undo();
    expect(furnitureCount()).toBe(0);
    expect(useHistoryStore.getState().canUndo).toBe(false);
  });

  it('drops the redo stack once a new action is taken', () => {
    useDesignStore.getState().addFurniture('chair');
    useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().canRedo).toBe(true);

    useDesignStore.getState().addFurniture('table');
    expect(useHistoryStore.getState().canRedo).toBe(false);
  });

  it('folds a batch of changes into a single undo step', () => {
    const id = useDesignStore.getState().addFurniture('chair');
    // The add is one step; the drag below should add exactly one more.
    useHistoryStore.getState().beginBatch();
    useDesignStore.getState().moveFurniture(id, 0.5, 0.5);
    useDesignStore.getState().moveFurniture(id, 0.8, 0.8);
    useDesignStore.getState().moveFurniture(id, 1.0, 1.0);
    useHistoryStore.getState().endBatch();

    // One undo reverses the whole drag back to where the piece was added.
    useHistoryStore.getState().undo();
    expect(furnitureCount()).toBe(1);
    // A second undo removes the piece entirely (the add step).
    useHistoryStore.getState().undo();
    expect(furnitureCount()).toBe(0);
  });

  it('restores proposal-level edits such as colours', () => {
    const before = useDesignStore.getState().design.wallColor;
    useDesignStore.getState().setColors({ wallColor: '#123456' });
    expect(useDesignStore.getState().design.wallColor).toBe('#123456');

    useHistoryStore.getState().undo();
    expect(useDesignStore.getState().design.wallColor).toBe(before);
  });

  it('scopes history to the active variation (proposal), not globally', () => {
    const store = useDesignStore.getState;
    const p1 = store().design.activeProposalId;

    // Edit proposal 1: one undoable step lives on its stack.
    store().addFurniture('chair');
    expect(furnitureCount()).toBe(1);
    expect(useHistoryStore.getState().canUndo).toBe(true);

    // Creating and switching to proposal 2 is navigation, not an undo step: the
    // new variation starts with an empty history.
    const p2 = store().addProposal({ copyCurrent: false });
    expect(store().design.activeProposalId).toBe(p2);
    expect(furnitureCount()).toBe(0);
    expect(useHistoryStore.getState().canUndo).toBe(false);
    expect(useHistoryStore.getState().canRedo).toBe(false);

    // Edits in proposal 2 undo independently and never touch proposal 1.
    store().addFurniture('table');
    expect(furnitureCount()).toBe(1);
    useHistoryStore.getState().undo();
    expect(furnitureCount()).toBe(0);
    expect(useHistoryStore.getState().canUndo).toBe(false);

    // Back on proposal 1, its own step survived the detour and still undoes.
    store().setActiveProposal(p1);
    expect(furnitureCount()).toBe(1);
    expect(useHistoryStore.getState().canUndo).toBe(true);
    useHistoryStore.getState().undo();
    expect(furnitureCount()).toBe(0);
  });

  it('keeps each variation redo stack across proposal switches', () => {
    const store = useDesignStore.getState;
    const p1 = store().design.activeProposalId;

    store().addFurniture('chair');
    useHistoryStore.getState().undo();
    expect(furnitureCount()).toBe(0);
    expect(useHistoryStore.getState().canRedo).toBe(true);

    // Switch away and back: proposal 1's redo is still available.
    const p2 = store().addProposal({ copyCurrent: false });
    expect(useHistoryStore.getState().canRedo).toBe(false);
    store().setActiveProposal(p1);
    expect(useHistoryStore.getState().canRedo).toBe(true);
    useHistoryStore.getState().redo();
    expect(furnitureCount()).toBe(1);

    // Proposal 2 remains untouched by proposal 1's redo.
    store().setActiveProposal(p2);
    expect(furnitureCount()).toBe(0);
  });
});
