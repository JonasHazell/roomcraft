import type { FurnitureKind, FurnitureSize } from '../../types';
import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';
import { ColorField, NumberField } from './fields';

/** The editable shape shared by a new-piece draft and an existing furniture item. */
export interface FurnitureDraft {
  kind: FurnitureKind;
  name: string;
  size: FurnitureSize;
  elevation: number;
  color: string;
}

export type FurnitureFieldPatch = {
  name?: string;
  size?: Partial<FurnitureSize>;
  elevation?: number;
  color?: string;
};

/**
 * Name / dimensions / colour controls for a furniture piece. Rendered identically
 * in the "Add furniture" dialog (bound to a local draft) and in the "More" editor
 * (bound to the store), so both surfaces look and behave the same. Rotation is not
 * edited here — it's done with the Left/Right buttons in the selection bar.
 */
export function FurnitureFields({
  value,
  onChange,
}: {
  value: FurnitureDraft;
  onChange: (patch: FurnitureFieldPatch) => void;
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
      <ColorField
        label="Color"
        value={value.color}
        onChange={(color) => onChange({ color })}
      />
    </>
  );
}
