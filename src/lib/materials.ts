/**
 * Surface materials for furniture, floors and walls. Each material is a small set
 * of PBR parameters (roughness/metalness) layered on top of the piece's colour —
 * so "the same terracotta" reads as matte paint, brushed metal or soft fabric
 * depending on the chosen finish. The colour is still picked separately; a
 * material only changes how light plays off the surface.
 *
 * The presets here are the single source of truth: the 3D pieces read them to set
 * their `meshStandardMaterial`, the editor renders a picker from {@link MATERIAL_CHOICES},
 * and persistence normalizes stored ids against {@link normalizeMaterial}.
 */
export interface MaterialSpec {
  id: string;
  label: string;
  /** PBR roughness, 0 (mirror) … 1 (fully diffuse). */
  roughness: number;
  /** PBR metalness, 0 (dielectric) … 1 (metal). */
  metalness: number;
}

/**
 * The finishes on offer. `matte` reproduces RoomCraft's original flat-painted look
 * and is the default, so designs made before materials existed are unchanged.
 */
export const MATERIALS: MaterialSpec[] = [
  { id: 'matte', label: 'Matte paint', roughness: 0.85, metalness: 0 },
  { id: 'wood', label: 'Wood', roughness: 0.6, metalness: 0 },
  { id: 'fabric', label: 'Fabric', roughness: 0.95, metalness: 0 },
  { id: 'carpet', label: 'Carpet', roughness: 1, metalness: 0 },
  { id: 'metal', label: 'Metal', roughness: 0.4, metalness: 0.85 },
  { id: 'gloss', label: 'Gloss paint', roughness: 0.2, metalness: 0 },
];

/** The finish every surface falls back to — the original flat matte look. */
export const DEFAULT_MATERIAL = 'matte';

const BY_ID = new Map(MATERIALS.map((m) => [m.id, m]));

/** Choices for a material `<select>` (editor controls). */
export const MATERIAL_CHOICES = MATERIALS.map((m) => ({ value: m.id, label: m.label }));

/** The spec for a material id, falling back to the default for unknown/missing ids. */
export function materialSpec(id: string | undefined | null): MaterialSpec {
  return (id != null && BY_ID.get(id)) || BY_ID.get(DEFAULT_MATERIAL)!;
}

/** True if `id` names a known material. */
export function isMaterialId(id: unknown): id is string {
  return typeof id === 'string' && BY_ID.has(id);
}

/**
 * Coerces arbitrary stored/incoming data into a valid material id: a known id is
 * kept, anything else falls back to the default. Idempotent, so it is safe to run
 * on every load and on every read.
 */
export function normalizeMaterial(raw: unknown): string {
  return isMaterialId(raw) ? raw : DEFAULT_MATERIAL;
}
