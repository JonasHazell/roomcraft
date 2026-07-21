import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';
import { FURNITURE_OPTIONS, hasOptions, normalizeOptions } from '../../lib/furnitureOptions';
import {
  FURNITURE_PARTS,
  hasParts,
  normalizeMaterials,
  partColorOverride,
  primaryPart,
} from '../../lib/furnitureParts';
import { MATERIAL_CHOICES } from '../../lib/materials';
import type { FurnitureKind } from '../../types';
import { ColorField, CountField, NumberField, SelectField, ToggleField } from './fields';
import type { FurnitureDraft, FurnitureFieldPatch } from './furnitureDraft';

/**
 * A configurable part whose 3D mesh only renders while a companion toggle
 * option is on (see the kind's `scene/furniture/*.tsx` and `furnitureOptions`)
 * — recolouring it while the option is off would visibly do nothing, so its
 * colour/material row is hidden until the option is switched on.
 */
const GATED_PARTS: Partial<Record<FurnitureKind, Record<string, string>>> = {
  tv: { bench: 'bench' },
  bookshelf: { doors: 'doors' },
  sink: { pedestal: 'pedestal' },
};

export type { FurnitureDraft, FurnitureFieldPatch };

/**
 * Per-type customization controls (shelves, doors, pillows, monitor …) driven by
 * the kind's option specs. Renders nothing for kinds without options.
 */
function FurnitureOptionFields({
  value,
  onChange,
}: {
  value: FurnitureDraft;
  onChange: (patch: FurnitureFieldPatch) => void;
}) {
  if (!hasOptions(value.kind)) return null;
  const specs = FURNITURE_OPTIONS[value.kind];
  const options = normalizeOptions(value.kind, value.options);

  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="field-label">{FURNITURE_CATALOG[value.kind].label} details</p>
      {specs.map((spec) => {
        if (spec.type === 'count') {
          return (
            <CountField
              key={spec.key}
              label={spec.label}
              title={spec.hint}
              value={options[spec.key] as number}
              min={spec.min}
              max={spec.max}
              onChange={(v) => onChange({ options: { [spec.key]: v } })}
            />
          );
        }
        if (spec.type === 'toggle') {
          return (
            <ToggleField
              key={spec.key}
              label={spec.label}
              title={spec.hint}
              value={options[spec.key] as boolean}
              onChange={(v) => onChange({ options: { [spec.key]: v } })}
            />
          );
        }
        return (
          <SelectField
            key={spec.key}
            label={spec.label}
            title={spec.hint}
            value={options[spec.key] as string}
            choices={spec.choices}
            onChange={(v) => onChange({ options: { [spec.key]: v } })}
          />
        );
      })}
    </div>
  );
}

/**
 * Name / dimensions / colour controls for a furniture piece, bound live to the
 * store. Rendered in the "More" editor for a selected piece — including a piece
 * just placed from the "Add furniture" picker, which lands here immediately
 * instead of behind a separate creation form. Rotation is not edited here — it's
 * done with the in-scene ring handle or the R / Shift+R shortcuts. Colour lives
 * here rather than inline in the selection bar, so the bar stays focused on quick
 * actions.
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
          commitOnBlur
          onChange={(v) => onChange({ size: { width: v / 100 } })}
        />
        <NumberField
          label="Depth"
          value={Math.round(value.size.depth * 100)}
          min={5}
          max={2000}
          step={1}
          commitOnBlur
          onChange={(v) => onChange({ size: { depth: v / 100 } })}
        />
        <NumberField
          label="Height"
          value={Math.round(value.size.height * 100)}
          min={2}
          max={600}
          step={1}
          commitOnBlur
          onChange={(v) => onChange({ size: { height: v / 100 } })}
        />
        <NumberField
          label="Height above floor"
          value={Math.round(value.elevation * 100)}
          min={0}
          max={600}
          step={1}
          commitOnBlur
          onChange={(v) => onChange({ elevation: v / 100 })}
        />
      </div>
      <FurnitureOptionFields value={value} onChange={onChange} />
      <FurnitureAppearanceFields value={value} onChange={onChange} />
      <ProductLinkFields value={value} onChange={onChange} />
    </>
  );
}

/**
 * Optional link to a real, purchasable product for this piece — the first
 * step toward the furniture-catalogue revenue model
 * (docs/VISION.md#how-it-makes-money). Leaving it blank keeps the piece
 * purely abstract, exactly as before; once a link is set, the dialog
 * footer's "Buy" button (see `FurnitureDialog.tsx`) opens it in a new tab.
 * Price/retailer only appear once a link is entered — they describe the
 * link, so they'd have nothing to attach to before then.
 */
function ProductLinkFields({
  value,
  onChange,
}: {
  value: FurnitureDraft;
  onChange: (patch: FurnitureFieldPatch) => void;
}) {
  const product = value.product;
  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="field-label">Product link</p>
      <label className="field">
        <span className="field-label">Link</span>
        <span className="field-input">
          <input
            type="url"
            placeholder="https://…"
            value={product?.url ?? ''}
            onChange={(e) => {
              const url = e.target.value;
              onChange({ product: url ? { ...product, url } : undefined });
            }}
          />
        </span>
      </label>
      {product?.url && (
        <div className="field-grid">
          <NumberField
            label="Price"
            value={product.priceCents != null ? product.priceCents / 100 : 0}
            min={0}
            max={1_000_000}
            step={0.01}
            suffix=""
            commitOnBlur
            onChange={(v) =>
              onChange({
                product: { ...product, priceCents: v > 0 ? Math.round(v * 100) : undefined },
              })
            }
          />
          <label className="field">
            <span className="field-label">Retailer</span>
            <span className="field-input">
              <input
                type="text"
                value={product.retailer ?? ''}
                onChange={(e) =>
                  onChange({ product: { ...product, retailer: e.target.value || undefined } })
                }
              />
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

/**
 * Appearance controls grouped *per part*: each configurable part (a bed's frame
 * vs its bedding) shows its colour and material together, instead of one block
 * listing every colour followed by a separate block listing every material — so
 * the two decisions you make about a part live side by side. Single-part kinds
 * show one colour + one material control under the same heading.
 *
 * Colour cascades from the primary part: the primary edits the base colour
 * (which flows to any un-overridden part); a secondary part sets a per-part
 * override that comes with its own reset control once set — so the detachment
 * isn't permanent — to clear it back to following the primary colour.
 */
function FurnitureAppearanceFields({
  value,
  onChange,
}: {
  value: FurnitureDraft;
  onChange: (patch: FurnitureFieldPatch) => void;
}) {
  const gating = GATED_PARTS[value.kind];
  const options = gating ? normalizeOptions(value.kind, value.options) : undefined;
  // Hide a part's row while the option that draws it is off — a picker with no
  // visible effect reads as broken (#356).
  const parts = FURNITURE_PARTS[value.kind].filter((p) => {
    const optionKey = gating?.[p.key];
    return !optionKey || options?.[optionKey] !== false;
  });
  const materials = normalizeMaterials(value.kind, value.materials, value.material);
  const multi = hasParts(value.kind);
  const primary = primaryPart(value.kind);
  const primaryLabel = parts.find((p) => p.key === primary)?.label ?? 'primary';

  return (
    <div className="stack" style={{ gap: 12 }}>
      <p className="field-label">{multi ? 'Colours & materials' : 'Colour & material'}</p>
      {parts.map((part) => {
        const isPrimary = part.key === primary;
        const override = isPrimary ? undefined : partColorOverride(value.colors, part.key);
        const current = isPrimary ? value.color : (override ?? value.color);
        return (
          // One tight group per part keeps its colour chip and material picker
          // read as a pair; the wider gap between groups (the parent stack)
          // separates one part from the next.
          <div key={part.key} className="stack" style={{ gap: 8 }}>
            <ColorField
              // Multi-part kinds name the colour chip after the part (Frame,
              // Cushions) — that's what pairs it with the material below it;
              // single-part kinds just say "Color".
              label={multi ? part.label : 'Color'}
              value={current}
              onChange={(c) =>
                onChange(isPrimary ? { color: c } : { colors: { [part.key]: c } })
              }
              // Only a secondary part with an active override gets a reset
              // control — the primary part sets the base colour directly, and an
              // un-overridden part is already following it.
              onReset={
                override !== undefined
                  ? () => onChange({ colors: { [part.key]: undefined } })
                  : undefined
              }
              resetLabel={`Match ${primaryLabel.toLowerCase()} colour`}
            />
            <SelectField
              label="Material"
              title={
                multi
                  ? `Surface finish for the ${part.label.toLowerCase()}`
                  : 'Surface finish — changes how light reflects off the piece'
              }
              value={materials[part.key]}
              choices={MATERIAL_CHOICES}
              onChange={(m) => onChange({ materials: { [part.key]: m } })}
            />
          </div>
        );
      })}
    </div>
  );
}
