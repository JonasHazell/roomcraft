import type { FurnitureKind, FurnitureOptions, FurnitureOptionValue } from '../types.ts';

/**
 * Per-type furniture customization. Each {@link FurnitureKind} declares a list of
 * options — a count (number of shelves, pillows …), a toggle (has doors, has a
 * monitor …) or a named choice (rug pattern …). The specs here are the single
 * source of truth: the editor renders a control per spec, the 3D pieces read the
 * values to shape their geometry, and persistence normalizes stored values
 * against them.
 */

interface OptionBase {
  key: string;
  label: string;
  /** One-line explanation shown as a tooltip on the control. */
  hint?: string;
}

export interface ToggleOptionSpec extends OptionBase {
  type: 'toggle';
  default: boolean;
}

export interface CountOptionSpec extends OptionBase {
  type: 'count';
  min: number;
  max: number;
  default: number;
}

export interface SelectOptionSpec extends OptionBase {
  type: 'select';
  choices: { value: string; label: string }[];
  default: string;
}

export type FurnitureOptionSpec = ToggleOptionSpec | CountOptionSpec | SelectOptionSpec;

/**
 * The options each furniture type exposes. Keep the defaults matching the piece's
 * plain appearance so existing designs look unchanged until a value is edited.
 */
export const FURNITURE_OPTIONS: Record<FurnitureKind, FurnitureOptionSpec[]> = {
  bed: [
    { key: 'mattresses', label: 'Mattresses', type: 'count', min: 1, max: 2, default: 1, hint: 'Two mattresses read as a split double, each with its own pillow.' },
  ],
  sofa: [
    { key: 'seats', label: 'Seat cushions', type: 'count', min: 1, max: 4, default: 2 },
    { key: 'armrests', label: 'Armrests', type: 'toggle', default: true },
  ],
  table: [
    { key: 'shelf', label: 'Lower shelf', type: 'toggle', default: false },
    {
      key: 'legs',
      label: 'Legs',
      type: 'select',
      default: 'four',
      choices: [
        { value: 'four', label: 'Four legs' },
        { value: 'panel', label: 'End panels' },
      ],
    },
  ],
  chair: [
    { key: 'armrests', label: 'Armrests', type: 'toggle', default: false },
    { key: 'cushion', label: 'Seat cushion', type: 'toggle', default: false },
  ],
  desk: [
    { key: 'monitors', label: 'Monitors', type: 'count', min: 0, max: 2, default: 1 },
    { key: 'drawers', label: 'Drawer unit', type: 'toggle', default: true },
  ],
  nightstand: [{ key: 'drawers', label: 'Drawers', type: 'count', min: 1, max: 3, default: 2 }],
  tv: [
    { key: 'bench', label: 'Media bench', type: 'toggle', default: true, hint: 'Off = wall-mounted screen only.' },
    { key: 'soundbar', label: 'Soundbar', type: 'toggle', default: false },
  ],
  mirror: [{ key: 'frame', label: 'Frame', type: 'toggle', default: true }],
  plant: [{ key: 'clusters', label: 'Foliage clusters', type: 'count', min: 1, max: 3, default: 2 }],
  wardrobe: [
    { key: 'doors', label: 'Doors', type: 'count', min: 1, max: 3, default: 2 },
    { key: 'legs', label: 'Legs', type: 'toggle', default: false },
  ],
  bookshelf: [
    { key: 'shelves', label: 'Shelves', type: 'count', min: 1, max: 6, default: 4, hint: 'Interior shelves between top and bottom.' },
    { key: 'doors', label: 'Cabinet doors', type: 'toggle', default: false },
  ],
  counter: [
    { key: 'cabinets', label: 'Cabinet doors', type: 'count', min: 0, max: 4, default: 3 },
    { key: 'sink', label: 'Built-in sink', type: 'toggle', default: false },
  ],
  stove: [
    { key: 'burners', label: 'Cooktop burners', type: 'count', min: 1, max: 6, default: 4 },
    { key: 'handle', label: 'Oven handle', type: 'toggle', default: true },
  ],
  fridge: [
    {
      key: 'style',
      label: 'Style',
      type: 'select',
      default: 'freezer-below',
      choices: [
        { value: 'freezer-below', label: 'Fridge-freezer' },
        { value: 'single', label: 'Single door' },
        { value: 'side-by-side', label: 'Side by side' },
      ],
    },
  ],
  toilet: [{ key: 'lidUp', label: 'Lid up', type: 'toggle', default: false }],
  bathtub: [{ key: 'tap', label: 'Tap & spout', type: 'toggle', default: true }],
  sink: [
    { key: 'pedestal', label: 'Pedestal', type: 'toggle', default: true, hint: 'Off = wall-hung basin.' },
    { key: 'mirror', label: 'Mirror above', type: 'toggle', default: false },
  ],
  rug: [
    {
      key: 'pattern',
      label: 'Pattern',
      type: 'select',
      default: 'solid',
      choices: [
        { value: 'solid', label: 'Solid' },
        { value: 'border', label: 'Border' },
        { value: 'striped', label: 'Striped' },
      ],
    },
  ],
  box: [],
  'floor-lamp': [],
  'table-lamp': [],
};

/** True if the kind has any customizable options. */
export function hasOptions(kind: FurnitureKind): boolean {
  return FURNITURE_OPTIONS[kind].length > 0;
}

/** The default option object for a kind (every spec at its default value). */
export function defaultOptions(kind: FurnitureKind): FurnitureOptions {
  const out: FurnitureOptions = {};
  for (const spec of FURNITURE_OPTIONS[kind]) out[spec.key] = spec.default;
  return out;
}

function clampCount(spec: CountOptionSpec, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return spec.default;
  return Math.min(spec.max, Math.max(spec.min, Math.round(value)));
}

/**
 * Coerces arbitrary stored/incoming data into a valid option object for the kind:
 * every declared option is present with a sound value, unknown keys are dropped,
 * and out-of-range or wrong-typed values fall back to the default. Idempotent, so
 * it is safe to run on every load and on every read.
 */
export function normalizeOptions(kind: FurnitureKind, raw: unknown): FurnitureOptions {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: FurnitureOptions = {};
  for (const spec of FURNITURE_OPTIONS[kind]) {
    const v = src[spec.key];
    if (spec.type === 'toggle') {
      out[spec.key] = typeof v === 'boolean' ? v : spec.default;
    } else if (spec.type === 'count') {
      out[spec.key] = clampCount(spec, v);
    } else {
      out[spec.key] = typeof v === 'string' && spec.choices.some((c) => c.value === v) ? v : spec.default;
    }
  }
  return out;
}

// ---- Read helpers used by the 3D pieces (fall back to a caller-supplied default
// so a piece renders sensibly even when handed un-normalized options). ----

export function optNum(o: FurnitureOptions | undefined, key: string, fallback: number): number {
  const v = o?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function optBool(o: FurnitureOptions | undefined, key: string, fallback: boolean): boolean {
  const v = o?.[key];
  return typeof v === 'boolean' ? v : fallback;
}

export function optStr(o: FurnitureOptions | undefined, key: string, fallback: string): string {
  const v = o?.[key];
  return typeof v === 'string' ? v : fallback;
}

export type { FurnitureOptionValue };
