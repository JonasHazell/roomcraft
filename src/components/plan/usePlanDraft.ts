import { useMemo, useReducer } from 'react';
import type { Point } from '../../types';
import { foldsBack, pointsEqual } from '../../lib/polygon';

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
  | { type: 'committed' };

const CLEARED = {
  draft: [] as Point[],
  redo: [] as Point[],
  error: null,
  closable: false,
  guide: null,
  hover: null,
};

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
      // Placing a new point commits to this branch, so the redo trail is dropped.
      return { ...state, draft: [...draft, action.point], redo: [], error: null };
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
      };
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
      committed: () => dispatch({ type: 'committed' }),
    }),
    [state],
  );
}
