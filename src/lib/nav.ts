import { useDesignStore } from '../store/useDesignStore';
import { useUiStore } from '../store/useUiStore';
import { useHistoryStore } from '../store/useHistoryStore';

/**
 * Navigation between the app's three surfaces (lobby, plan, furnish). Each
 * transition snapshots/activates the right room, clears the per-room undo
 * history, drops any selection and flips the view. Kept here — rather than in a
 * store — so no store needs to import another, and so the lobby and the room
 * chrome share exactly the same transitions.
 */

/** Open an existing room in the 3D furnishing view. */
export function openRoomToFurnish(id: string): void {
  useDesignStore.getState().setActiveRoom(id);
  useHistoryStore.getState().clear();
  useUiStore.getState().select(null);
  useUiStore.getState().setPendingRoomId(null);
  useUiStore.getState().setAppView('furnish');
}

/** Open an existing room's floor plan for editing. */
export function openRoomToPlan(id: string): void {
  useDesignStore.getState().setActiveRoom(id);
  useHistoryStore.getState().clear();
  useUiStore.getState().select(null);
  // A room that has never been drawn opens with the exterior tool armed so the
  // user can start sketching its outline straight away, matching "New room"; an
  // already-drawn plan opens in select mode.
  const undrawn = !useDesignStore.getState().design.walls.some((w) => w.kind === 'exterior');
  useUiStore.getState().setPlanStartTool(undrawn ? 'exterior' : 'select');
  // An existing room is never provisional — leaving keeps it even if undrawn.
  useUiStore.getState().setPendingRoomId(null);
  useUiStore.getState().setAppView('plan');
}

/**
 * Start the guided "New room" wizard. Creates the room up front (so every step
 * edits the live design) and marks it provisional, then opens on the naming
 * step. Cancelling the wizard discards this room; finishing it keeps the room
 * and drops the user into the 3D view.
 */
export function startNewRoomWizard(): string {
  const id = useDesignStore.getState().createRoom();
  useHistoryStore.getState().clear();
  useUiStore.getState().select(null);
  useUiStore.getState().setPendingRoomId(id);
  useUiStore.getState().setWizardStep('name');
  // Keep the app in the "plan" surface so in-room shortcuts (undo/redo) work
  // while the wizard drives the floor-plan steps; the wizard chrome is what
  // actually renders (see App.tsx).
  useUiStore.getState().setAppView('plan');
  return id;
}

/**
 * Finish the wizard: keep the freshly built room and open it in the 3D
 * furnishing view, ready to lay out furniture.
 */
export function finishNewRoomWizard(): void {
  const id = useDesignStore.getState().design.id;
  useUiStore.getState().setWizardStep(null);
  useUiStore.getState().setPendingRoomId(null);
  openRoomToFurnish(id);
}

/**
 * Abandon the wizard: discard the provisional room entirely (the flow was never
 * completed) and return to the lobby.
 */
export function cancelNewRoomWizard(): void {
  const pendingId = useUiStore.getState().pendingRoomId;
  if (pendingId) useDesignStore.getState().removeRoom(pendingId);
  else useDesignStore.getState().exitToLobby();
  useUiStore.getState().setPendingRoomId(null);
  useUiStore.getState().setWizardStep(null);
  useHistoryStore.getState().clear();
  useUiStore.getState().select(null);
  useUiStore.getState().setAppView('lobby');
}

/** Return to the lobby, folding the on-screen room back into the workspace. */
export function backToLobby(): void {
  const pendingId = useUiStore.getState().pendingRoomId;
  if (pendingId) {
    // A provisional "New room": keep it only if it was drawn, otherwise drop it.
    useDesignStore.getState().discardRoomIfUndrawn(pendingId);
    useUiStore.getState().setPendingRoomId(null);
  } else {
    useDesignStore.getState().exitToLobby();
  }
  useHistoryStore.getState().clear();
  useUiStore.getState().select(null);
  useUiStore.getState().setAppView('lobby');
}
