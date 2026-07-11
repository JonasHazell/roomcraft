import { useMemo, useReducer } from 'react';
import type { Point } from '../../types';
import { dist, foldsBack, pointsEqual } from '../../lib/polygon';

export type PlanTool = 'select' | 'exterior' | 'interior';

/** The floor-plan drawing UI state: the active tool and the in-progress outline. */
export interface DraftState {
  tool: PlanTool;
  /** Points placed so far in the current draw (exterior outline or interior chain). */
  draft: Point[];
  /**
   * Points removed by {@link PlanDraft.undo}, newest last, available to re-place
   * with {@link PlanDraft.redo}. Cleared the moment a fresh point is placed.
   */
  redo: Point[];
  /** The snapped cursor preview point. */
  hover: Point | null;
  /** Corner the cursor snapped to, for the guide line. */
  guide: Point | null;
  /** True when the next click would close the exterior outline. */
  closable: boolean;
  /**
   * Index of the already-placed draft edge picked for exact-length editing, or
   * null. Edge `i` runs from `draft[i]` to `draft[i + 1]`. Lets a wall's length be
   * corrected mid-draw — before the outline is closed — by resizing that segment.
   */
  selectedEdge: number | null;
  error: string | null;
}

type DraftAction =
  | { type: 'setTool'; tool: PlanTool }
  | { type: 'place'; point: Point }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'hover'; point: Point | null; guide: Point | null; closable: boolean }
  | { type: 'clearHover' }
  | { type: 'cancel' }
  | { type: 'error'; message: string | null }
  | { type: 'selectEdge'; index: number | null }
  | { type: 'resizeEdge'; index: number; length: number }
  | { type: 'committed' };

const CLEARED = {
  draft: [] as Point[],
  redo: [] as Point[],
  error: null,
  closable: false,
  guide: null,
  hover: null,
  selectedEdge: null,
};

/** Rounds away floating point noise to mm precision, matching the editor's snap. */
const round = (v: number) => Math.round(v * 1000) / 1000;

export function reducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'setTool':
      return { ...state, ...CLEARED, tool: action.tool };
    case 'committed':
      return { ...state, ...CLEARED, tool: 'select' };
    case 'cancel':
      return { ...state, ...CLEARED };
    case 'place': {
      const { draft } = state;
      const last = draft[draft.length - 1];
      if (last && pointsEqual(last, action.point)) return state;
      // Reject an edge that folds straight back along the previous edge.
      if (draft.length >= 2 && foldsBack(draft[draft.length - 2], last, action.point)) return state;
      // Placing a new point commits to this branch, so the redo trail is dropped;
      // it also resumes drawing, so any edge picked for length editing is released.
      return { ...state, draft: [...draft, action.point], redo: [], error: null, selectedEdge: null };
    }
    case 'undo': {
      const { draft } = state;
      if (draft.length === 0) return state;
      const removed = draft[draft.length - 1];
      // The cursor preview belonged to the point being removed, so clear it too.
      return {
        ...state,
        draft: draft.slice(0, -1),
        redo: [...state.redo, removed],
        hover: null,
        guide: null,
        closable: false,
        selectedEdge: null,
      };
    }
    case 'redo': {
      const { redo } = state;
      if (redo.length === 0) return state;
      // Re-placing points already drawn: the geometry was valid, so skip the guards.
      return {
        ...state,
        draft: [...state.draft, redo[redo.length - 1]],
        redo: redo.slice(0, -1),
        error: null,
        selectedEdge: null,
      };
    }
    case 'selectEdge': {
      // Only accept a real edge (two consecutive placed points); anything else clears.
      const { draft } = state;
      const index =
        action.index !== null && action.index >= 0 && action.index + 1 < draft.length
          ? action.index
          : null;
      return { ...state, selectedEdge: index };
    }
    case 'resizeEdge': {
      // Set edge `index` to exactly `length` metres by moving its far endpoint
      // along the edge's own direction and rigidly shifting every later point by
      // the same delta — so the rest of the outline keeps its shape and angles.
      const { draft } = state;
      const i = action.index;
      if (i < 0 || i + 1 >= draft.length || action.length <= 0) return state;
      const a = draft[i];
      const b = draft[i + 1];
      const len = dist(a, b);
      if (len < 1e-9) return state;
      const nb = {
        x: round(a.x + ((b.x - a.x) / len) * action.length),
        z: round(a.z + ((b.z - a.z) / len) * action.length),
      };
      const dx = nb.x - b.x;
      const dz = nb.z - b.z;
      const next = draft.map((p, idx) =>
        idx <= i ? p : { x: round(p.x + dx), z: round(p.z + dz) },
      );
      return { ...state, draft: next };
    }
    case 'hover':
      return { ...state, hover: action.point, guide: action.guide, closable: action.closable };
    case 'clearHover':
      return { ...state, hover: null, guide: null };
    case 'error':
      return { ...state, error: action.message };
  }
}

export interface PlanDraft {
  state: DraftState;
  setTool: (tool: PlanTool) => void;
  /** Places the next corner/point of the current draw (exterior outline or interior chain). */
  place: (point: Point) => void;
  /** Removes the last placed point, keeping it for {@link redo}. */
  undo: () => void;
  /** Re-places the most recently undone point. */
  redo: () => void;
  hover: (point: Point | null, guide: Point | null, closable: boolean) => void;
  clearHover: () => void;
  cancel: () => void;
  setError: (message: string | null) => void;
  /** Picks an already-placed draft edge for exact-length editing (null clears it). */
  selectEdge: (index: number | null) => void;
  /** Sets the selected/other draft edge to an exact length (metres), mid-draw. */
  resizeEdge: (index: number, length: number) => void;
  committed: () => void;
}

/** Manages the floor-plan drawing state machine (tool + in-progress outline). */
export function usePlanDraft(initialTool: PlanTool): PlanDraft {
  const [state, dispatch] = useReducer(reducer, {
    tool: initialTool,
    draft: [],
    redo: [],
    hover: null,
    guide: null,
    closable: false,
    selectedEdge: null,
    error: null,
  });

  return useMemo(
    () => ({
      state,
      setTool: (tool) => dispatch({ type: 'setTool', tool }),
      place: (point) => dispatch({ type: 'place', point }),
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      hover: (point, guide, closable) => dispatch({ type: 'hover', point, guide, closable }),
      clearHover: () => dispatch({ type: 'clearHover' }),
      cancel: () => dispatch({ type: 'cancel' }),
      setError: (message) => dispatch({ type: 'error', message }),
      selectEdge: (index) => dispatch({ type: 'selectEdge', index }),
      resizeEdge: (index, length) => dispatch({ type: 'resizeEdge', index, length }),
      committed: () => dispatch({ type: 'committed' }),
    }),
    [state],
  );
}
