import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { SCHEMA_VERSION } from '../types';
import { parseWorkspaceSafe } from '../lib/persistence';
import { safeSetItem } from '../lib/safeStorage';
import {
  activeOrPlaceholder,
  activeProject,
  createEmptyWorkspace,
  syncedWorkspace,
  type DesignSet,
  type DesignState,
} from './designModel';
import { createRoomSlice } from './slices/roomSlice';
import { createPlanSlice } from './slices/planSlice';
import { createFurnitureSlice } from './slices/furnitureSlice';
import { createProposalSlice } from './slices/proposalSlice';
import { createDocumentSlice } from './slices/documentSlice';

// The store is split into focused slices (room, plan, furniture, proposal,
// document, home) that all read/write the shared { workspace, project, design }
// live state via get(); see designModel.ts for the state shape and the shared
// helpers.
export {
  createDefaultRoom,
  createDefaultProject,
  createEmptyRoom,
  createEmptyProject,
  createEmptyWorkspace,
  type DesignState,
  type FurniturePatch,
} from './designModel';

const bootWorkspace = createEmptyWorkspace();
const bootProject = activeProject(bootWorkspace);

// A `setItem` failure (quota exceeded, or Safari Private Browsing where it
// throws unconditionally) would otherwise propagate straight out of the store
// mutation that triggered it, crashing to the app-wide error boundary and
// losing the very edit that caused it. `safeSetItem` catches that case; the
// edit stays in memory (this only guards the write to disk), and
// `useStorageStatus` drives an honest, non-blocking notice.
//
// `localStorage` is read here (not only inside the closures below) so that
// `createJSONStorage`'s own try/catch still treats a *fully missing*
// `localStorage` (SSR, this repo's Node-based test environment) as "no
// storage" exactly as before — this wrapper only guards the browser case
// where `localStorage` exists but a write throws.
function safeLocalStorage(): StateStorage {
  const raw = localStorage;
  return {
    getItem: (name) => raw.getItem(name),
    setItem: (name, value) => safeSetItem(name, value),
    removeItem: (name) => raw.removeItem(name),
  };
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => {
      return {
        workspace: bootWorkspace,
        project: bootProject,
        design: activeOrPlaceholder(bootProject),
        ...createRoomSlice(set as DesignSet, get),
        ...createPlanSlice(set as DesignSet, get),
        ...createFurnitureSlice(set as DesignSet, get),
        ...createProposalSlice(set as DesignSet, get),
        ...createDocumentSlice(set as DesignSet, get),
      };
    },
    {
      name: 'roomcraft:current',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(safeLocalStorage),
      // Only the workspace (every home + which is active) is persisted; the live
      // `project`/`design` are rebuilt from it as the active home/room on
      // rehydrate (see merge). The active home/room are synced back into the
      // workspace first so the stored snapshot matches the screen.
      partialize: (s) => ({ workspace: syncedWorkspace(s.workspace, s.project, s.design) }),
      // Older blobs (a single project, a bare design, zustand versions < 4) are
      // routed through the same zod+migration path as import — including the
      // pre-#382 shape with no `workspace` at all, where the one project becomes
      // the workspace's first home (see `parseWorkspace` in lib/persistence.ts).
      // Broken data falls back to a fresh empty workspace instead of crashing.
      migrate: (persisted) => {
        return { workspace: parseWorkspaceSafe(persisted) ?? createEmptyWorkspace() };
      },
      // `project`/`design` aren't persisted, so reconstruct them from the
      // (re-validated) workspace as the active home/room on every rehydrate.
      // `persisted` is the raw top-level state either way — migrated (already
      // `{ workspace }`) or, when the version matched so migrate was skipped,
      // straight from storage — and `parseWorkspace` itself knows how to find
      // the workspace (or fall back to the legacy shape) from that top level,
      // so it must NOT be unwrapped again here.
      merge: (persisted, current) => {
        const workspace = parseWorkspaceSafe(persisted) ?? current.workspace;
        const project = activeProject(workspace);
        return { ...current, workspace, project, design: activeOrPlaceholder(project) };
      },
    },
  ),
);
