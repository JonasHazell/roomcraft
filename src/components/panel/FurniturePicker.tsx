import { useState } from 'react';
import {
  FURNITURE_CATALOG,
  FURNITURE_CATEGORIES,
  kindsInCategory,
} from '../../lib/furnitureCatalog';
import { promptDialog } from '../../store/useDialogStore';
import type { FurnitureKind, FurnitureLibraryEntry } from '../../types';
import { Icon } from '../ui/Icon';

/** Which source the "Add furniture" picker is showing. */
export type Source = 'generic' | 'library';

const cm = (m: number) => Math.round(m * 100);

/** Case-insensitive substring match used by the name search field below. */
const matchesQuery = (name: string, query: string) =>
  name.toLowerCase().includes(query.trim().toLowerCase());

interface Props {
  source: Source;
  onSourceChange: (source: Source) => void;
  /** Place a fresh, default-configured piece of this catalog kind right away. */
  onPickKind: (kind: FurnitureKind) => void;
  /** Place a piece pre-filled from this saved library entry right away. */
  onPickLibraryEntry: (entry: FurnitureLibraryEntry) => void;
  libraryEntries: FurnitureLibraryEntry[];
  onRenameLibraryEntry: (id: string, name: string) => void;
  onRemoveFromLibrary: (id: string) => void;
}

/** The "Add furniture" type picker: a generic catalog palette or the saved library. */
export function FurniturePicker({
  source,
  onSourceChange,
  onPickKind,
  onPickLibraryEntry,
  libraryEntries,
  onRenameLibraryEntry,
  onRemoveFromLibrary,
}: Props) {
  // Same rename pattern as the lobby's room rename (Lobby.tsx): a styled prompt
  // seeded with the current name, then the store update.
  const rename = async (entry: FurnitureLibraryEntry) => {
    const next = await promptDialog({
      title: 'Rename saved piece',
      label: 'Name',
      initial: entry.name,
    });
    if (next !== null) onRenameLibraryEntry(entry.id, next);
  };

  // Filters whichever tab (catalog or library) is currently shown, by name —
  // live as the user types. Category grouping below still applies to the
  // filtered results.
  const [query, setQuery] = useState('');

  const filteredLibraryEntries = query
    ? libraryEntries.filter((e) => matchesQuery(e.name, query))
    : libraryEntries;
  const hasCatalogMatch = FURNITURE_CATEGORIES.some((group) =>
    kindsInCategory(group.id).some((kind) => matchesQuery(FURNITURE_CATALOG[kind].label, query)),
  );

  return (
    <div className="stack">
      <div className="source-toggle" role="tablist" aria-label="Furniture source">
        <button
          type="button"
          role="tab"
          aria-selected={source === 'generic'}
          className={source === 'generic' ? 'active' : ''}
          onClick={() => onSourceChange('generic')}
        >
          Generic
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={source === 'library'}
          className={source === 'library' ? 'active' : ''}
          onClick={() => onSourceChange('library')}
        >
          From library
        </button>
      </div>

      <label className="field">
        <span className="field-label">Search furniture</span>
        <span className="field-input">
          <input
            type="text"
            value={query}
            placeholder="Search by name…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </span>
      </label>

      {source === 'generic' ? (
        query && !hasCatalogMatch ? (
          <p className="hint">No matches for “{query}.”</p>
        ) : (
          // The catalog, grouped by room type so kitchen and bathroom pieces sit
          // together and each room's furniture is easy to find.
          <div className="palette-groups">
            {FURNITURE_CATEGORIES.map((group) => {
              const kinds = kindsInCategory(group.id).filter(
                (kind) => !query || matchesQuery(FURNITURE_CATALOG[kind].label, query),
              );
              if (kinds.length === 0) return null;
              return (
                <div key={group.id} className="palette-group">
                  <h3 className="palette-heading">{group.label}</h3>
                  <div className="palette">
                    {kinds.map((kind) => (
                      <button
                        type="button"
                        key={kind}
                        className="palette-btn"
                        onClick={() => onPickKind(kind)}
                      >
                        <span
                          className="swatch"
                          style={{ background: FURNITURE_CATALOG[kind].defaultColor }}
                        />
                        {FURNITURE_CATALOG[kind].label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : libraryEntries.length === 0 ? (
        <p className="hint">
          No saved furniture yet. Select a piece in the room and choose “Save to library” to reuse
          it here.
        </p>
      ) : query && filteredLibraryEntries.length === 0 ? (
        <p className="hint">No matches for “{query}.”</p>
      ) : (
        // Saved pieces, grouped by the room type of their furniture kind.
        <div className="palette-groups">
          {FURNITURE_CATEGORIES.map((group) => {
            const entries = filteredLibraryEntries.filter(
              (e) => FURNITURE_CATALOG[e.kind].category === group.id,
            );
            if (entries.length === 0) return null;
            return (
              <div key={group.id} className="palette-group">
                <h3 className="palette-heading">{group.label}</h3>
                <ul className="save-list">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="save-name"
                        title={`Use “${entry.name}”`}
                        onClick={() => onPickLibraryEntry(entry)}
                      >
                        <span className="lib-name">
                          <span className="swatch" style={{ background: entry.color }} />
                          {entry.name}
                        </span>
                        <span className="save-date">
                          {cm(entry.size.width)}×{cm(entry.size.depth)}×{cm(entry.size.height)} cm
                        </span>
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Rename"
                        aria-label={`Rename ${entry.name}`}
                        onClick={() => rename(entry)}
                      >
                        <Icon name="pencil" />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Remove from library"
                        aria-label={`Remove ${entry.name} from library`}
                        onClick={() => onRemoveFromLibrary(entry.id)}
                      >
                        <Icon name="x" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
