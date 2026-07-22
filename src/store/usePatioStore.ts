import { create } from 'zustand';
import type { DeckMaterialId, SurfaceId } from '../components/patio/surfaces';

/**
 * State for the outdoor patio planner (`#patio`) — a standalone 3D sandbox for
 * trying deck (altan) sizes and ground surfaces (paving / gravel) against a
 * house. Deliberately separate from `useDesignStore` (the indoor room model):
 * the patio planner is its own surface and shares no geometry with rooms, the
 * same way `ShareView` keeps a shared snapshot off the local project.
 *
 * All measurements are in metres. Bounds are enforced by the sliders in
 * `PatioControls`, but `setDeckWidth`/`setDeckDepth` clamp too so nothing can
 * drive the deck outside the modelled yard from anywhere else.
 */

export const DECK_MIN_WIDTH = 2;
export const DECK_MAX_WIDTH = 9;
export const DECK_MIN_DEPTH = 1.5;
export const DECK_MAX_DEPTH = 5;
export const YARD_MIN_DEPTH = 3;
export const YARD_MAX_DEPTH = 8;

/** Named starting points so a user can "try a few solutions" in one tap. */
export interface PatioPreset {
  id: string;
  label: string;
  deckWidth: number;
  deckDepth: number;
}

export const DECK_PRESETS: PatioPreset[] = [
  { id: 'cosy', label: 'Liten', deckWidth: 3, deckDepth: 2 },
  { id: 'family', label: 'Mellan', deckWidth: 5, deckDepth: 3 },
  { id: 'grand', label: 'Stor', deckWidth: 8, deckDepth: 4 },
];

interface PatioState {
  deckWidth: number;
  deckDepth: number;
  deckMaterial: DeckMaterialId;
  /** Ground surface for the yard around/beyond the deck. */
  surface: SurfaceId;
  yardDepth: number;
  /** A little life in the scene (planters, lamp post, watering can). */
  showProps: boolean;

  setDeckWidth: (v: number) => void;
  setDeckDepth: (v: number) => void;
  setDeckMaterial: (v: DeckMaterialId) => void;
  setSurface: (v: SurfaceId) => void;
  setYardDepth: (v: number) => void;
  setShowProps: (v: boolean) => void;
  applyPreset: (p: PatioPreset) => void;
  reset: () => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const INITIAL = {
  deckWidth: 5,
  deckDepth: 3,
  deckMaterial: 'thermo' as DeckMaterialId,
  surface: 'concrete' as SurfaceId,
  yardDepth: 5,
  showProps: true,
};

export const usePatioStore = create<PatioState>()((set) => ({
  ...INITIAL,
  setDeckWidth: (v) => set({ deckWidth: clamp(v, DECK_MIN_WIDTH, DECK_MAX_WIDTH) }),
  setDeckDepth: (v) => set({ deckDepth: clamp(v, DECK_MIN_DEPTH, DECK_MAX_DEPTH) }),
  setDeckMaterial: (deckMaterial) => set({ deckMaterial }),
  setSurface: (surface) => set({ surface }),
  setYardDepth: (v) => set({ yardDepth: clamp(v, YARD_MIN_DEPTH, YARD_MAX_DEPTH) }),
  setShowProps: (showProps) => set({ showProps }),
  applyPreset: (p) =>
    set({
      deckWidth: clamp(p.deckWidth, DECK_MIN_WIDTH, DECK_MAX_WIDTH),
      deckDepth: clamp(p.deckDepth, DECK_MIN_DEPTH, DECK_MAX_DEPTH),
    }),
  reset: () => set({ ...INITIAL }),
}));
