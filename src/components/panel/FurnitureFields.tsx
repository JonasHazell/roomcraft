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
import { isValidProductUrl } from '../../lib/furnitureProduct';
import { ColorField, CountField, NumberField, SelectField, ToggleField } from './fields';
import type { FurnitureDraft, FurnitureFieldPatch } from './furnitureDraft';

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
      <FurnitureColorFields value={value} onChange={onChange} />
      <FurnitureMaterialFields value={value} onChange={onChange} />
      <FurnitureProductFields value={value} onChange={onChange} />
    </>
  );
}

/**
 * An optional link to the real product this piece stands for — the first step
 * toward the vision's "planning leads to purchase" catalogue model. A piece has no
 * product by default; once a link is entered, the price/retailer details appear and
 * a "Buy" affordance shows in the dialog footer (see FurnitureDialog). The whole
 * product is edited as a unit and cleared by emptying the link.
 */
function FurnitureProductFields({
  value,
  onChange,
}: {
  value: FurnitureDraft;
  onChange: (patch: FurnitureFieldPatch) => void;
}) {
  const product = value.product;
  const url = product?.url ?? '';

  const setUrl = (raw: string) => {
    // An empty link clears the whole product; otherwise merge onto what's there,
    // keeping any price/retailer already entered.
    if (!raw.trim()) onChange({ product: undefined });
    else onChange({ product: { ...product, url: raw } });
  };
  const setPrice = (raw: string) => {
    if (!product) return; // price only means something once there's a link
    const dollars = parseFloat(raw);
    const priceCents =
      Number.isFinite(dollars) && dollars >= 0 ? Math.round(dollars * 100) : undefined;
    onChange({ product: { ...product, priceCents } });
  };
  const setRetailer = (raw: string) => {
    if (!product) return;
    onChange({ product: { ...product, retailer: raw.trim() ? raw : undefined } });
  };

  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="field-label">Where to buy</p>
      <label className="field">
        <span className="field-label">Product link</span>
        <span className="field-input">
          <input
            type="url"
            inputMode="url"
            placeholder="https://…"
            aria-label="Product link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </span>
      </label>
      {url.trim() !== '' && !isValidProductUrl(url) && (
        <p className="hint">Enter a full link starting with http:// or https://</p>
      )}
      {product && (
        <div className="field-grid">
          <label className="field">
            <span className="field-label">Price</span>
            <span className="field-input">
              <input
                type="number"
                min={0}
                step={1}
                inputMode="decimal"
                placeholder="—"
                aria-label="Price"
                value={product.priceCents != null ? String(product.priceCents / 100) : ''}
                onChange={(e) => setPrice(e.target.value)}
              />
            </span>
          </label>
          <label className="field">
            <span className="field-label">Retailer</span>
            <span className="field-input">
              <input
                type="text"
                placeholder="e.g. IKEA"
                aria-label="Retailer"
                value={product.retailer ?? ''}
                onChange={(e) => setRetailer(e.target.value)}
              />
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

/**
 * A colour picker per configurable part (a bed's frame vs its bedding). The
 * primary part edits the base colour (which cascades to any un-overridden part);
 * the rest set a per-part override, which comes with its own reset control once
 * set — so the detachment isn't permanent — to clear it back to following the
 * primary colour. Single-part kinds show one "Color" control.
 */
function FurnitureColorFields({
  value,
  onChange,
}: {
  value: FurnitureDraft;
  onChange: (patch: FurnitureFieldPatch) => void;
}) {
  const parts = FURNITURE_PARTS[value.kind];

  if (!hasParts(value.kind)) {
    return (
      <ColorField label="Color" value={value.color} onChange={(color) => onChange({ color })} />
    );
  }

  const primary = primaryPart(value.kind);
  const primaryLabel = parts.find((p) => p.key === primary)?.label ?? 'primary';
  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="field-label">Colours</p>
      {parts.map((part) => {
        const isPrimary = part.key === primary;
        const override = isPrimary ? undefined : partColorOverride(value.colors, part.key);
        const current = isPrimary ? value.color : (override ?? value.color);
        return (
          <ColorField
            key={part.key}
            label={part.label}
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
        );
      })}
    </div>
  );
}

/**
 * A material picker per configurable part (a bed's frame vs its bedding), driven
 * by the kind's part specs. Kinds with a single part show one "Material" control.
 */
function FurnitureMaterialFields({
  value,
  onChange,
}: {
  value: FurnitureDraft;
  onChange: (patch: FurnitureFieldPatch) => void;
}) {
  const parts = FURNITURE_PARTS[value.kind];
  const materials = normalizeMaterials(value.kind, value.materials, value.material);

  if (!hasParts(value.kind)) {
    const part = parts[0];
    return (
      <SelectField
        label={part.label}
        title="Surface finish — changes how light reflects off the piece"
        value={materials[part.key]}
        choices={MATERIAL_CHOICES}
        onChange={(m) => onChange({ materials: { [part.key]: m } })}
      />
    );
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="field-label">Materials</p>
      {parts.map((part) => (
        <SelectField
          key={part.key}
          label={part.label}
          title={`Surface finish for the ${part.label.toLowerCase()}`}
          value={materials[part.key]}
          choices={MATERIAL_CHOICES}
          onChange={(m) => onChange({ materials: { [part.key]: m } })}
        />
      ))}
    </div>
  );
}
