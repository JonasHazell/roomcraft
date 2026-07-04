export type OpeningKind = 'door' | 'window';

/** Punkt på golvplanet i meter; y är implicit 0. */
export interface Point {
  x: number;
  z: number;
}

export type WallKind = 'exterior' | 'interior';

export interface Wall {
  id: string;
  kind: WallKind;
  /** Start; öppningars offset mäts från a. */
  a: Point;
  /** Slut; axelparallell: a.x === b.x eller a.z === b.z. */
  b: Point;
}

export interface Room {
  height: number; // takhöjd, meter
  floorColor: string;
  wallColor: string;
}

export interface WallOpening {
  id: string;
  kind: OpeningKind;
  wallId: string;
  /** Meter från väggens startpunkt (a) till öppningens vänsterkant. */
  offset: number;
  width: number;
  height: number;
  /** Underkant över golvet; alltid 0 för dörrar. */
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
  width: number; // X i möbelns eget koordinatsystem
  depth: number; // Z
  height: number; // Y
}

export interface FurnitureItem {
  id: string;
  kind: FurnitureKind;
  name: string;
  /** Fotavtryckets centrum i golvplanet. */
  position: { x: number; z: number };
  rotationY: number; // radianer
  size: FurnitureSize;
  /** Underkant över golvet, meter; 0 = står på golvet (t.ex. vägghylla > 0). */
  elevation: number;
  color: string;
}

/** En sparad möbel i biblioteket — återanvändbara egenskaper utan placering. */
export interface FurnitureLibraryEntry {
  id: string;
  name: string;
  kind: FurnitureKind;
  size: FurnitureSize;
  elevation: number;
  color: string;
}

export const SCHEMA_VERSION = 2;

export interface Design {
  schemaVersion: number;
  name: string;
  updatedAt: string; // ISO
  room: Room;
  /** Ytterväggar först, i slingordning (walls[i].b === walls[i+1].a); därefter innerväggar. */
  walls: Wall[];
  openings: WallOpening[];
  furniture: FurnitureItem[];
}
