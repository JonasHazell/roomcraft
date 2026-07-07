import { useMemo, useReducer } from 'react';
import type { Point } from '../../types';
import { foldsBack, pointsEqual } from '../../lib/polygon';

export type PlanTool = 'select' | 'exterior' | 'interior';

/** The floor-plan drawing UI state: the active tool and the in-progress outline. */
export interface DraftState {
  tool: PlanTool;
  /** Points placed so far in the current draw (exterior outline or interior chain). */
  draft: Point[];
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
  | { type: 'appendExterior'; point: Point }
  | { type: 'startChain'; point: Point }
  | { type: 'hover'; point: Point | null; guide: Point | null; closable: boolean }
  | { type: 'clearHover' }
  | { type: 'cancel' }
  | { type: 'error'; message: string | null }
  | { type: 'committed' };

const CLEARED = { draft: [] as Point[], error: null, closable: false, guide: null, hover: null };

function reducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'setTool':
      return { ...state, ...CLEARED, tool: action.tool };
    case 'committed':
      return { ...state, ...CLEARED, tool: 'select' };
    case 'cancel':
      return { ...state, ...CLEARED };
    case 'appendExterior': {
      const { draft } = state;
      const last = draft[draft.length - 1];
      if (last && pointsEqual(last, action.point)) return state;
      // Reject an edge that folds straight back along the previous edge.
      if (draft.length >= 2 && foldsBack(draft[draft.length - 2], last, action.point)) return state;
      return { ...state, draft: [...draft, action.point], error: null };
    }
    case 'startChain':
      return { ...state, draft: [action.point] };
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
  appendExterior: (point: Point) => void;
  startChain: (point: Point) => void;
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
    hover: null,
    guide: null,
    closable: false,
    error: null,
  });

  return useMemo(
    () => ({
      state,
      setTool: (tool) => dispatch({ type: 'setTool', tool }),
      appendExterior: (point) => dispatch({ type: 'appendExterior', point }),
      startChain: (point) => dispatch({ type: 'startChain', point }),
      hover: (point, guide, closable) => dispatch({ type: 'hover', point, guide, closable }),
      clearHover: () => dispatch({ type: 'clearHover' }),
      cancel: () => dispatch({ type: 'cancel' }),
      setError: (message) => dispatch({ type: 'error', message }),
      committed: () => dispatch({ type: 'committed' }),
    }),
    [state],
  );
}
