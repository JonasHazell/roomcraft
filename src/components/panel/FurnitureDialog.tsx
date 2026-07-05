import { useEffect, useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useUiStore } from '../../store/useUiStore';
import { FURNITURE_CATALOG, FURNITURE_KINDS } from '../../lib/furnitureCatalog';
import type { FurnitureKind, FurnitureLibraryEntry } from '../../types';
import { FurnitureFields, type FurnitureDraft, type FurnitureFieldPatch } from './FurnitureFields';
import { PropertiesPanel } from './PropertiesPanel';

/** Which source the "Add furniture" picker is showing. */
type Source = 'generic' | 'library';

const cm = (m: number) => Math.round(m * 100);

function draftFor(kind: FurnitureKind): FurnitureDraft {
  const entry = FURNITURE_CATALOG[kind];
  return {
    kind,
    name: entry.label,
    size: { ...entry.defaultSize },
    elevation: 0,
    color: entry.defaultColor,
  };
}

function draftFromLibrary(entry: FurnitureLibraryEntry): FurnitureDraft {
  return {
    kind: entry.kind,
    name: entry.name,
    size: { ...entry.size },
    elevation: entry.elevation,
    color: entry.color,
  };
}

function applyPatch(draft: FurnitureDraft, patch: FurnitureFieldPatch): FurnitureDraft {
  return {
    ...draft,
    name: patch.name ?? draft.name,
    color: patch.color ?? draft.color,
    elevation: patch.elevation != null ? Math.max(0, patch.elevation) : draft.elevation,
    size: patch.size ? { ...draft.size, ...patch.size } : draft.size,
  };
}

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

  // In create mode we hold a local draft; `null` means the type picker is showing.
  const [draft, setDraft] = useState<FurnitureDraft | null>(null);
  // While picking, toggle between a fresh generic piece and one from the library.
  const [source, setSource] = useState<Source>('generic');

  // Reset to the type picker each time the create dialog (re)opens.
  useEffect(() => {
    if (dialog?.mode === 'create') {
      setDraft(null);
      setSource('generic');
    }
  }, [dialog]);

  // Esc closes the dialog. App's global handler bails out while a dialog is open,
  // so closing here doesn't also clear the selection.
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  if (!dialog) return null;

  const picking = dialog.mode === 'create' && draft === null;
  const title =
    dialog.mode === 'edit'
      ? 'Selected furniture'
      : draft
        ? `New ${FURNITURE_CATALOG[draft.kind].label.toLowerCase()}`
        : 'Add furniture';

  return (
    <div className="furniture-dialog-backdrop" role="presentation" onClick={close}>
      <div
        className="furniture-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={dialog.mode === 'edit' ? 'Furniture settings' : 'Add furniture'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="furniture-dialog-head">
          <span className="furniture-dialog-title">{title}</span>
          <button type="button" className="btn-icon" aria-label="Close" onClick={close}>
            ✕
          </button>
        </div>

        <div className="furniture-dialog-body">
          {dialog.mode === 'edit' ? (
            <PropertiesPanel />
          ) : picking ? (
            <div className="stack">
              <div className="source-toggle" role="tablist" aria-label="Furniture source">
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === 'generic'}
                  className={source === 'generic' ? 'active' : ''}
                  onClick={() => setSource('generic')}
                >
                  Generic
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === 'library'}
                  className={source === 'library' ? 'active' : ''}
                  onClick={() => setSource('library')}
                >
                  From library
                </button>
              </div>

              {source === 'generic' ? (
                <div className="palette">
                  {FURNITURE_KINDS.map((kind) => (
                    <button
                      type="button"
                      key={kind}
                      className="palette-btn"
                      onClick={() => setDraft(draftFor(kind))}
                    >
                      <span
                        className="swatch"
                        style={{ background: FURNITURE_CATALOG[kind].defaultColor }}
                      />
                      {FURNITURE_CATALOG[kind].label}
                    </button>
                  ))}
                </div>
              ) : libraryEntries.length === 0 ? (
                <p className="hint">
                  No saved furniture yet. Select a piece in the room and choose “Save to
                  library” to reuse it here.
                </p>
              ) : (
                <ul className="save-list">
                  {libraryEntries.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="save-name"
                        title={`Use “${entry.name}”`}
                        onClick={() => setDraft(draftFromLibrary(entry))}
                      >
                        <span className="lib-name">
                          <span className="swatch" style={{ background: entry.color }} />
                          {entry.name}
                        </span>
                        <span className="save-date">
                          {cm(entry.size.width)}×{cm(entry.size.depth)}×{cm(entry.size.height)} cm
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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

        {dialog.mode === 'create' && draft !== null && (
          <div className="furniture-dialog-foot">
            <button type="button" className="btn" onClick={() => setDraft(null)}>
              ← Back
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
