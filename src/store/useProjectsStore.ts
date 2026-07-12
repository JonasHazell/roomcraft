import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Project } from '../types';
import { parseProjectSafe } from '../lib/persistence';

/** A lightweight row in the "My projects" list. */
export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: string;
}

interface ProjectsState {
  /** Every project in the workspace, in display order (the active one included). */
  metas: ProjectMeta[];
  /** The project currently open in the editor; its live data is in useDesignStore. */
  activeId: string;
  /**
   * Full data for every INACTIVE project. The active project's data deliberately
   * lives only in useDesignStore (persisted as `roomcraft:current`), never here,
   * so the live editor and the saved copy can never drift out of sync.
   */
  stash: Record<string, Project>;
}

/**
 * The local, account-free "My projects" workspace: a list of named projects the
 * user can switch between. Orchestration that has to touch both this store and
 * the live design store lives in `lib/projects.ts` (the same decoupling nav.ts
 * uses), so neither store imports the other.
 */
export const useProjectsStore = create<ProjectsState>()(
  persist((): ProjectsState => ({ metas: [], activeId: '', stash: {} }), {
    name: 'roomcraft:projects',
    version: 1,
    storage: createJSONStorage(() => localStorage),
    partialize: (s) => ({ metas: s.metas, activeId: s.activeId, stash: s.stash }),
    // Re-validate every stashed project through the same zod path as import, so a
    // corrupt or hand-edited blob drops that one project instead of crashing.
    merge: (persisted, current) => {
      const p = persisted as Partial<ProjectsState> | undefined;
      if (!p) return current;
      const stash: Record<string, Project> = {};
      for (const [id, proj] of Object.entries(p.stash ?? {})) {
        const parsed = parseProjectSafe(proj);
        if (parsed) stash[id] = parsed;
      }
      return {
        ...current,
        metas: Array.isArray(p.metas) ? p.metas : [],
        activeId: typeof p.activeId === 'string' ? p.activeId : '',
        stash,
      };
    },
  }),
);
