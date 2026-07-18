import type { FurnitureMaterials } from '../../lib/furnitureParts';
import type { FurnitureKind, FurnitureOptions, FurnitureProduct, FurnitureSize } from '../../types';

/**
 * The editable shape shared by `FurnitureFields`' two callers: the live "More"
 * editor (bound to an existing `FurnitureItem`) and, structurally, anything else
 * with the same fields.
 */
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
  product?: FurnitureProduct;
}

export type FurnitureFieldPatch = {
  name?: string;
  size?: Partial<FurnitureSize>;
  elevation?: number;
  color?: string;
  /**
   * Per-part colour changes, merged onto the current colours. A part set to
   * `undefined` clears that part's override, so it resumes following the
   * primary colour.
   */
  colors?: Record<string, string | undefined>;
  material?: string;
  /** Per-part material changes, merged onto the current materials. */
  materials?: FurnitureMaterials;
  /** Per-type option changes, merged onto the current options. */
  options?: FurnitureOptions;
  /**
   * The whole product link, replaced as a unit (`undefined` clears it). Unlike
   * colours/materials/options there's no per-field merge — the product editor
   * builds the full object and this overwrites what was there.
   */
  product?: FurnitureProduct;
};
