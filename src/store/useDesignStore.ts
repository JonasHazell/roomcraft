import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SCHEMA_VERSION } from '../types';
import { parseProjectSafe } from '../lib/persistence';
import {
  activeOrPlaceholder,
  createDefaultProject,
  createEmptyProject,
  syncedProject,
  type DesignSet,
  type DesignState,
} from './designModel';
import { createRoomSlice } from './slices/roomSlice';
import { createPlanSlice } from './slices/planSlice';
import { createFurnitureSlice } from './slices/furnitureSlice';
import { createProposalSlice } from './slices/proposalSlice';
import { createDocumentSlice } from './slices/documentSlice';

// The store is split into focused slices (room, plan, furniture, proposal,
// document) that all read/write the shared { project, design } live state via
// get(); see designModel.ts for the state shape and the shared helpers.
export {
  createDefaultRoom,
  createDefaultProject,
  createEmptyRoom,
  createEmptyProject,
  type DesignState,
  type FurniturePatch,
} from './designModel';

const bootProject = createEmptyProject();

export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => {
      return {
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
      storage: createJSONStorage(() => localStorage),
      // Only the project is persisted; the live `design` is rebuilt from it as
      // the active room on rehydrate (see merge). The active room is synced back
      // into the project first so the stored snapshot matches the screen.
      partialize: (s) => ({ project: syncedProject(s.project, s.design) }),
      // Older blobs (a single design, zustand versions < 4) are routed through
      // the same zod+migration path as import; broken data falls back to the
      // default instead of crashing.
      migrate: (persisted) => {
        const raw = persisted as { project?: unknown; design?: unknown } | undefined;
        const source = raw?.project ?? raw?.design;
        return { project: parseProjectSafe(source) ?? createDefaultProject() };
      },
      // `design` isn't persisted, so reconstruct it from the (re-validated)
      // project as the active room on every rehydrate.
      merge: (persisted, current) => {
        const raw = (persisted as { project?: unknown } | undefined)?.project;
        const project = parseProjectSafe(raw) ?? current.project;
        return { ...current, project, design: activeOrPlaceholder(project) };
      },
    },
  ),
);
