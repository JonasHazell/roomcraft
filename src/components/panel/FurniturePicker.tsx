import { FURNITURE_CATALOG, FURNITURE_KINDS } from '../../lib/furnitureCatalog';
import type { FurnitureLibraryEntry } from '../../types';
import { beginFurnitureDrag, endFurnitureDrag } from '../../lib/furnitureDnd';
import { Icon } from '../ui/Icon';
import { draftFor, draftFromLibrary, type FurnitureDraft } from './furnitureDraft';

/** Which source the "Add furniture" picker is showing. */
export type Source = 'generic' | 'library';

const cm = (m: number) => Math.round(m * 100);

interface Props {
  source: Source;
  onSourceChange: (source: Source) => void;
  onPick: (draft: FurnitureDraft) => void;
  libraryEntries: FurnitureLibraryEntry[];
  onRemoveFromLibrary: (id: string) => void;
}

/** The "Add furniture" type picker: a generic catalog palette or the saved library. */
export function FurniturePicker({
  source,
  onSourceChange,
  onPick,
  libraryEntries,
  onRemoveFromLibrary,
}: Props) {
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

      {source === 'generic' ? (
        <>
          <p className="hint">Drag a piece into the room to place it, or click to set it up first.</p>
          <div className="palette">
            {FURNITURE_KINDS.map((kind) => (
              <button
                type="button"
                key={kind}
                className="palette-btn"
                draggable
                onDragStart={(e) => beginFurnitureDrag(e, draftFor(kind))}
                onDragEnd={endFurnitureDrag}
                onClick={() => onPick(draftFor(kind))}
              >
                <span
                  className="swatch"
                  style={{ background: FURNITURE_CATALOG[kind].defaultColor }}
                />
                {FURNITURE_CATALOG[kind].label}
              </button>
            ))}
          </div>
        </>
      ) : libraryEntries.length === 0 ? (
        <p className="hint">
          No saved furniture yet. Select a piece in the room and choose “Save to library” to reuse
          it here.
        </p>
      ) : (
        <ul className="save-list">
          {libraryEntries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="save-name"
                title={`Use “${entry.name}” — drag into the room or click to set it up`}
                draggable
                onDragStart={(e) => beginFurnitureDrag(e, draftFromLibrary(entry))}
                onDragEnd={endFurnitureDrag}
                onClick={() => onPick(draftFromLibrary(entry))}
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
                title="Remove from library"
                aria-label={`Remove ${entry.name} from library`}
                onClick={() => onRemoveFromLibrary(entry.id)}
              >
                <Icon name="x" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
