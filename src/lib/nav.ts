import { useDesignStore } from '../store/useDesignStore';
import { useUiStore } from '../store/useUiStore';
import { useHistoryStore } from '../store/useHistoryStore';
import type { Point } from '../types';

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

/**
 * Create a new room pre-filled with a template outline, then open its floor plan
 * for editing. The walls are drawn straight away (so the room is never
 * provisional) but stay fully editable, exactly like a hand-drawn outline.
 */
export function createRoomFromTemplate(points: Point[]): string {
  const id = useDesignStore.getState().createRoom();
  useDesignStore.getState().commitExteriorPolygon(points);
  useHistoryStore.getState().clear();
  useUiStore.getState().select(null);
  // The outline already exists, so open in select mode and keep the room even if
  // the user leaves without touching it.
  useUiStore.getState().setPlanStartTool('select');
  useUiStore.getState().setPendingRoomId(null);
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

/**
 * Finish the plan editor's "Done" action. A brand-new room — still carrying the
 * `pendingRoomId` set by `createRoomAndDraw` — that now has a drawn outline hands
 * off straight into furnishing it, so create → draw → furnish doesn't make the
 * user land on the lobby only to tap the same room card again. A pending room
 * left undrawn still falls back to `backToLobby`'s discard-if-abandoned
 * safeguard, and an already-existing room being re-edited (never pending, e.g.
 * via "Edit plan") keeps returning to the lobby as before, since the user may
 * have arrived there from elsewhere.
 */
export function finishPlanEditing(): void {
  const pendingId = useUiStore.getState().pendingRoomId;
  const drawn = useDesignStore.getState().design.walls.some((w) => w.kind === 'exterior');
  if (pendingId && drawn) {
    useUiStore.getState().setPendingRoomId(null);
    openRoomToFurnish(pendingId);
    return;
  }
  backToLobby();
}
