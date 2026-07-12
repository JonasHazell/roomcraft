import { useRef, useState, type ChangeEvent } from 'react';
import { FURNITURE_CATALOG, FURNITURE_KINDS } from '../../lib/furnitureCatalog';
import { importFurnitureModel } from '../../lib/importModel';
import type { FurnitureLibraryEntry } from '../../types';
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
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const onModelFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const model = await importFurnitureModel(file);
      // Land on the box form pre-filled with the model, its bounding-box size and
      // file name, so the piece can be renamed/resized before it's added.
      onPick({ ...draftFor('box'), name: model.name, size: model.size, model: { src: model.src, name: model.name } });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'The model could not be imported.');
    } finally {
      setImporting(false);
    }
  };

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
          <div className="palette">
            {FURNITURE_KINDS.map((kind) => (
              <button
                type="button"
                key={kind}
                className="palette-btn"
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
          <div className="import-model">
            <input
              ref={fileInput}
              type="file"
              accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
              hidden
              onChange={onModelFile}
            />
            <button
              type="button"
              className="btn"
              disabled={importing}
              onClick={() => fileInput.current?.click()}
            >
              <Icon name="plus" /> {importing ? 'Importing…' : 'Import 3D model…'}
            </button>
            <p className="hint">
              Use your own GLTF/GLB model for a piece that isn’t in the list (max 2 MB).
            </p>
            {importError && <p className="error">{importError}</p>}
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
                title={`Use “${entry.name}”`}
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
