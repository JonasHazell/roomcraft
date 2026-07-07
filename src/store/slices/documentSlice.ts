import { clampFurniture } from '../../lib/collision';
import { floorPolygon } from '../../lib/polygon';
import { activeRoom, normalizeProject } from '../../lib/persistence';
import {
  activeOrPlaceholder,
  clampOpeningIn,
  createDefaultProject,
  type DesignGet,
  type DesignSet,
  type DocumentActions,
} from '../designModel';

/** Whole-document actions: load an imported/parsed project or start a fresh one. */
export function createDocumentSlice(set: DesignSet, _get: DesignGet): DocumentActions {
  return {
    loadProject: (loaded) => {
      // Defensive re-clamping and normalization, e.g. after importing an edited file.
      const normalized = normalizeProject(loaded);
      const rooms = normalized.rooms.map((r) => {
        const poly = floorPolygon(r.walls);
        return {
          ...r,
          openings: r.openings.map((o) => clampOpeningIn(r, o)),
          furniture: r.furniture.map((f) => clampFurniture(f, poly)),
          proposals: r.proposals.map((p) => ({
            ...p,
            furniture: p.furniture.map((f) => clampFurniture(f, poly)),
          })),
        };
      });
      const project = { ...normalized, rooms };
      set({ project, design: activeOrPlaceholder(project) });
    },

    newProject: () => {
      const project = createDefaultProject();
      set({ project, design: activeRoom(project) });
    },
  };
}
