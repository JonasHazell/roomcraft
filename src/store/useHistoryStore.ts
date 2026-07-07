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

/** Undo/redo stacks for a single variation (a room's furnishing proposal). */
interface Stack {
  past: Snapshot[];
  future: Snapshot[];
}

/** How many steps back the user can go; older ones drop off the bottom. */
const LIMIT = 100;

/**
 * The variation a design belongs to: its room id plus active proposal id. History
 * is scoped per variation so switching proposal/room shows only that variation's
 * steps. This is the one place that encodes the room/proposal model.
 */
function keyFor(design: Design): string {
  return `${design.id} ${design.activeProposalId}`;
}

/**
 * All mutable history state, encapsulated in one controller instead of scattered
 * module-level `let`s. `clear()` recreates it wholesale (e.g. after loading a
 * different project). The only knowledge of the design store's shape lives in
 * {@link snapshot}/{@link applySnapshot}.
 */
function createController() {
  /** One undo/redo stack per variation key. */
  const stacks = new Map<string, Stack>();
  /** True while undo()/redo() restores a snapshot, so the subscription ignores it. */
  let applying = false;
  /** True between beginBatch()/endBatch() — e.g. for the duration of a drag. */
  let batching = false;
  /** Whether the running batch has already captured its "before" snapshot. */
  let batchCaptured = false;

  /** The stack for a variation key, created empty on first use. */
  const stackFor = (key: string): Stack => {
    let stack = stacks.get(key);
    if (!stack) {
      stack = { past: [], future: [] };
      stacks.set(key, stack);
    }
    return stack;
  };

  /** The current live document as a snapshot. */
  const snapshot = (): Snapshot => {
    const { project, design } = useDesignStore.getState();
    return { project, design };
  };

  /**
   * Restores a snapshot as the live document. The snapshot's design predates any
   * proposals created after it, so the *current* proposal list is kept — only the
   * active variation's own content rolls back. Without this, undoing a step older
   * than a sibling proposal would wipe that proposal out.
   */
  const applySnapshot = (snap: Snapshot) => {
    const cur = useDesignStore.getState();
    applying = true;
    useDesignStore.setState({
      project: snap.project,
      design: { ...snap.design, proposals: cur.design.proposals },
    });
    applying = false;
    // A restored state may no longer contain the selected piece/wall.
    useUiStore.getState().select(null);
  };

  return {
    stackFor,
    snapshot,
    applySnapshot,
    isApplying: () => applying,
    isBatching: () => batching,
    /** Records a step for `prev`, unless a running batch already captured one. */
    recordStep: (key: string, prev: Snapshot) => {
      const stack = stackFor(key);
      if (batching) {
        if (batchCaptured) return;
        batchCaptured = true;
      }
      stack.past.push(prev);
      if (stack.past.length > LIMIT) stack.past.shift();
      stack.future = [];
    },
    beginBatch: () => {
      batching = true;
      batchCaptured = false;
    },
    endBatch: () => {
      batching = false;
      batchCaptured = false;
    },
    /**
     * Rolls the running batch back to the state it started from and drops it, so a
     * cancelled live edit leaves no trace (and no redo entry). No-op if the batch
     * never recorded a change. Returns whether anything was rolled back.
     */
    cancelBatch: () => {
      let rolledBack = false;
      if (batching && batchCaptured) {
        const stack = stackFor(keyFor(useDesignStore.getState().design));
        const before = stack.past.pop();
        if (before) {
          applySnapshot(before);
          rolledBack = true;
        }
      }
      batching = false;
      batchCaptured = false;
      return rolledBack;
    },
  };
}

let controller = createController();

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
  /** Rolls back and discards the running batch (a cancelled live edit). */
  cancelBatch: () => void;
}

/** Publishes canUndo/canRedo for the currently active variation. */
function syncFlags() {
  const { past, future } = controller.stackFor(keyFor(useDesignStore.getState().design));
  useHistoryStore.setState({ canUndo: past.length > 0, canRedo: future.length > 0 });
}

export const useHistoryStore = create<HistoryState>(() => ({
  canUndo: false,
  canRedo: false,

  undo: () => {
    const stack = controller.stackFor(keyFor(useDesignStore.getState().design));
    if (stack.past.length === 0) return;
    const prev = stack.past.pop() as Snapshot;
    stack.future.push(controller.snapshot());
    controller.applySnapshot(prev);
    syncFlags();
  },

  redo: () => {
    const stack = controller.stackFor(keyFor(useDesignStore.getState().design));
    if (stack.future.length === 0) return;
    const next = stack.future.pop() as Snapshot;
    stack.past.push(controller.snapshot());
    controller.applySnapshot(next);
    syncFlags();
  },

  clear: () => {
    controller = createController();
    syncFlags();
  },

  beginBatch: () => controller.beginBatch(),
  endBatch: () => controller.endBatch(),
  cancelBatch: () => {
    controller.cancelBatch();
    syncFlags();
  },
}));

// Record a step whenever the document (the project or the live room) changes.
// Selection, drag flags and view state live in other stores and are never
// recorded. Runs synchronously after every design-store change; hydration on
// boot happens before this module subscribes, so it never records a step.
useDesignStore.subscribe((state, prev) => {
  if (state.project === prev.project && state.design === prev.design) return;
  if (controller.isApplying()) return; // undo/redo restoring a snapshot — not a new step

  // Switching room or proposal moves between variations rather than editing one.
  // That isn't an undoable step; it just makes another variation's stack active,
  // so refresh the flags for it and record nothing.
  if (keyFor(prev.design) !== keyFor(state.design)) {
    syncFlags();
    return;
  }

  controller.recordStep(keyFor(prev.design), { project: prev.project, design: prev.design });
  syncFlags();
});
