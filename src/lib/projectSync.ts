/**
 * Syncs a signed-in user's project (the whole rooms list) to their account, so
 * signing in on another device picks up where they left off — see issue #369.
 * This is purely additive: `localStorage` (via `useDesignStore`'s `persist`
 * middleware) stays the source of truth while signed out, exactly as before.
 * While signed in:
 *  - sign-in (including an already-signed-in reload) loads the account's saved
 *    project, if it has one — otherwise the current local project becomes the
 *    account's first synced copy;
 *  - every edit after that is pushed back to the account, debounced so a drag
 *    or a burst of edits doesn't fire one request per frame.
 * Last-write-wins, no merge — the same semantics the rest of the app's local
 * persistence already has.
 */
import { useAuthStore } from '../store/useAuthStore';
import { useDesignStore } from '../store/useDesignStore';
import { syncedProject } from '../store/designModel';
import { parseProjectSafe } from './persistence';
import { apiGetProject, apiSaveProject, RoomCapExceededError } from './authApi';

const SYNC_DEBOUNCE_MS = 1500;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
// Set right before a server-loaded project is applied, so the design-store
// change that load itself causes doesn't get pushed straight back up.
let suppressNextPush = false;

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushProject, SYNC_DEBOUNCE_MS);
}

function pushProject() {
  pushTimer = null;
  if (!useAuthStore.getState().user) return;
  const { project, design } = useDesignStore.getState();
  void apiSaveProject(syncedProject(project, design))
    .then(() => useAuthStore.getState().setRoomCapLimit(null))
    .catch((e) => {
      if (e instanceof RoomCapExceededError) useAuthStore.getState().setRoomCapLimit(e.limit);
      // Any other failure (offline, session expired, server error) is left
      // alone: localStorage already has the authoritative edit, and the next
      // edit's debounced push will simply retry.
    });
}

/** Runs once on sign-in: adopt the account's saved project, or push the local one up. */
async function loadFromAccount() {
  const remote = await apiGetProject();
  if (remote) {
    const project = parseProjectSafe(remote);
    if (project) {
      suppressNextPush = true;
      useDesignStore.getState().loadProject(project);
      return;
    }
  }
  // Nothing saved yet (or it didn't parse) — push the local project up now
  // rather than waiting for the user's next edit.
  pushProject();
}

let initialized = false;

/** Wires sign-in → load and edits → push. Call once at app start. */
export function initProjectSync() {
  if (initialized) return;
  initialized = true;

  useAuthStore.subscribe((state, prev) => {
    if (!prev.user && state.user) {
      void loadFromAccount();
    } else if (prev.user && !state.user) {
      if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
      }
      useAuthStore.getState().setRoomCapLimit(null);
    }
  });

  useDesignStore.subscribe((state, prev) => {
    if (state.project === prev.project && state.design === prev.design) return;
    if (suppressNextPush) {
      suppressNextPush = false;
      return;
    }
    if (!useAuthStore.getState().user) return;
    schedulePush();
  });
}
