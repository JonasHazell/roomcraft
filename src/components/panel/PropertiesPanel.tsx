import { useState } from 'react';
import { useDesignStore } from '../../store/useDesignStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useUiStore } from '../../store/useUiStore';
import { COARSE_POINTER, useMediaQuery } from '../../lib/useMediaQuery';
import { FurnitureFields } from './FurnitureFields';

export function PropertiesPanel() {
  const selection = useUiStore((s) => s.selection);
  const selected = useDesignStore((s) =>
    selection?.kind === 'furniture'
      ? s.design.furniture.find((f) => f.id === selection.id)
      : undefined,
  );
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const saveToLibrary = useLibraryStore((s) => s.save);
  const coarse = useMediaQuery(COARSE_POINTER);
  const [savedForId, setSavedForId] = useState<string | null>(null);

  if (!selected) {
    return <p className="hint">Click a piece of furniture in the 3D view to edit it.</p>;
  }

  return (
    <div className="stack">
      <FurnitureFields
        value={selected}
        onChange={(patch) => updateFurniture(selected.id, patch)}
      />
      <div className="button-row">
        <button
          type="button"
          className="btn"
          title="Save this piece with its dimensions and color so you can add it again"
          aria-label="Save to library"
          onClick={() => {
            saveToLibrary({
              name: selected.name,
              kind: selected.kind,
              size: { ...selected.size },
              elevation: selected.elevation,
              color: selected.color,
            });
            setSavedForId(selected.id);
          }}
        >
          ☆ Save to library
        </button>
      </div>
      {savedForId === selected.id && (
        <p className="hint">Saved to the library — you'll find it under “My library”.</p>
      )}
      {!coarse && (
        <p className="hint">
          Shortcuts: R rotates right · Shift+R left · Ctrl+D duplicates · Delete removes · Esc
          deselects
        </p>
      )}
    </div>
  );
}
