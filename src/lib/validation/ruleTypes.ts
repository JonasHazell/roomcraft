import type { Design, FurnitureItem, FurnitureKind, Point } from '../../types';
import type { OpeningInfo } from './geo';

export type RuleCategory =
  | 'Safety'
  | 'Accessibility'
  | 'Ergonomics & dimensions'
  | 'Feng shui'
  | 'Light'
  | 'Color & textiles'
  | 'Acoustics'
  | 'Aesthetics';

export const CATEGORY_ORDER: RuleCategory[] = [
  'Safety',
  'Accessibility',
  'Ergonomics & dimensions',
  'Feng shui',
  'Light',
  'Color & textiles',
  'Acoustics',
  'Aesthetics',
];

export type RoomType = 'sovrum' | 'vardagsrum' | 'hemmakontor' | 'matplats';

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  sovrum: 'Bedroom',
  vardagsrum: 'Living room',
  hemmakontor: 'Home office',
  matplats: 'Dining area',
};

/** Score weight per importance level according to the rule catalog. */
export const IMPORTANCE_WEIGHT: Record<number, number> = { 5: 16, 4: 8, 3: 4, 2: 2, 1: 1 };

export interface Violation {
  message: string;
  /** Furniture highlighted in the 3D view when the issue is selected. */
  furnitureIds: string[];
  /** Floor zones (polygons) highlighted in the 3D view. */
  zones?: Point[][];
}

export type RuleOutcome =
  | { status: 'not-applicable' }
  | { status: 'passed' }
  | { status: 'violated'; violations: Violation[] };

export interface RuleCtx {
  design: Design;
  poly: Point[];
  roomTypes: Set<RoomType>;
  doors: OpeningInfo[];
  windows: OpeningInfo[];
  byKind: (k: FurnitureKind) => FurnitureItem[];
}

export interface RuleDef {
  id: string;
  title: string;
  category: RuleCategory;
  importance: 1 | 2 | 3 | 4 | 5;
  source: string;
  /** Linked twin rule (e.g. FEN-03 for ERG-08): reported in both categories, counted once in the total. */
  twin?: { id: string; category: RuleCategory };
  /** Room types the rule requires; omitted = all rooms. */
  appliesTo?: RoomType[];
  check: (ctx: RuleCtx) => RuleOutcome;
}
