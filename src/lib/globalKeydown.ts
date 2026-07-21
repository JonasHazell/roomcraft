import { useDesignStore } from '../store/useDesignStore';
import { useDialogStore } from '../store/useDialogStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { useUiStore } from '../store/useUiStore';

/**
 * The app's single global keydown handler: undo/redo, Esc (close the topmost
 * overlay — dialog › panel › selection), and the furniture selection shortcuts
 * (rotate/duplicate/delete). Pulled out of `App.tsx` so it can be unit tested
 * without rendering the component tree.
 */
export function handleGlobalKeydown(e: KeyboardEvent): void {
  const t = e.target as HTMLElement | null;
  const inField =
    !!t &&
    (t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.tagName === 'SELECT' ||
      t.isContentEditable);
  // Every shortcut below is suppressed while typing in a field — except Esc.
  // Every other overlay in the app (dialogs, the AI panel) still closes on Esc
  // even while a field inside it has focus, so the wall panel (whose Length
  // and opening fields are plain inputs) needs to behave the same way instead
  // of silently swallowing the key.
  if (inField && e.key !== 'Escape') {
    return;
  }
  // While the furniture dialog, a confirm/prompt dialog, the auth dialog, the
  // keyboard-shortcuts reference or the room summary is open it owns the
  // keyboard (Esc closes it, handled by the overlay itself — see
  // ShortcutsReference / RoomSummary), so don't also deselect or rotate behind
  // it.
  if (
    useUiStore.getState().furnitureDialog ||
    useUiStore.getState().authDialogOpen ||
    useUiStore.getState().shortcutsOpen ||
    useUiStore.getState().summaryOpen ||
    useDialogStore.getState().active
  ) {
    return;
  }
  // Editing shortcuts only apply inside a room, never in the lobby.
  if (useUiStore.getState().appView === 'lobby') return;
  // Undo/redo work regardless of the current selection.
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    if (e.shiftKey) useHistoryStore.getState().redo();
    else useHistoryStore.getState().undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
    e.preventDefault();
    useHistoryStore.getState().redo();
    return;
  }
  const { selection, select } = useUiStore.getState();
  if (e.key === 'Escape') {
    // Esc closes one overlay at a time: dialog › panel › selection. Dialogs
    // are already handled above; if a side panel is open let it close first
    // (SidePanel's own Esc handler does that) and keep the selection.
    if (useUiStore.getState().panel) return;
    // A field that was swallowing the key (e.g. the wall panel's Length
    // input) doesn't disappear on its own until the selection actually
    // clears below, so blur it explicitly rather than leaving it focused
    // on a detached node.
    if (inField) t?.blur();
    select(null);
    return;
  }
  if (!selection) return;
  if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) {
    if (selection.kind === 'furniture') {
      e.preventDefault();
      const newId = useDesignStore.getState().duplicateFurniture(selection.id);
      if (newId) select({ kind: 'furniture', id: newId });
    } else if (selection.kind === 'furniture-multi') {
      // Same duplicate call as a single piece, just run over every id in the
      // group — the fresh copies become the new selection, same as one does.
      e.preventDefault();
      const { duplicateFurniture } = useDesignStore.getState();
      const newIds = selection.ids
        .map((id) => duplicateFurniture(id))
        .filter((newId): newId is string => !!newId);
      if (newIds.length > 0) {
        select(
          newIds.length > 1
            ? { kind: 'furniture-multi', ids: newIds }
            : { kind: 'furniture', id: newIds[0] },
        );
      }
    }
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selection.kind === 'furniture') {
      useDesignStore.getState().removeFurniture(selection.id);
      select(null);
    } else if (selection.kind === 'furniture-multi') {
      const { removeFurniture } = useDesignStore.getState();
      selection.ids.forEach((id) => removeFurniture(id));
      select(null);
    } else if (selection.kind === 'wall') {
      // Only interior walls can be removed; the store ignores exterior walls.
      useDesignStore.getState().removeWall(selection.id);
      select(null);
    }
  } else if ((e.key === 'r' || e.key === 'R') && selection.kind === 'furniture') {
    const { design, updateFurniture } = useDesignStore.getState();
    const item = design.furniture.find((f) => f.id === selection.id);
    // R rotates right (clockwise from above), Shift+R left.
    const step = e.shiftKey ? Math.PI / 2 : -Math.PI / 2;
    if (item) updateFurniture(selection.id, { rotationY: item.rotationY + step });
  }
}
