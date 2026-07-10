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
    // Refresh the report immediately with the new setting.
    get().validate();
  },

  setHighlight: (highlight) => set({ highlight }),

  toggleHighlight: (h) =>
    set({ highlight: get().highlight?.key === h.key ? null : h }),
}));

// The room is validated automatically: re-run the rule catalog whenever the
// design changes so the score badge and validation panel are always current
// without any manual "Validate" action. `updatedAt` bumps on every edit.
useDesignStore.subscribe((state, prev) => {
  if (state.design.updatedAt !== prev.design.updatedAt) {
    useValidationStore.getState().validate();
  }
});
