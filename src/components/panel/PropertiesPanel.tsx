import { useDesignStore } from '../../store/useDesignStore';
import { useSelectedFurniture } from '../../store/selectors';
import { COARSE_POINTER, useMediaQuery } from '../../lib/useMediaQuery';
import { FurnitureFields } from './FurnitureFields';
import { NumberField } from './fields';

// Wrap a rotation to (-180, 180] degrees so the field always shows the short
// way round, however many quarter-turns the R shortcut or the drag handle
// have accumulated in the underlying radians.
function normalizedDegrees(rotationY: number): number {
  const deg = (rotationY * 180) / Math.PI;
  return Math.round((((deg % 360) + 540) % 360) - 180);
}

/**
 * The edit form shown in the furniture dialog's body: name, size, colour, etc.
 * "Save to library" lives in the dialog footer (see FurnitureDialog) so it stays
 * visible even when this form scrolls on short screens.
 */
export function PropertiesPanel() {
  const selected = useSelectedFurniture();
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const moveFurniture = useDesignStore((s) => s.moveFurniture);
  const coarse = useMediaQuery(COARSE_POINTER);

  if (!selected) {
    return <p className="hint">Click a piece of furniture in the 3D view to edit it.</p>;
  }

  return (
    <div className="stack">
      <FurnitureFields
        value={selected}
        onChange={(patch) => updateFurniture(selected.id, patch)}
      />
      <div className="field-grid">
        {/* Numeric fallback for drag: moveFurniture re-clamps to the room and
            slides clear of walls/other pieces exactly as a drag would, so a
            typed value can't place a piece through a wall. */}
        <NumberField
          label="X position"
          value={Math.round(selected.position.x * 100)}
          min={-2000}
          max={2000}
          step={1}
          onChange={(v) => moveFurniture(selected.id, v / 100, selected.position.z)}
        />
        <NumberField
          label="Z position"
          value={Math.round(selected.position.z * 100)}
          min={-2000}
          max={2000}
          step={1}
          onChange={(v) => moveFurniture(selected.id, selected.position.x, v / 100)}
        />
        <NumberField
          label="Rotation"
          value={normalizedDegrees(selected.rotationY)}
          min={-180}
          max={180}
          step={1}
          suffix="°"
          onChange={(v) => updateFurniture(selected.id, { rotationY: (v * Math.PI) / 180 })}
        />
      </div>
      <p className="hint">
        {coarse
          ? 'Tip: drag a piece in the 3D view to move it, or set exact numbers above.'
          : 'Shortcuts: R rotates right · Shift+R left · Ctrl+D duplicates · Delete removes · Esc deselects'}
      </p>
    </div>
  );
}
