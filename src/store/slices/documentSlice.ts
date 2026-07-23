import { clampFurniture } from '../../lib/collision';
import { floorPolygon } from '../../lib/polygon';
import { normalizeProject } from '../../lib/persistence';
import {
  activeOrPlaceholder,
  clampOpeningIn,
  createDefaultProject,
  createEmptyProject,
  nextHomeName,
  syncActiveWorkspace,
  syncedProject,
  type DesignGet,
  type DesignSet,
  type DocumentActions,
  type HomeActions,
} from '../designModel';

/**
 * Whole-document actions: load an imported/parsed project into the active
 * home, reset to a fresh workspace, and create/switch/rename/remove home
 * projects (#382 — see `types.ts`'s `Workspace`). Local-only: no server sync
 * or accounts integration here, that's #369's separate job.
 */
export function createDocumentSlice(set: DesignSet, get: DesignGet): DocumentActions & HomeActions {
  return {
    loadProject: (loaded) => {
      // Defensive re-clamping and normalization, e.g. after importing an edited file.
      const normalized = normalizeProject(loaded);
      const rooms = normalized.rooms.map((r) => {
        const poly = floorPolygon(r.walls);
        return {
          ...r,
          openings: r.openings.map((o) => clampOpeningIn(r, o)),
          furniture: r.furniture.map((f) => clampFurniture(f, poly, r.room.height)),
          proposals: r.proposals.map((p) => ({
            ...p,
            furniture: p.furniture.map((f) => clampFurniture(f, poly, r.room.height)),
          })),
        };
      });
      const project = { ...normalized, rooms };
      set({
        workspace: syncActiveWorkspace(get().workspace, project),
        project,
        design: activeOrPlaceholder(project),
      });
    },

    newProject: () => {
      const project = createDefaultProject();
      set({
        workspace: { projects: [project], activeProjectId: project.id },
        project,
        design: activeOrPlaceholder(project),
      });
    },

    addHome: (name) => {
      const cur = get();
      const workspace = syncActiveWorkspace(cur.workspace, syncedProject(cur.project, cur.design));
      const home = createEmptyProject(name?.trim() || nextHomeName(workspace.projects));
      const next = { ...workspace, projects: [...workspace.projects, home], activeProjectId: home.id };
      set({ workspace: next, project: home, design: activeOrPlaceholder(home) });
      return home.id;
    },

    setActiveHome: (id) => {
      const cur = get();
      if (id === cur.workspace.activeProjectId) return;
      // Persist the on-screen home before swapping in the target's.
      const workspace = syncActiveWorkspace(cur.workspace, syncedProject(cur.project, cur.design));
      const target = workspace.projects.find((p) => p.id === id);
      if (!target) return;
      set({
        workspace: { ...workspace, activeProjectId: id },
        project: target,
        design: activeOrPlaceholder(target),
      });
    },

    renameHome: (id, name) => {
      const { workspace, project } = get();
      const trimmed = name.trim() || nextHomeName(workspace.projects.filter((p) => p.id !== id));
      const projects = workspace.projects.map((p) => (p.id === id ? { ...p, name: trimmed } : p));
      set({
        workspace: { ...workspace, projects },
        project: project.id === id ? { ...project, name: trimmed } : project,
      });
    },

    removeHome: (id) => {
      const cur = get();
      const workspace = syncActiveWorkspace(cur.workspace, syncedProject(cur.project, cur.design));
      const idx = workspace.projects.findIndex((p) => p.id === id);
      if (idx === -1) return;
      const projects = workspace.projects.filter((p) => p.id !== id);
      if (projects.length === 0) {
        // Always keep at least one home: removing the last one starts a fresh
        // empty one in its place, rather than leaving the workspace with none.
        const fresh = createEmptyProject();
        set({
          workspace: { projects: [fresh], activeProjectId: fresh.id },
          project: fresh,
          design: activeOrPlaceholder(fresh),
        });
        return;
      }
      if (id !== workspace.activeProjectId) {
        set({ workspace: { ...workspace, projects } });
        return;
      }
      const nextActive = projects[Math.max(0, idx - 1)];
      set({
        workspace: { ...workspace, projects, activeProjectId: nextActive.id },
        project: nextActive,
        design: activeOrPlaceholder(nextActive),
      });
    },
  };
}
