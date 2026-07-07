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
}

/** Default floor/wall colours for a fresh proposal. */
export const DEFAULT_FLOOR_COLOR = '#c9a878';
export const DEFAULT_WALL_COLOR = '#efe8da';

/** Matches a #rrggbb colour. The single source of truth for persistence, the AI client and the server. */
export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** True if `c` is a valid #rrggbb colour string. */
export function isHexColor(c: string | undefined | null): c is string {
  return typeof c === 'string' && HEX_COLOR_RE.test(c);
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
 *  ceiling height) is shared across all proposals; the furniture and the
 *  floor/wall colours are part of the proposal, so each variant can have its
 *  own palette. */
export interface Proposal {
  id: string;
  name: string;
  furniture: FurnitureItem[];
  /** Floor colour for this furnishing variant (#rrggbb). */
  floorColor: string;
  /** Wall colour for this furnishing variant (#rrggbb). */
  wallColor: string;
}

export const SCHEMA_VERSION = 5;

/**
 * One room within a {@link Project}: its floor plan (walls, openings), its
 * colours/height (`room`) and its furnishing variants (`proposals`). This is
 * also the live editing surface exposed by the store as `design` — every
 * furniture/wall/opening action reads and writes the active room.
 */
export interface Design {
  /** Stable id of the room inside its project. */
  id: string;
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
  /**
   * The active proposal's floor colour — the live source of truth while editing,
   * mirrored back into the matching proposal exactly like `furniture`.
   */
  floorColor: string;
  /** The active proposal's wall colour — mirrored like `floorColor`. */
  wallColor: string;
  /** Named furnishing variants of this room; always at least one. */
  proposals: Proposal[];
  /** Which proposal `furniture`/`floorColor`/`wallColor` currently mirror. */
  activeProposalId: string;
}

/**
 * The whole document: several rooms, each with its own floor plan and
 * furnishing proposals. The active room is the live `design` in the store; the
 * matching entry in `rooms` is refreshed from it whenever the project is
 * persisted, exported or a different room is activated.
 */
export interface Project {
  schemaVersion: number;
  name: string;
  updatedAt: string; // ISO
  /** The rooms in this project; always at least one. */
  rooms: Design[];
  /** Which room the store's live `design` currently mirrors. */
  activeRoomId: string;
}
