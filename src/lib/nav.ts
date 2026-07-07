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
  useUiStore.getState().setPlanStartTool('select');
  // An existing room is never provisional — leaving keeps it even if undrawn.
  useUiStore.getState().setPendingRoomId(null);
  useUiStore.getState().setAppView('plan');
}

/** Create a new, undrawn room and drop straight into drawing its outline. */
export function createRoomAndDraw(): string {
  const id = useDesignStore.getState().createRoom();
  useHistoryStore.getState().clear();
  useUiStore.getState().select(null);
  useUiStore.getState().setPlanStartTool('exterior');
  // Remember it as provisional: if the user leaves without drawing an outline,
  // backToLobby discards it so no empty room is left behind.
  useUiStore.getState().setPendingRoomId(id);
  useUiStore.getState().setAppView('plan');
  return id;
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
