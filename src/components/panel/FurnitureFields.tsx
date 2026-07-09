import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';
import { ColorField, NumberField } from './fields';
import type { FurnitureDraft, FurnitureFieldPatch } from './furnitureDraft';

export type { FurnitureDraft, FurnitureFieldPatch };

/**
 * Name / dimensions / colour controls for a furniture piece. Rendered in the
 * "Add furniture" dialog (bound to a local draft) and in the "More" editor (bound
 * to the store). Rotation is not edited here — it's done with the Left/Right
 * buttons in the selection bar. Colour is likewise handled by the inline swatch in
 * the selection bar, so `showColor` is false in the "More" editor to avoid a
 * duplicate control; the add dialog keeps it, as there's no bar yet.
 */
export function FurnitureFields({
  value,
  onChange,
  showColor = true,
}: {
  value: FurnitureDraft;
  onChange: (patch: FurnitureFieldPatch) => void;
  showColor?: boolean;
}) {
  return (
    <>
      <label className="field">
        <span className="field-label">Name</span>
        <span className="field-input">
          <input
            type="text"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </span>
      </label>
      <p className="hint">Type: {FURNITURE_CATALOG[value.kind].label}</p>
      <div className="field-grid">
        <NumberField
          label="Width"
          value={Math.round(value.size.width * 100)}
          min={5}
          max={2000}
          step={1}
          onChange={(v) => onChange({ size: { width: v / 100 } })}
        />
        <NumberField
          label="Depth"
          value={Math.round(value.size.depth * 100)}
          min={5}
          max={2000}
          step={1}
          onChange={(v) => onChange({ size: { depth: v / 100 } })}
        />
        <NumberField
          label="Height"
          value={Math.round(value.size.height * 100)}
          min={2}
          max={600}
          step={1}
          onChange={(v) => onChange({ size: { height: v / 100 } })}
        />
        <NumberField
          label="Height above floor"
          value={Math.round(value.elevation * 100)}
          min={0}
          max={600}
          step={1}
          onChange={(v) => onChange({ elevation: v / 100 })}
        />
      </div>
      {showColor && (
        <ColorField
          label="Color"
          value={value.color}
          onChange={(color) => onChange({ color })}
        />
      )}
    </>
  );
}
