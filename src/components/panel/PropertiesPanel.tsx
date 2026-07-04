import { useState } from 'react';
import * as THREE from 'three';
import { useDesignStore } from '../../store/useDesignStore';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useUiStore } from '../../store/useUiStore';
import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';
import { ColorField, NumberField } from './fields';

export function PropertiesPanel() {
  const selection = useUiStore((s) => s.selection);
  const select = useUiStore((s) => s.select);
  const selected = useDesignStore((s) =>
    selection?.kind === 'furniture'
      ? s.design.furniture.find((f) => f.id === selection.id)
      : undefined,
  );
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const duplicateFurniture = useDesignStore((s) => s.duplicateFurniture);
  const removeFurniture = useDesignStore((s) => s.removeFurniture);
  const saveToLibrary = useLibraryStore((s) => s.save);
  const [savedForId, setSavedForId] = useState<string | null>(null);

  if (!selected) {
    return <p className="hint">Click a piece of furniture in the 3D view to edit it.</p>;
  }

  const degrees = Math.round(THREE.MathUtils.radToDeg(selected.rotationY)) % 360;

  return (
    <div className="stack">
      <label className="field">
        <span className="field-label">Name</span>
        <span className="field-input">
          <input
            type="text"
            value={selected.name}
            onChange={(e) => updateFurniture(selected.id, { name: e.target.value })}
          />
        </span>
      </label>
      <p className="hint">Type: {FURNITURE_CATALOG[selected.kind].label}</p>
      <div className="field-grid">
        <NumberField
          label="Width"
          value={Math.round(selected.size.width * 100)}
          min={5}
          max={2000}
          step={1}
          onChange={(v) => updateFurniture(selected.id, { size: { width: v / 100 } })}
        />
        <NumberField
          label="Depth"
          value={Math.round(selected.size.depth * 100)}
          min={5}
          max={2000}
          step={1}
          onChange={(v) => updateFurniture(selected.id, { size: { depth: v / 100 } })}
        />
        <NumberField
          label="Height"
          value={Math.round(selected.size.height * 100)}
          min={2}
          max={600}
          step={1}
          onChange={(v) => updateFurniture(selected.id, { size: { height: v / 100 } })}
        />
        <NumberField
          label="Rotation"
          value={degrees}
          min={-360}
          max={360}
          step={5}
          suffix="°"
          onChange={(deg) =>
            updateFurniture(selected.id, { rotationY: THREE.MathUtils.degToRad(deg) })
          }
        />
        <NumberField
          label="Height above floor"
          value={Math.round(selected.elevation * 100)}
          min={0}
          max={600}
          step={1}
          onChange={(v) => updateFurniture(selected.id, { elevation: v / 100 })}
        />
      </div>
      <ColorField
        label="Color"
        value={selected.color}
        onChange={(color) => updateFurniture(selected.id, { color })}
      />
      <div className="button-row">
        <button
          type="button"
          className="btn"
          title="Rotate 90° left"
          onClick={() =>
            updateFurniture(selected.id, { rotationY: selected.rotationY + Math.PI / 2 })
          }
        >
          ⟲ Left
        </button>
        <button
          type="button"
          className="btn"
          title="Rotate 90° right"
          onClick={() =>
            updateFurniture(selected.id, { rotationY: selected.rotationY - Math.PI / 2 })
          }
        >
          ⟳ Right
        </button>
        <button
          type="button"
          className="btn"
          title="Create an identical piece with the same dimensions"
          onClick={() => {
            const newId = duplicateFurniture(selected.id);
            if (newId) select({ kind: 'furniture', id: newId });
          }}
        >
          ⧉ Duplicate
        </button>
        <button
          type="button"
          className="btn"
          title="Save this piece with its dimensions and color so you can add it again"
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
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            removeFurniture(selected.id);
            select(null);
          }}
        >
          Delete
        </button>
      </div>
      {savedForId === selected.id && (
        <p className="hint">Saved to the library — you'll find it under “My library”.</p>
      )}
      <p className="hint">
        Shortcuts: R rotates right · Shift+R left · Ctrl+D duplicates · Delete removes · Esc
        deselects
      </p>
    </div>
  );
}
