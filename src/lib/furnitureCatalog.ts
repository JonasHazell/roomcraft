import type { FurnitureCategory, FurnitureKind, FurnitureSize } from '../types.ts';

export interface CatalogEntry {
  label: string;
  /** The room type this piece belongs to; groups the catalog in the picker. */
  category: FurnitureCategory;
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
    category: 'bedroom',
    defaultSize: { width: 1.6, depth: 2.0, height: 0.5 },
    defaultColor: '#7d8c72',
    front: 'the foot end (the head end is at the back, against a wall)',
    accessDepth: 0.6,
    blocks: true,
  },
  sofa: {
    label: 'Sofa',
    category: 'living',
    defaultSize: { width: 2.2, depth: 0.9, height: 0.8 },
    defaultColor: '#b06a45',
    front: 'the seating side (the backrest is at the back)',
    accessDepth: 0.5,
    blocks: true,
  },
  table: {
    label: 'Table',
    category: 'living',
    defaultSize: { width: 1.4, depth: 0.8, height: 0.75 },
    defaultColor: '#9b7350',
    front: 'the long side you sit at',
    accessDepth: 0.6,
    blocks: true,
  },
  chair: {
    label: 'Chair',
    category: 'living',
    defaultSize: { width: 0.45, depth: 0.45, height: 0.9 },
    defaultColor: '#4a453c',
    front: 'the seating side (the backrest is at the back)',
    accessDepth: 0,
    blocks: false,
  },
  desk: {
    label: 'Desk',
    category: 'workspace',
    defaultSize: { width: 1.2, depth: 0.7, height: 0.74 },
    defaultColor: '#8f7a5e',
    front: 'the seating side (the screen faces the back)',
    accessDepth: 0.8,
    blocks: true,
  },
  nightstand: {
    label: 'Nightstand',
    category: 'bedroom',
    defaultSize: { width: 0.45, depth: 0.4, height: 0.55 },
    defaultColor: '#a08b6f',
    front: 'the drawer side (placed next to the head of the bed)',
    accessDepth: 0,
    blocks: true,
  },
  tv: {
    label: 'TV',
    category: 'living',
    defaultSize: { width: 1.3, depth: 0.35, height: 0.85 },
    defaultColor: '#3a3a3d',
    front: 'the screen side (the back against a wall)',
    accessDepth: 0,
    blocks: true,
  },
  mirror: {
    label: 'Mirror',
    category: 'anywhere',
    defaultSize: { width: 0.6, depth: 0.05, height: 1.7 },
    defaultColor: '#b9c4c9',
    front: 'the glass side (the back against a wall)',
    accessDepth: 0,
    blocks: true,
  },
  plant: {
    label: 'Plant',
    category: 'anywhere',
    defaultSize: { width: 0.4, depth: 0.4, height: 1.2 },
    defaultColor: '#5d7a4e',
    front: 'no direction (pot on the floor)',
    accessDepth: 0,
    blocks: true,
  },
  wardrobe: {
    label: 'Wardrobe',
    category: 'bedroom',
    defaultSize: { width: 1.2, depth: 0.6, height: 2.0 },
    defaultColor: '#ded5c2',
    front: 'the door side (the back is at the rear, against a wall)',
    accessDepth: 0.9,
    blocks: true,
  },
  bookshelf: {
    label: 'Bookshelf',
    category: 'workspace',
    defaultSize: { width: 0.9, depth: 0.35, height: 1.9 },
    defaultColor: '#8a6f52',
    front: 'the open shelf side (the back is at the rear, against a wall)',
    accessDepth: 0.6,
    blocks: true,
  },
  counter: {
    label: 'Kitchen counter',
    category: 'kitchen',
    defaultSize: { width: 1.8, depth: 0.6, height: 0.9 },
    defaultColor: '#e3ddcf',
    front: 'the working side you stand at (the back is against a wall)',
    accessDepth: 0.8,
    blocks: true,
  },
  stove: {
    label: 'Stove',
    category: 'kitchen',
    defaultSize: { width: 0.6, depth: 0.6, height: 0.9 },
    defaultColor: '#3a3d42',
    front: 'the oven door and controls side (the back is against a wall)',
    accessDepth: 0.8,
    blocks: true,
  },
  fridge: {
    label: 'Fridge',
    category: 'kitchen',
    defaultSize: { width: 0.7, depth: 0.7, height: 1.8 },
    defaultColor: '#d7dade',
    front: 'the door side (the back is against a wall)',
    accessDepth: 0.8,
    blocks: true,
  },
  toilet: {
    label: 'Toilet',
    category: 'bathroom',
    defaultSize: { width: 0.4, depth: 0.7, height: 0.8 },
    defaultColor: '#f2f0ec',
    front: 'the seat side you face (the cistern is at the back, against a wall)',
    accessDepth: 0.6,
    blocks: true,
  },
  bathtub: {
    label: 'Bathtub',
    category: 'bathroom',
    defaultSize: { width: 1.7, depth: 0.75, height: 0.6 },
    defaultColor: '#f2f0ec',
    front: 'the long side you step in from (the back is against a wall)',
    accessDepth: 0.7,
    blocks: true,
  },
  sink: {
    label: 'Sink',
    category: 'bathroom',
    defaultSize: { width: 0.6, depth: 0.45, height: 0.85 },
    defaultColor: '#f2f0ec',
    front: 'the basin side you stand at (the back is against a wall)',
    accessDepth: 0.6,
    blocks: true,
  },
  rug: {
    label: 'Rug',
    category: 'anywhere',
    defaultSize: { width: 2.0, depth: 1.4, height: 0.02 },
    defaultColor: '#a5502f',
    front: 'no direction (flat on the floor)',
    accessDepth: 0,
    blocks: false,
  },
  box: {
    label: 'Custom box',
    category: 'anywhere',
    defaultSize: { width: 1.0, depth: 1.0, height: 1.0 },
    defaultColor: '#b0a795',
    front: 'the usage side (e.g. the seating side of a desk or the front of a TV bench)',
    accessDepth: 0.6,
    blocks: true,
  },
  'floor-lamp': {
    label: 'Floor lamp',
    category: 'anywhere',
    defaultSize: { width: 0.4, depth: 0.4, height: 1.55 },
    defaultColor: '#a08b6f',
    front: 'no direction (pole stands on the floor)',
    accessDepth: 0,
    blocks: true,
  },
  'table-lamp': {
    label: 'Table lamp',
    category: 'anywhere',
    defaultSize: { width: 0.25, depth: 0.25, height: 0.45 },
    defaultColor: '#a08b6f',
    front: 'no direction (sits on another surface)',
    accessDepth: 0,
    blocks: false,
  },
};

// Tuple type so the list can feed z.enum directly (persistence, AI schema).
export const FURNITURE_KINDS = Object.keys(FURNITURE_CATALOG) as [
  FurnitureKind,
  ...FurnitureKind[],
];

/** A room-type group with its display label, in the order the picker shows them. */
export interface CategoryGroup {
  id: FurnitureCategory;
  label: string;
}

/**
 * The room-type groups in display order. Every {@link FurnitureCategory} appears
 * exactly once; the picker walks this list to render the catalog under headings,
 * and {@link kindsInCategory} lists the kinds for each.
 */
export const FURNITURE_CATEGORIES: CategoryGroup[] = [
  { id: 'living', label: 'Living room' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'bathroom', label: 'Bathroom' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'anywhere', label: 'Anywhere' },
];

/** The kinds in one category, in catalog order. */
export function kindsInCategory(category: FurnitureCategory): FurnitureKind[] {
  return FURNITURE_KINDS.filter((k) => FURNITURE_CATALOG[k].category === category);
}

/** The display label for the room type a kind belongs to. */
export function categoryLabelFor(kind: FurnitureKind): string {
  const category = FURNITURE_CATALOG[kind].category;
  return FURNITURE_CATEGORIES.find((c) => c.id === category)?.label ?? '';
}
