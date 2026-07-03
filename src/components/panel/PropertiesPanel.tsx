import * as THREE from 'three';
import { useDesignStore } from '../../store/useDesignStore';
import { useUiStore } from '../../store/useUiStore';
import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';
import { ColorField, NumberField } from './fields';

export function PropertiesPanel() {
  const selectedId = useUiStore((s) => s.selectedId);
  const select = useUiStore((s) => s.select);
  const selected = useDesignStore((s) => s.design.furniture.find((f) => f.id === selectedId));
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const removeFurniture = useDesignStore((s) => s.removeFurniture);

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
          value={selected.size.width}
          min={0.05}
          max={20}
          onChange={(width) => updateFurniture(selected.id, { size: { width } })}
        />
        <NumberField
          label="Djup"
          value={selected.size.depth}
          min={0.05}
          max={20}
          onChange={(depth) => updateFurniture(selected.id, { size: { depth } })}
        />
        <NumberField
          label="Höjd"
          value={selected.size.height}
          min={0.02}
          max={6}
          onChange={(height) => updateFurniture(selected.id, { size: { height } })}
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
          className="btn btn-danger"
          onClick={() => {
            removeFurniture(selected.id);
            select(null);
          }}
        >
          Ta bort
        </button>
      </div>
      <p className="hint">
        Kortkommandon: R roterar höger · Shift+R vänster · Delete tar bort · Esc avmarkerar
      </p>
    </div>
  );
}
