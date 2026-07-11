import { isHexColor, type FurnitureKind } from '../types';
import { DEFAULT_MATERIAL, normalizeMaterial } from './materials';

/**
 * Per-type material parts. Each {@link FurnitureKind} is split into a few named
 * parts (a bed's frame vs its bedding, a table's top vs its legs), each with a
 * sensible default finish — so a new piece looks like real furniture (wood frame,
 * fabric cushions) instead of one flat material. The editor renders a material
 * picker per part, the 3D pieces read a part's material where they draw it, and
 * persistence normalizes stored values against these specs.
 *
 * The first part in each list is the "primary" one; meshes that aren't assigned a
 * part (fixed details like handles) fall back to it.
 */
export interface PartSpec {
  key: string;
  label: string;
  /** Default material id for this part (see {@link ./materials}). */
  default: string;
}

export type FurnitureMaterials = Record<string, string>;

export const FURNITURE_PARTS: Record<FurnitureKind, PartSpec[]> = {
  bed: [
    { key: 'frame', label: 'Frame', default: 'wood' },
    { key: 'bedding', label: 'Bedding', default: 'fabric' },
  ],
  sofa: [
    { key: 'frame', label: 'Frame', default: 'fabric' },
    { key: 'cushions', label: 'Cushions', default: 'fabric' },
  ],
  table: [
    { key: 'top', label: 'Top', default: 'wood' },
    { key: 'legs', label: 'Legs', default: 'wood' },
  ],
  chair: [
    { key: 'frame', label: 'Frame', default: 'wood' },
    { key: 'cushion', label: 'Cushion', default: 'fabric' },
  ],
  desk: [
    { key: 'top', label: 'Top', default: 'wood' },
    { key: 'base', label: 'Legs & drawers', default: 'wood' },
  ],
  nightstand: [
    { key: 'body', label: 'Body', default: 'wood' },
    { key: 'drawers', label: 'Drawers', default: 'wood' },
  ],
  tv: [
    { key: 'screen', label: 'Screen', default: 'matte' },
    { key: 'bench', label: 'Bench', default: 'wood' },
  ],
  mirror: [{ key: 'frame', label: 'Frame', default: 'wood' }],
  plant: [{ key: 'pot', label: 'Pot', default: 'matte' }],
  wardrobe: [
    { key: 'body', label: 'Body', default: 'wood' },
    { key: 'doors', label: 'Doors', default: 'wood' },
  ],
  bookshelf: [
    { key: 'frame', label: 'Frame', default: 'wood' },
    { key: 'doors', label: 'Doors', default: 'wood' },
  ],
  rug: [{ key: 'rug', label: 'Material', default: 'carpet' }],
  box: [{ key: 'body', label: 'Material', default: 'matte' }],
};

/** True if the kind splits into more than one configurable part. */
export function hasParts(kind: FurnitureKind): boolean {
  return FURNITURE_PARTS[kind].length > 1;
}

/** The primary part key — the fallback for meshes without an explicit part. */
export function primaryPart(kind: FurnitureKind): string {
  return FURNITURE_PARTS[kind][0].key;
}

/** The default material object for a kind (every part at its default finish). */
export function defaultMaterials(kind: FurnitureKind): FurnitureMaterials {
  const out: FurnitureMaterials = {};
  for (const p of FURNITURE_PARTS[kind]) out[p.key] = p.default;
  return out;
}

/** The resolved material id for one part, falling back to the part's default. */
export function partMaterial(
  kind: FurnitureKind,
  materials: FurnitureMaterials | undefined,
  key: string,
): string {
  const v = materials?.[key];
  if (typeof v === 'string') return normalizeMaterial(v);
  const spec = FURNITURE_PARTS[kind].find((p) => p.key === key);
  return spec ? spec.default : DEFAULT_MATERIAL;
}

/** A part's colour override if it has a valid one, else `undefined` (use the base colour). */
export function partColorOverride(
  colors: Record<string, string> | undefined,
  key: string,
): string | undefined {
  const v = colors?.[key];
  return isHexColor(v) ? v : undefined;
}

/**
 * Coerces stored/incoming per-part colours into a sparse map of valid overrides:
 * only known parts with a valid #rrggbb colour are kept, everything else dropped.
 * Returns `undefined` when nothing survives, so an un-customised piece stays lean.
 */
export function normalizeColors(
  kind: FurnitureKind,
  raw: unknown,
): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const src = raw as Record<string, unknown>;
  const keys = new Set(FURNITURE_PARTS[kind].map((p) => p.key));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(src)) {
    if (keys.has(k) && typeof v === 'string' && isHexColor(v)) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Coerces arbitrary stored/incoming data into a valid per-part material map:
 * every declared part gets a sound material, unknown parts are dropped, and
 * missing parts fall back to their default. `legacyMaterial` is the old
 * whole-piece {@link FurnitureItem.material}: when no per-part map exists it is
 * applied to every part, so designs made before parts existed load unchanged.
 * Idempotent, so it is safe to run on every load and on every read.
 */
export function normalizeMaterials(
  kind: FurnitureKind,
  raw: unknown,
  legacyMaterial?: unknown,
): FurnitureMaterials {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : undefined;
  // A legacy whole-piece choice seeds every part — but the old default `matte`
  // counts as "unset", so pieces that never picked a finish get the nicer per-part
  // defaults (a wood frame, fabric bedding) instead of a flat matte everywhere.
  const legacy =
    typeof legacyMaterial === 'string' && legacyMaterial !== DEFAULT_MATERIAL
      ? normalizeMaterial(legacyMaterial)
      : undefined;
  const out: FurnitureMaterials = {};
  for (const p of FURNITURE_PARTS[kind]) {
    const v = src?.[p.key];
    if (typeof v === 'string') out[p.key] = normalizeMaterial(v);
    else if (!src && legacy) out[p.key] = legacy;
    else out[p.key] = p.default;
  }
  return out;
}
