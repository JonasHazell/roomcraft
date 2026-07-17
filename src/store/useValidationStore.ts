import { create } from 'zustand';
import type { Point } from '../types';
import { runValidation, type ValidationReport } from '../lib/validation/engine';
import { useDesignStore } from './useDesignStore';
import { useUiStore } from './useUiStore';

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
//
// One exception: while a furniture piece is being dragged or rotated,
// `moveFurniture`/`updateFurniture` fire on every pointer-move frame, and
// re-running the whole rule catalog (with its 10 cm-grid flood-fills)
// synchronously per frame risks visible jank on the mid/low-power phones
// MOBILE-FIRST.md treats as primary. So during a live gesture (the UI store's
// `draggingId` is set, the same flag that gates OrbitControls) we defer: mark
// the report dirty and skip the per-frame run, then validate exactly once when
// the gesture ends, so the score and panel are fully current the instant the
// drag completes.
let dirtyDuringDrag = false;

useDesignStore.subscribe((state, prev) => {
  if (state.design === prev.design) return;
  if (useUiStore.getState().draggingId !== null) {
    dirtyDuringDrag = true;
    return;
  }
  useValidationStore.getState().validate();
});

// When a drag/rotate gesture ends, run the single deferred validation so no
// stale result survives the gesture.
useUiStore.subscribe((state, prev) => {
  if (prev.draggingId !== null && state.draggingId === null && dirtyDuringDrag) {
    dirtyDuringDrag = false;
    useValidationStore.getState().validate();
  }
});
