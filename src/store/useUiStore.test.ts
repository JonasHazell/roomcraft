import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './useUiStore';

describe('ui store — selection vs. open overlays', () => {
  beforeEach(() => {
    useUiStore.setState({
      selection: null,
      panel: null,
      proposalMenuOpen: false,
      appView: 'furnish',
    });
  });

  it('closes a side panel when a new object is selected', () => {
    useUiStore.getState().openPanel('ai');
    useUiStore.getState().select({ kind: 'furniture', id: 'f1' });
    expect(useUiStore.getState().panel).toBeNull();
    expect(useUiStore.getState().selection).toEqual({ kind: 'furniture', id: 'f1' });
  });

  it('closes a side panel when a wall is selected', () => {
    useUiStore.getState().openPanel('validation');
    useUiStore.getState().select({ kind: 'wall', id: 'w1' });
    expect(useUiStore.getState().panel).toBeNull();
    expect(useUiStore.getState().selection).toEqual({ kind: 'wall', id: 'w1' });
  });

  it('leaves the panel untouched when clearing the selection', () => {
    useUiStore.getState().openPanel('validation');
    useUiStore.getState().select(null);
    expect(useUiStore.getState().panel).toBe('validation');
  });

  it('closes a side panel when the add-furniture dialog opens', () => {
    useUiStore.getState().openPanel('ai');
    useUiStore.getState().openAddFurniture();
    expect(useUiStore.getState().panel).toBeNull();
    expect(useUiStore.getState().furnitureDialog).toEqual({ mode: 'create' });
  });

  it('closes a side panel when the edit-furniture dialog opens', () => {
    useUiStore.getState().openPanel('validation');
    useUiStore.getState().openEditFurniture('f1');
    expect(useUiStore.getState().panel).toBeNull();
    expect(useUiStore.getState().furnitureDialog).toEqual({ mode: 'edit', id: 'f1' });
  });

  it('clears the proposal menu flag when leaving the view', () => {
    useUiStore.getState().setProposalMenuOpen(true);
    useUiStore.getState().setAppView('lobby');
    expect(useUiStore.getState().proposalMenuOpen).toBe(false);
  });
});
