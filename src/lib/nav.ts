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
  useUiStore.getState().setAppView('furnish');
}

/** Open an existing room's floor plan for editing. */
export function openRoomToPlan(id: string): void {
  useDesignStore.getState().setActiveRoom(id);
  useHistoryStore.getState().clear();
  useUiStore.getState().select(null);
  useUiStore.getState().setPlanStartTool('select');
  useUiStore.getState().setAppView('plan');
}

/** Create a new, undrawn room and drop straight into drawing its outline. */
export function createRoomAndDraw(): string {
  const id = useDesignStore.getState().createRoom();
  useHistoryStore.getState().clear();
  useUiStore.getState().select(null);
  useUiStore.getState().setPlanStartTool('exterior');
  useUiStore.getState().setAppView('plan');
  return id;
}

/** Return to the lobby, folding the on-screen room back into the workspace. */
export function backToLobby(): void {
  useDesignStore.getState().exitToLobby();
  useHistoryStore.getState().clear();
  useUiStore.getState().select(null);
  useUiStore.getState().setAppView('lobby');
}
