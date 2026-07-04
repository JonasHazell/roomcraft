import { useDesignStore } from '../../store/useDesignStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useUiStore } from '../../store/useUiStore';

const cm = (m: number) => Math.round(m * 100);

export function FurnitureLibrary() {
  const entries = useLibraryStore((s) => s.entries);
  const remove = useLibraryStore((s) => s.remove);
  const addFurnitureFromLibrary = useDesignStore((s) => s.addFurnitureFromLibrary);
  const select = useUiStore((s) => s.select);

  if (entries.length === 0) {
    return (
      <p className="hint">
        No saved furniture yet. Select a piece and choose “Save to library” to add
        it here.
      </p>
    );
  }

  return (
    <ul className="save-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            className="save-name"
            title={`Add “${entry.name}” to the room`}
            onClick={() => select({ kind: 'furniture', id: addFurnitureFromLibrary(entry) })}
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
            onClick={() => remove(entry.id)}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
