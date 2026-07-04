import { create } from 'zustand';
import type { Point } from '../types';
import { runValidation, type ValidationReport } from '../lib/validation/engine';
import { useDesignStore } from './useDesignStore';

export interface ValidationHighlight {
  /** Key so the same row in the list can be toggled. */
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
  /** Toggles: clicking an already highlighted row clears the highlight. */
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
    // Refresh an already displayed report immediately with the new setting.
    if (get().report) get().validate();
  },

  setHighlight: (highlight) => set({ highlight }),

  toggleHighlight: (h) =>
    set({ highlight: get().highlight?.key === h.key ? null : h }),
}));
