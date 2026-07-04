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
    return <p className="hint">Klicka på en möbel i 3D-vyn för att redigera den.</p>;
  }

  const degrees = Math.round(THREE.MathUtils.radToDeg(selected.rotationY)) % 360;

  return (
    <div className="stack">
      <label className="field">
        <span className="field-label">Namn</span>
        <span className="field-input">
          <input
            type="text"
            value={selected.name}
            onChange={(e) => updateFurniture(selected.id, { name: e.target.value })}
          />
        </span>
      </label>
      <p className="hint">Typ: {FURNITURE_CATALOG[selected.kind].label}</p>
      <div className="field-grid">
        <NumberField
          label="Bredd"
          value={Math.round(selected.size.width * 100)}
          min={5}
          max={2000}
          step={1}
          onChange={(v) => updateFurniture(selected.id, { size: { width: v / 100 } })}
        />
        <NumberField
          label="Djup"
          value={Math.round(selected.size.depth * 100)}
          min={5}
          max={2000}
          step={1}
          onChange={(v) => updateFurniture(selected.id, { size: { depth: v / 100 } })}
        />
        <NumberField
          label="Höjd"
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
          label="Höjd över golv"
          value={Math.round(selected.elevation * 100)}
          min={0}
          max={600}
          step={1}
          onChange={(v) => updateFurniture(selected.id, { elevation: v / 100 })}
        />
      </div>
      <ColorField
        label="Färg"
        value={selected.color}
        onChange={(color) => updateFurniture(selected.id, { color })}
      />
      <div className="button-row">
        <button
          type="button"
          className="btn"
          title="Rotera 90° åt vänster"
          onClick={() =>
            updateFurniture(selected.id, { rotationY: selected.rotationY + Math.PI / 2 })
          }
        >
          ⟲ Vänster
        </button>
        <button
          type="button"
          className="btn"
          title="Rotera 90° åt höger"
          onClick={() =>
            updateFurniture(selected.id, { rotationY: selected.rotationY - Math.PI / 2 })
          }
        >
          ⟳ Höger
        </button>
        <button
          type="button"
          className="btn"
          title="Skapa en likadan möbel med samma mått"
          onClick={() => {
            const newId = duplicateFurniture(selected.id);
            if (newId) select({ kind: 'furniture', id: newId });
          }}
        >
          ⧉ Kopiera
        </button>
        <button
          type="button"
          className="btn"
          title="Spara den här möbeln med mått och färg för att kunna lägga till den igen"
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
          ☆ Spara i bibliotek
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            removeFurniture(selected.id);
            select(null);
          }}
        >
          Ta bort
        </button>
      </div>
      {savedForId === selected.id && (
        <p className="hint">Sparad i biblioteket — du hittar den under ”Mitt bibliotek”.</p>
      )}
      <p className="hint">
        Kortkommandon: R roterar höger · Shift+R vänster · Ctrl+D kopierar · Delete tar bort · Esc
        avmarkerar
      </p>
    </div>
  );
}
