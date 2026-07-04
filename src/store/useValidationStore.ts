import { create } from 'zustand';
import type { Point } from '../types';
import { runValidation, type ValidationReport } from '../lib/validation/engine';
import { useDesignStore } from './useDesignStore';

export interface ValidationHighlight {
  /** Nyckel för att kunna toggla samma rad i listan. */
  key: string;
  furnitureIds: string[];
  zones: Point[][];
}

interface ValidationState {
  report: ValidationReport | null;
  fengShui: boolean;
  highlight: ValidationHighlight | null;
  validate: () => void;
  setFengShui: (on: boolean) => void;
  setHighlight: (h: ValidationHighlight | null) => void;
  /** Togglar: klick på redan markerad rad släcker markeringen. */
  toggleHighlight: (h: ValidationHighlight) => void;
}

export const useValidationStore = create<ValidationState>()((set, get) => ({
  report: null,
  fengShui: true,
  highlight: null,

  validate: () => {
    const design = useDesignStore.getState().design;
    set({ report: runValidation(design, get().fengShui), highlight: null });
  },

  setFengShui: (fengShui) => {
    set({ fengShui });
    // Uppdatera ett redan visat resultat direkt med det nya läget.
    if (get().report) get().validate();
  },

  setHighlight: (highlight) => set({ highlight }),

  toggleHighlight: (h) =>
    set({ highlight: get().highlight?.key === h.key ? null : h }),
}));
