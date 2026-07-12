import { FURNITURE_CATALOG } from '../../lib/furnitureCatalog';
import { defaultOptions, normalizeOptions } from '../../lib/furnitureOptions';
import { DEFAULT_MATERIAL, normalizeMaterial } from '../../lib/materials';
import {
  defaultMaterials,
  normalizeColors,
  normalizeMaterials,
  type FurnitureMaterials,
} from '../../lib/furnitureParts';
import type {
  FurnitureKind,
  FurnitureLibraryEntry,
  FurnitureOptions,
  FurnitureSize,
} from '../../types';

/** The editable shape shared by a new-piece draft and an existing furniture item. */
export interface FurnitureDraft {
  kind: FurnitureKind;
  name: string;
  size: FurnitureSize;
  elevation: number;
  color: string;
  colors?: Record<string, string>;
  material?: string;
  materials?: FurnitureMaterials;
  options?: FurnitureOptions;
}

export type FurnitureFieldPatch = {
  name?: string;
  size?: Partial<FurnitureSize>;
  elevation?: number;
  color?: string;
  /** Per-part colour changes, merged onto the current colours. */
  colors?: Record<string, string>;
  material?: string;
  /** Per-part material changes, merged onto the current materials. */
  materials?: FurnitureMaterials;
  /** Per-type option changes, merged onto the current options. */
  options?: FurnitureOptions;
};

/** A fresh draft from the catalog defaults for a furniture kind. */
export function draftFor(kind: FurnitureKind): FurnitureDraft {
  const entry = FURNITURE_CATALOG[kind];
  return {
    kind,
    name: entry.label,
    size: { ...entry.defaultSize },
    elevation: 0,
    color: entry.defaultColor,
    material: DEFAULT_MATERIAL,
    materials: defaultMaterials(kind),
    options: defaultOptions(kind),
  };
}

/** A draft pre-filled from a saved library entry. */
export function draftFromLibrary(entry: FurnitureLibraryEntry): FurnitureDraft {
  return {
    kind: entry.kind,
    name: entry.name,
    size: { ...entry.size },
    elevation: entry.elevation,
    color: entry.color,
    colors: normalizeColors(entry.kind, entry.colors),
    material: normalizeMaterial(entry.material),
    materials: normalizeMaterials(entry.kind, entry.materials, entry.material),
    options: normalizeOptions(entry.kind, entry.options),
  };
}

/** Applies a field patch to a draft, clamping elevation at 0 and merging options. */
export function applyPatch(draft: FurnitureDraft, patch: FurnitureFieldPatch): FurnitureDraft {
  return {
    ...draft,
    name: patch.name ?? draft.name,
    color: patch.color ?? draft.color,
    material: patch.material ?? draft.material,
    elevation: patch.elevation != null ? Math.max(0, patch.elevation) : draft.elevation,
    size: patch.size ? { ...draft.size, ...patch.size } : draft.size,
    options: patch.options
      ? { ...normalizeOptions(draft.kind, draft.options), ...patch.options }
      : draft.options,
    materials: patch.materials
      ? { ...normalizeMaterials(draft.kind, draft.materials, draft.material), ...patch.materials }
      : draft.materials,
    colors: patch.colors ? { ...draft.colors, ...patch.colors } : draft.colors,
  };
}
