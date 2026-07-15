import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleGlobalKeydown } from './globalKeydown';
import { useUiStore } from '../store/useUiStore';
import { useDialogStore } from '../store/useDialogStore';

/**
 * A minimal stand-in for a focused form field. The handler only reads
 * `tagName`/`isContentEditable` off the event target and, for Escape, calls
 * `blur()` on it — no real DOM is needed to exercise that.
 */
function fakeField(tagName: 'INPUT' | 'TEXTAREA' | 'SELECT') {
  return { tagName, isContentEditable: false, blur: vi.fn() } as unknown as HTMLElement;
}

function keydown(key: string, target: HTMLElement | null = null, extra: Partial<KeyboardEvent> = {}) {
  return {
    key,
    target,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault: vi.fn(),
    ...extra,
  } as unknown as KeyboardEvent;
}

describe('global keydown handler — Escape reaches the topmost overlay even while typing', () => {
  beforeEach(() => {
    useUiStore.setState({
      selection: null,
      panel: null,
      furnitureDialog: null,
      authDialogOpen: false,
      proposalMenuOpen: false,
      appView: 'plan',
    });
    useDialogStore.setState({ active: null });
  });

  it('closes the wall panel (clears a wall selection) on Escape even while its Length field has focus', () => {
    useUiStore.getState().select({ kind: 'wall', id: 'w1' });
    const field = fakeField('INPUT');

    handleGlobalKeydown(keydown('Escape', field));

    expect(useUiStore.getState().selection).toBeNull();
    expect(field.blur).toHaveBeenCalledTimes(1);
  });

  it('still closes an open side panel first, leaving the selection, on Escape while typing', () => {
    useUiStore.getState().select({ kind: 'furniture', id: 'f1' });
    useUiStore.setState({ panel: 'validation' });
    const field = fakeField('INPUT');

    handleGlobalKeydown(keydown('Escape', field));

    // Dialog › panel › selection: a side panel is open, so Escape only closes
    // it (via the panel's own handler) and the selection is left alone here.
    expect(useUiStore.getState().selection).toEqual({ kind: 'furniture', id: 'f1' });
  });

  it('does not clear the selection on Escape while a dialog owns the keyboard', () => {
    useUiStore.getState().select({ kind: 'wall', id: 'w1' });
    useDialogStore.setState({
      active: {
        kind: 'confirm',
        title: '',
        message: '',
        confirmLabel: '',
        cancelLabel: '',
        danger: false,
        resolve: () => {},
      },
    });
    const field = fakeField('INPUT');

    handleGlobalKeydown(keydown('Escape', field));

    expect(useUiStore.getState().selection).toEqual({ kind: 'wall', id: 'w1' });
  });

  it('still suppresses other shortcuts (e.g. Delete) while a field has focus', () => {
    useUiStore.getState().select({ kind: 'wall', id: 'w1' });
    const field = fakeField('INPUT');

    handleGlobalKeydown(keydown('Delete', field));

    // Unlike Escape, Delete belongs to the field's own editing, not to the
    // wall — the selection (and so the panel) must stay untouched.
    expect(useUiStore.getState().selection).toEqual({ kind: 'wall', id: 'w1' });
  });

  it('clears the selection on Escape as before when nothing has focus', () => {
    useUiStore.getState().select({ kind: 'wall', id: 'w1' });

    handleGlobalKeydown(keydown('Escape', null));

    expect(useUiStore.getState().selection).toBeNull();
  });
});
