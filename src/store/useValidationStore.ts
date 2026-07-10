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
  highlight: ValidationHighlight | null;
  validate: () => void;
  setHighlight: (h: ValidationHighlight | null) => void;
  /** Toggles: clicking an already highlighted row clears the highlight. */
  toggleHighlight: (h: ValidationHighlight) => void;
}

export const useValidationStore = create<ValidationState>()((set, get) => ({
  report: null,
  highlight: null,

  validate: () => {
    const design = useDesignStore.getState().design;
    set({ report: runValidation(design), highlight: null });
  },

  setHighlight: (highlight) => set({ highlight }),

  toggleHighlight: (h) =>
    set({ highlight: get().highlight?.key === h.key ? null : h }),
}));

// The room is validated automatically: re-run the rule catalog whenever the
// design changes so the score badge and validation panel are always current
// without any manual "Validate" action. Every edit replaces the design with a
// fresh object, so an identity check reliably catches each change — comparing
// the `updatedAt` timestamp would miss two edits that land in the same
// millisecond.
useDesignStore.subscribe((state, prev) => {
  if (state.design !== prev.design) {
    useValidationStore.getState().validate();
  }
});
