import type { FurnitureKind, FurnitureSize } from '../types';

export interface CatalogEntry {
  label: string;
  defaultSize: FurnitureSize;
  defaultColor: string;
  /**
   * Where the furniture's front is (local +z), in plain language — used in the AI
   * prompt so the `facing` point aims the right way. The front is always local +z
   * in the model.
   */
  front: string;
  /**
   * Clear space (meters) that must exist in front of the front side and be
   * reachable from a door for the piece to be usable. 0 = no access zone needed.
   */
  accessDepth: number;
  /** Blocks passage: counts as an obstacle in the reachability analysis (tall/solid pieces). */
  blocks: boolean;
}

export const FURNITURE_CATALOG: Record<FurnitureKind, CatalogEntry> = {
  bed: {
    label: 'Bed',
    defaultSize: { width: 1.6, depth: 2.0, height: 0.5 },
    defaultColor: '#7d8c72',
    front: 'the foot end (the headboard is at the back, against a wall)',
    accessDepth: 0.6,
    blocks: true,
  },
  sofa: {
    label: 'Sofa',
    defaultSize: { width: 2.2, depth: 0.9, height: 0.8 },
    defaultColor: '#b06a45',
    front: 'the seating side (the backrest is at the back)',
    accessDepth: 0.5,
    blocks: true,
  },
  table: {
    label: 'Table',
    defaultSize: { width: 1.4, depth: 0.8, height: 0.75 },
    defaultColor: '#9b7350',
    front: 'the long side you sit at',
    accessDepth: 0.6,
    blocks: true,
  },
  chair: {
    label: 'Chair',
    defaultSize: { width: 0.45, depth: 0.45, height: 0.9 },
    defaultColor: '#4a453c',
    front: 'the seating side (the backrest is at the back)',
    accessDepth: 0,
    blocks: false,
  },
  desk: {
    label: 'Desk',
    defaultSize: { width: 1.2, depth: 0.7, height: 0.74 },
    defaultColor: '#8f7a5e',
    front: 'the seating side (the screen faces the back)',
    accessDepth: 0.8,
    blocks: true,
  },
  nightstand: {
    label: 'Nightstand',
    defaultSize: { width: 0.45, depth: 0.4, height: 0.55 },
    defaultColor: '#a08b6f',
    front: 'the drawer side (placed next to the head of the bed)',
    accessDepth: 0,
    blocks: true,
  },
  tv: {
    label: 'TV',
    defaultSize: { width: 1.3, depth: 0.35, height: 0.85 },
    defaultColor: '#3a3a3d',
    front: 'the screen side (the back against a wall)',
    accessDepth: 0,
    blocks: true,
  },
  mirror: {
    label: 'Mirror',
    defaultSize: { width: 0.6, depth: 0.05, height: 1.7 },
    defaultColor: '#b9c4c9',
    front: 'the glass side (the back against a wall)',
    accessDepth: 0,
    blocks: true,
  },
  plant: {
    label: 'Plant',
    defaultSize: { width: 0.4, depth: 0.4, height: 1.2 },
    defaultColor: '#5d7a4e',
    front: 'no direction (pot on the floor)',
    accessDepth: 0,
    blocks: true,
  },
  wardrobe: {
    label: 'Wardrobe',
    defaultSize: { width: 1.2, depth: 0.6, height: 2.0 },
    defaultColor: '#ded5c2',
    front: 'the door side (the back is at the rear, against a wall)',
    accessDepth: 0.9,
    blocks: true,
  },
  bookshelf: {
    label: 'Bookshelf',
    defaultSize: { width: 0.9, depth: 0.35, height: 1.9 },
    defaultColor: '#8a6f52',
    front: 'the open shelf side (the back is at the rear, against a wall)',
    accessDepth: 0.6,
    blocks: true,
  },
  rug: {
    label: 'Rug',
    defaultSize: { width: 2.0, depth: 1.4, height: 0.02 },
    defaultColor: '#a5502f',
    front: 'no direction (flat on the floor)',
    accessDepth: 0,
    blocks: false,
  },
  box: {
    label: 'Custom box',
    defaultSize: { width: 1.0, depth: 1.0, height: 1.0 },
    defaultColor: '#b0a795',
    front: 'the usage side (e.g. the seating side of a desk or the front of a TV bench)',
    accessDepth: 0.6,
    blocks: true,
  },
};

// Tuple type so the list can feed z.enum directly (persistence, AI schema).
export const FURNITURE_KINDS = Object.keys(FURNITURE_CATALOG) as [
  FurnitureKind,
  ...FurnitureKind[],
];
