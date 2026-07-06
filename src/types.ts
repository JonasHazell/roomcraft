export type OpeningKind = 'door' | 'window';

/** Point on the floor plane in meters; y is implicitly 0. */
export interface Point {
  x: number;
  z: number;
}

export type WallKind = 'exterior' | 'interior';

export interface Wall {
  id: string;
  kind: WallKind;
  /** Start; opening offsets are measured from a. */
  a: Point;
  /** End; axis-parallel: a.x === b.x or a.z === b.z. */
  b: Point;
}

export interface Room {
  height: number; // ceiling height, meters
  floorColor: string;
  wallColor: string;
}

export interface WallOpening {
  id: string;
  kind: OpeningKind;
  wallId: string;
  /** Meters from the wall's start point (a) to the opening's left edge. */
  offset: number;
  width: number;
  height: number;
  /** Bottom edge above the floor; always 0 for doors. */
  elevation: number;
}

export type FurnitureKind =
  | 'bed'
  | 'sofa'
  | 'table'
  | 'chair'
  | 'desk'
  | 'nightstand'
  | 'tv'
  | 'mirror'
  | 'plant'
  | 'wardrobe'
  | 'bookshelf'
  | 'rug'
  | 'box';

export interface FurnitureSize {
  width: number; // X in the furniture's own coordinate system
  depth: number; // Z
  height: number; // Y
}

export interface FurnitureItem {
  id: string;
  kind: FurnitureKind;
  name: string;
  /** Center of the footprint in the floor plane. */
  position: { x: number; z: number };
  rotationY: number; // radians
  size: FurnitureSize;
  /** Bottom edge above the floor, meters; 0 = standing on the floor (e.g. wall shelf > 0). */
  elevation: number;
  color: string;
}

/** A saved furniture piece in the library — reusable properties without placement. */
export interface FurnitureLibraryEntry {
  id: string;
  name: string;
  kind: FurnitureKind;
  size: FurnitureSize;
  elevation: number;
  color: string;
}

/** A named furnishing variant of one room. The room shape (walls, openings,
 *  colours) is shared across all proposals; only the furniture differs. */
export interface Proposal {
  id: string;
  name: string;
  furniture: FurnitureItem[];
}

export const SCHEMA_VERSION = 3;

export interface Design {
  schemaVersion: number;
  name: string;
  updatedAt: string; // ISO
  room: Room;
  /** Exterior walls first, in loop order (walls[i].b === walls[i+1].a); then interior walls. */
  walls: Wall[];
  openings: WallOpening[];
  /**
   * The active proposal's furnishing — the single live source of truth while
   * editing. Every furniture action reads and writes this array; the matching
   * entry in `proposals` is refreshed from it whenever the design is persisted,
   * exported or a different proposal is activated.
   */
  furniture: FurnitureItem[];
  /** Named furnishing variants of this room; always at least one. */
  proposals: Proposal[];
  /** Which proposal `furniture` currently mirrors. */
  activeProposalId: string;
}
