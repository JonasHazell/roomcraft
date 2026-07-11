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
  /**
   * How strongly the surface picks up the scene's environment reflections. Shiny
   * finishes (metal, gloss) reflect fully; soft ones (fabric, carpet) barely at
   * all. This is what makes the finishes read as visibly different.
   */
  envMapIntensity: number;
  /**
   * Depth of the procedural surface relief (a bump map keyed by {@link id}) — a
   * woodgrain, a fabric weave, a carpet pile. 0 leaves the surface perfectly
   * smooth (matte paint, gloss). See {@link ../components/scene/materialTextures}.
   */
  bumpScale: number;
  /**
   * How many metres of a surface one tile of the procedural texture spans, so the
   * pattern is sized in the real world (e.g. ~0.3 m floor tiles, large marble
   * veining). Small furniture uses a fixed tiling instead.
   */
  texScale: number;
}

/**
 * The finishes on offer. `matte` reproduces RoomCraft's original flat-painted look
 * and is the default, so designs made before materials existed are unchanged.
 * The finishes are spread across the shiny↔soft and smooth↔textured axes so they
 * read as clearly distinct once the scene has an environment map.
 */
export const MATERIALS: MaterialSpec[] = [
  { id: 'matte', label: 'Matte paint', roughness: 0.9, metalness: 0, envMapIntensity: 0.18, bumpScale: 0, texScale: 0.5 },
  { id: 'wood', label: 'Wood', roughness: 0.55, metalness: 0, envMapIntensity: 0.4, bumpScale: 0.04, texScale: 0.95 },
  { id: 'fabric', label: 'Fabric', roughness: 1, metalness: 0, envMapIntensity: 0.1, bumpScale: 0.04, texScale: 0.35 },
  { id: 'carpet', label: 'Carpet', roughness: 1, metalness: 0, envMapIntensity: 0.06, bumpScale: 0.12, texScale: 0.5 },
  // Just under full metalness so a metal surface keeps a sliver of its own colour
  // and never collapses to black in a dim reflection, the way pure metal can.
  { id: 'metal', label: 'Metal', roughness: 0.35, metalness: 0.9, envMapIntensity: 0.85, bumpScale: 0.02, texScale: 0.5 },
  { id: 'gloss', label: 'Gloss paint', roughness: 0.12, metalness: 0, envMapIntensity: 0.8, bumpScale: 0, texScale: 0.5 },
  // Patterned finishes: these also carry a colour pattern (a `map`), so the piece's
  // colour tints the stone/tile/veining rather than filling a flat surface.
  { id: 'concrete', label: 'Concrete', roughness: 0.92, metalness: 0, envMapIntensity: 0.14, bumpScale: 0.05, texScale: 1.4 },
  { id: 'tile', label: 'Tile', roughness: 0.32, metalness: 0, envMapIntensity: 0.6, bumpScale: 0.06, texScale: 0.62 },
  { id: 'stone', label: 'Stone', roughness: 0.85, metalness: 0, envMapIntensity: 0.2, bumpScale: 0.16, texScale: 0.9 },
  { id: 'marble', label: 'Marble', roughness: 0.22, metalness: 0, envMapIntensity: 0.6, bumpScale: 0.012, texScale: 1.6 },
  { id: 'brick', label: 'Brick', roughness: 0.9, metalness: 0, envMapIntensity: 0.14, bumpScale: 0.14, texScale: 0.8 },
  { id: 'terrazzo', label: 'Terrazzo', roughness: 0.32, metalness: 0, envMapIntensity: 0.55, bumpScale: 0.02, texScale: 0.7 },
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
