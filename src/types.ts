export type WallId = 'north' | 'south' | 'east' | 'west';
export type OpeningKind = 'door' | 'window';

export interface Room {
  width: number; // X, meter
  length: number; // Z, meter
  height: number; // takhöjd, meter
  floorColor: string;
  wallColor: string;
}

export interface WallOpening {
  id: string;
  kind: OpeningKind;
  wall: WallId;
  /** Meter från väggens vänstra hörn (sett inifrån rummet) till öppningens vänsterkant. */
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
  /** Fotavtryckets centrum på golvet; y är alltid 0. */
  position: { x: number; z: number };
  rotationY: number; // radianer
  size: FurnitureSize;
  color: string;
}

export const SCHEMA_VERSION = 1;

export interface Design {
  schemaVersion: number;
  name: string;
  updatedAt: string; // ISO
  room: Room;
  openings: WallOpening[];
  furniture: FurnitureItem[];
}
