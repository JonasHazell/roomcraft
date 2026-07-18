import { useCallback, useEffect, useRef, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useUiStore } from '../../store/useUiStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useEscape } from '../../lib/useEscape';
import type { FurnitureKind, FurnitureLibraryEntry } from '../../types';
import { buyButtonLabel, buyButtonTitle, isValidProductUrl } from '../../lib/furnitureProduct';
import { Icon } from '../ui/Icon';
import { FurniturePicker, type Source } from './FurniturePicker';
import { PropertiesPanel } from './PropertiesPanel';
import { FurnitureFindings } from './FurnitureFindings';

/**
 * Modal for adding and editing furniture. In `create` mode it shows the type
 * picker; picking a kind places a default-configured piece into the room right
 * away and hands off to `edit` mode — the very same live-editing surface (via
 * PropertiesPanel) used for "More" on an existing piece — so the room and the
 * new piece are visible immediately instead of being configured behind a form
 * first. The whole "pick → place → tweak" sequence is one undo step.
 */
export function FurnitureDialog() {
  const dialog = useUiStore((s) => s.furnitureDialog);
  const close = useUiStore((s) => s.closeFurnitureDialog);
  const openEditFurniture = useUiStore((s) => s.openEditFurniture);
  const addFurniture = useDesignStore((s) => s.addFurniture);
  const addFurnitureFromLibrary = useDesignStore((s) => s.addFurnitureFromLibrary);
  const libraryEntries = useLibraryStore((s) => s.entries);
  const saveToLibrary = useLibraryStore((s) => s.save);
  const renameLibraryEntry = useLibraryStore((s) => s.rename);
  const removeFromLibrary = useLibraryStore((s) => s.remove);

  // While picking, toggle between a fresh generic piece and one from the library.
  const [source, setSource] = useState<Source>('generic');
  // Which piece we've just saved to the library — drives the footer's ✓ feedback.
  const [savedForId, setSavedForId] = useState<string | null>(null);
  // The piece just placed from the picker, whose edit session is the create→edit
  // hand-off. Distinguishes that case from editing an existing piece via "More"
  // (both land in `edit` mode) so only the hand-off gets the shorter mobile sheet.
  const [justPlacedId, setJustPlacedId] = useState<string | null>(null);

  // Reset to "Generic" each time the create dialog (re)opens; clear any "saved"
  // feedback each time the dialog changes. Clear the just-placed marker whenever
  // we're not in an edit session — so a later "More" on the same piece is treated
  // as a normal edit, not a hand-off. (The effect skips edit mode, so it never
  // clears the marker `placeAndEdit` set for the session it just opened.)
  useEffect(() => {
    if (dialog?.mode === 'create') setSource('generic');
    if (dialog?.mode !== 'edit') setJustPlacedId(null);
    setSavedForId(null);
  }, [dialog]);

  const editId = dialog?.mode === 'edit' ? dialog.id : null;
  // The live piece being edited — the footer's "Save to library" reads from it.
  const editItem = useDesignStore((s) =>
    editId ? s.design.furniture.find((f) => f.id === editId) : undefined,
  );

  // Set by a pick handler right before it places a piece, so the batch it opens
  // covers the placement itself; the effect below then knows not to open a
  // second, later-starting batch for the same session.
  const batchAlreadyOpenRef = useRef(false);

  // Edits in edit mode go straight to the store (live 3D preview). Wrap the whole
  // open dialog in one history batch: OK commits it as a single undo step,
  // Cancel/✕/Esc rolls it back — including the placement itself, when this
  // session started from the type picker. This replaces the old hand-maintained
  // snapshot (which had to list every editable field by hand to restore it).
  useEffect(() => {
    if (!editId) return;
    if (!batchAlreadyOpenRef.current) useHistoryStore.getState().beginBatch();
    batchAlreadyOpenRef.current = false;
    return () => useHistoryStore.getState().endBatch();
  }, [editId]);

  const commitEdit = useCallback(() => {
    useHistoryStore.getState().endBatch();
    close();
  }, [close]);

  // Dismissing an edit session (backdrop / ✕ / Esc) branches on how it started:
  //  - A piece just placed from the type picker was never committed, so an
  //    incidental dismiss discards it — the batch rolls back and the new piece
  //    (plus any tweaks) disappears. This is the correct place-mode behaviour.
  //  - Editing an EXISTING piece via "More" applies its size/colour/material live
  //    to the store, so those are real, visible changes. Treat dismiss as
  //    close-and-keep: commit the batch (exactly what OK does) so the changes you
  //    see are the changes that stick. It stays risk-free because a committed edit
  //    is a single global-undo step (PRINCIPLES.md #7).
  const dismiss = useCallback(() => {
    if (dialog?.mode === 'edit') {
      const history = useHistoryStore.getState();
      if (dialog.id === justPlacedId) history.cancelBatch();
      else history.endBatch();
    }
    close();
  }, [dialog, justPlacedId, close]);

  // Esc dismisses the dialog. App's global handler bails out while a dialog is
  // open, so closing here doesn't also clear the selection.
  useEscape(dismiss, !!dialog);

  // Place a piece and hand off straight to the live-editing surface, batched as
  // one undo step with any tweaks made there before OK/Cancel.
  const placeAndEdit = useCallback(
    (place: () => string) => {
      useHistoryStore.getState().beginBatch();
      batchAlreadyOpenRef.current = true;
      const id = place();
      setJustPlacedId(id);
      openEditFurniture(id);
    },
    [openEditFurniture],
  );

  const pickKind = useCallback(
    (kind: FurnitureKind) => placeAndEdit(() => addFurniture(kind)),
    [addFurniture, placeAndEdit],
  );

  const pickLibraryEntry = useCallback(
    (entry: FurnitureLibraryEntry) => placeAndEdit(() => addFurnitureFromLibrary(entry)),
    [addFurnitureFromLibrary, placeAndEdit],
  );

  if (!dialog) return null;

  const title = dialog.mode === 'edit' ? 'Selected furniture' : 'Add furniture';

  // The just-placed hand-off: this edit session is for the piece we placed from
  // the picker (not an existing piece opened via "More"). It gets the shorter
  // mobile sheet so the room and the new piece stay visible above it.
  const isJustPlaced = dialog.mode === 'edit' && dialog.id === justPlacedId;

  return (
    <div className="modal-backdrop" role="presentation" onClick={dismiss}>
      <div
        className={isJustPlaced ? 'modal modal-just-placed' : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-label={dialog.mode === 'edit' ? 'Furniture settings' : 'Add furniture'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button type="button" className="btn-icon" aria-label="Close" onClick={dismiss}>
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body">
          {dialog.mode === 'edit' ? (
            <div className="stack">
              <FurnitureFindings furnitureId={dialog.id} />
              <PropertiesPanel />
            </div>
          ) : (
            <FurniturePicker
              source={source}
              onSourceChange={setSource}
              onPickKind={pickKind}
              onPickLibraryEntry={pickLibraryEntry}
              libraryEntries={libraryEntries}
              onRenameLibraryEntry={renameLibraryEntry}
              onRemoveFromLibrary={removeFromLibrary}
            />
          )}
        </div>

        {dialog.mode === 'edit' && (
          <div className="modal-foot">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {editItem?.product && isValidProductUrl(editItem.product.url) && (
                <a
                  className="btn"
                  href={editItem.product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={buyButtonTitle(editItem.product)}
                  aria-label={buyButtonTitle(editItem.product)}
                >
                  <Icon name="shopping-bag" /> {buyButtonLabel(editItem.product)}
                </a>
              )}
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
                    colors: editItem.colors ? { ...editItem.colors } : undefined,
                    material: editItem.material,
                    materials: editItem.materials ? { ...editItem.materials } : undefined,
                    options: editItem.options ? { ...editItem.options } : undefined,
                    product: editItem.product ? { ...editItem.product } : undefined,
                  });
                  setSavedForId(editItem.id);
                }}
              >
                {savedForId && savedForId === editItem?.id ? (
                  <>
                    <Icon name="check" /> Saved to library
                  </>
                ) : (
                  <>
                    <Icon name="star" /> Save to library
                  </>
                )}
              </button>
            </div>
            <button type="button" className="btn btn-accent" onClick={commitEdit}>
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
