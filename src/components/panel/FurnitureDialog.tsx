import { useCallback, useEffect, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useUiStore } from '../../store/useUiStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';
import { useEscape } from '../../lib/useEscape';
import { FurnitureFields } from './FurnitureFields';
import { FurniturePicker, type Source } from './FurniturePicker';
import { applyPatch, type FurnitureDraft } from './furnitureDraft';
import { PropertiesPanel } from './PropertiesPanel';

/**
 * Modal for adding and editing furniture. In `create` mode it walks through a
 * type picker and then a form, committing a new piece on "Add to room". In
 * `edit` mode it opens the very same form (via PropertiesPanel) pre-filled with
 * the selected piece's values, so "More" surfaces exactly the box used to add it.
 */
export function FurnitureDialog() {
  const dialog = useUiStore((s) => s.furnitureDialog);
  const close = useUiStore((s) => s.closeFurnitureDialog);
  const select = useUiStore((s) => s.select);
  const addFurnitureConfigured = useDesignStore((s) => s.addFurnitureConfigured);
  const libraryEntries = useLibraryStore((s) => s.entries);
  const saveToLibrary = useLibraryStore((s) => s.save);
  const removeFromLibrary = useLibraryStore((s) => s.remove);

  // In create mode we hold a local draft; `null` means the type picker is showing.
  const [draft, setDraft] = useState<FurnitureDraft | null>(null);
  // While picking, toggle between a fresh generic piece and one from the library.
  const [source, setSource] = useState<Source>('generic');
  // Which piece we've just saved to the library — drives the footer's ✓ feedback.
  const [savedForId, setSavedForId] = useState<string | null>(null);

  // Reset to the type picker each time the create dialog (re)opens; clear any
  // "saved" feedback each time the dialog changes.
  useEffect(() => {
    if (dialog?.mode === 'create') {
      setDraft(null);
      setSource('generic');
    }
    setSavedForId(null);
  }, [dialog]);

  const editId = dialog?.mode === 'edit' ? dialog.id : null;
  // The live piece being edited — the footer's "Save to library" reads from it.
  const editItem = useDesignStore((s) =>
    editId ? s.design.furniture.find((f) => f.id === editId) : undefined,
  );

  // Edits in edit mode go straight to the store (live 3D preview). Wrap the whole
  // open dialog in one history batch: OK commits it as a single undo step,
  // Cancel/✕/Esc rolls it back. This replaces the old hand-maintained snapshot
  // (which had to list every editable field by hand to restore it).
  useEffect(() => {
    if (!editId) return;
    useHistoryStore.getState().beginBatch();
    return () => useHistoryStore.getState().endBatch();
  }, [editId]);

  const commitEdit = useCallback(() => {
    useHistoryStore.getState().endBatch();
    close();
  }, [close]);

  // In create mode the draft is local, so a plain close already discards it.
  const dismiss = useCallback(() => {
    if (dialog?.mode === 'edit') useHistoryStore.getState().cancelBatch();
    close();
  }, [dialog, close]);

  // Esc dismisses the dialog. App's global handler bails out while a dialog is
  // open, so closing here doesn't also clear the selection.
  useEscape(dismiss, !!dialog);

  if (!dialog) return null;

  const picking = dialog.mode === 'create' && draft === null;
  const title =
    dialog.mode === 'edit'
      ? 'Selected furniture'
      : draft
        ? `New ${FURNITURE_CATALOG[draft.kind].label.toLowerCase()}`
        : 'Add furniture';

  return (
    <div className="modal-backdrop" role="presentation" onClick={dismiss}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={dialog.mode === 'edit' ? 'Furniture settings' : 'Add furniture'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button type="button" className="btn-icon" aria-label="Close" onClick={dismiss}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {dialog.mode === 'edit' ? (
            <PropertiesPanel />
          ) : picking ? (
            <FurniturePicker
              source={source}
              onSourceChange={setSource}
              onPick={setDraft}
              libraryEntries={libraryEntries}
              onRemoveFromLibrary={removeFromLibrary}
            />
          ) : (
            draft && (
              <div className="stack">
                <FurnitureFields
                  value={draft}
                  onChange={(patch) => setDraft((d) => (d ? applyPatch(d, patch) : d))}
                />
              </div>
            )
          )}
        </div>

        {dialog.mode === 'edit' && (
          <div className="modal-foot">
            <button
              type="button"
              className="btn"
              title="Save this piece with its dimensions and color so you can add it again"
              aria-label="Save to library"
              disabled={!editItem}
              onClick={() => {
                if (!editItem) return;
                saveToLibrary({
                  name: editItem.name,
                  kind: editItem.kind,
                  size: { ...editItem.size },
                  elevation: editItem.elevation,
                  color: editItem.color,
                });
                setSavedForId(editItem.id);
              }}
            >
              {savedForId && savedForId === editItem?.id ? (
                <>
                  <span aria-hidden="true">✓</span> Saved to library
                </>
              ) : (
                <>
                  <span aria-hidden="true">☆</span> Save to library
                </>
              )}
            </button>
            <button type="button" className="btn btn-accent" onClick={commitEdit}>
              OK
            </button>
          </div>
        )}

        {dialog.mode === 'create' && draft !== null && (
          <div className="modal-foot">
            <button type="button" className="btn" onClick={() => setDraft(null)}>
              <span aria-hidden="true">←</span> Back
            </button>
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => {
                const id = addFurnitureConfigured(draft);
                select({ kind: 'furniture', id });
                close();
              }}
            >
              Add to room
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
