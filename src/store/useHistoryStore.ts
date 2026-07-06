import { create } from 'zustand';
import type { Design, Project } from '../types';
import { useDesignStore } from './useDesignStore';
import { useUiStore } from './useUiStore';

/**
 * A restorable point in the document's history: the whole project plus the live
 * room. Every editing action replaces `project`/`design` by reference, so a
 * shallow copy of the two is a complete, cheap snapshot.
 */
interface Snapshot {
  project: Project;
  design: Design;
}

/** How many steps back the user can go; older ones drop off the bottom. */
const LIMIT = 100;

interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  /** Steps back to the previous document state (no-op when there is none). */
  undo: () => void;
  /** Re-applies the last undone step (no-op when there is none). */
  redo: () => void;
  /** Drops all recorded history — e.g. after loading a different project. */
  clear: () => void;
  /**
   * Starts coalescing: every document change until {@link HistoryState.endBatch}
   * folds into a single undo step. Used to record a whole drag as one step
   * instead of one per pointer move.
   */
  beginBatch: () => void;
  endBatch: () => void;
}

let past: Snapshot[] = [];
let future: Snapshot[] = [];
/** True while undo()/redo() restores a snapshot, so the subscription ignores it. */
let applying = false;
/** True between beginBatch()/endBatch() — e.g. for the duration of a drag. */
let batching = false;
/** Whether the running batch has already captured its "before" snapshot. */
let batchCaptured = false;

function syncFlags() {
  useHistoryStore.setState({ canUndo: past.length > 0, canRedo: future.length > 0 });
}

export const useHistoryStore = create<HistoryState>(() => ({
  canUndo: false,
  canRedo: false,

  undo: () => {
    if (past.length === 0) return;
    const cur = useDesignStore.getState();
    const prev = past.pop() as Snapshot;
    future.push({ project: cur.project, design: cur.design });
    applying = true;
    useDesignStore.setState({ project: prev.project, design: prev.design });
    applying = false;
    // A restored state may no longer contain the selected piece/wall.
    useUiStore.getState().select(null);
    syncFlags();
  },

  redo: () => {
    if (future.length === 0) return;
    const cur = useDesignStore.getState();
    const next = future.pop() as Snapshot;
    past.push({ project: cur.project, design: cur.design });
    applying = true;
    useDesignStore.setState({ project: next.project, design: next.design });
    applying = false;
    useUiStore.getState().select(null);
    syncFlags();
  },

  clear: () => {
    past = [];
    future = [];
    batching = false;
    batchCaptured = false;
    syncFlags();
  },

  beginBatch: () => {
    batching = true;
    batchCaptured = false;
  },

  endBatch: () => {
    batching = false;
    batchCaptured = false;
  },
}));

// Record a step whenever the document (the project or the live room) changes.
// Selection, drag flags and view state live in other stores and are never
// recorded. Runs synchronously after every design-store change; hydration on
// boot happens before this module subscribes, so it never records a step.
useDesignStore.subscribe((state, prev) => {
  if (state.project === prev.project && state.design === prev.design) return;
  if (applying) return; // undo/redo restoring a snapshot — not a new step

  if (batching) {
    // Fold every change until endBatch() into the first captured step.
    if (batchCaptured) return;
    batchCaptured = true;
  }

  past.push({ project: prev.project, design: prev.design });
  if (past.length > LIMIT) past.shift();
  future = [];
  syncFlags();
});
