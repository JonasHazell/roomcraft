import { clampFurniture } from '../../lib/collision';
import { floorPolygon } from '../../lib/polygon';
import {
  clampOpeningIn,
  cloneRoom,
  createDefaultRoom,
  createEmptyRoom,
  nextRoomCopyName,
  nextRoomName,
  syncActiveWorkspace,
  syncedProject,
  touch,
  type DesignGet,
  type DesignSet,
  type RoomActions,
} from '../designModel';

/**
 * Room- and project-level actions: create, duplicate, switch, rename and
 * remove rooms within the active home. Every branch that replaces `project`
 * also folds it back into `workspace.projects` via {@link syncActiveWorkspace}
 * (see `lib/persistence.ts`), so the "My homes" switcher — which reads
 * `workspace.projects` directly — never shows stale data for the active home
 * once its room list changes.
 */
export function createRoomSlice(set: DesignSet, get: DesignGet): RoomActions {
  return {
    setProjectName: (name) => {
      const project = { ...get().project, name, updatedAt: new Date().toISOString() };
      set({ workspace: syncActiveWorkspace(get().workspace, project), project });
    },

    addRoom: ({ name, copyCurrent }) => {
      // Snapshot the current room into the project before adding a sibling.
      const project = syncedProject(get().project, get().design);
      const room = copyCurrent
        ? cloneRoom(get().design, name?.trim() || nextRoomName(project.rooms))
        : createDefaultRoom(name?.trim() || nextRoomName(project.rooms));
      const next = { ...project, rooms: [...project.rooms, room], activeRoomId: room.id };
      set({
        workspace: syncActiveWorkspace(get().workspace, next),
        project: next,
        design: room,
      });
      return room.id;
    },

    createRoom: (name) => {
      const project = syncedProject(get().project, get().design);
      const room = createEmptyRoom(name?.trim() || nextRoomName(project.rooms));
      const next = { ...project, rooms: [...project.rooms, room], activeRoomId: room.id };
      set({
        workspace: syncActiveWorkspace(get().workspace, next),
        project: next,
        design: room,
      });
      return room.id;
    },

    exitToLobby: () => {
      // Fold the on-screen room back into the project (and the project into the
      // workspace) so the lobby's room list and "My homes" switcher are current.
      const project = syncedProject(get().project, get().design);
      set({ workspace: syncActiveWorkspace(get().workspace, project), project });
    },

    discardRoomIfUndrawn: (id) => {
      // Fold the on-screen room back in first (as exitToLobby does), so a room
      // we keep has a current card.
      const cur = get();
      const project = syncedProject(cur.project, cur.design);
      const room = project.rooms.find((r) => r.id === id);
      const drawn = !!room && room.walls.some((w) => w.kind === 'exterior');
      if (!room || drawn) {
        set({ workspace: syncActiveWorkspace(cur.workspace, project), project });
        return;
      }
      // Undrawn: drop it. If it was active, fall back to the previous room (or an
      // empty project), mirroring removeRoom.
      const idx = project.rooms.findIndex((r) => r.id === id);
      const rooms = project.rooms.filter((r) => r.id !== id);
      if (id !== project.activeRoomId) {
        const next = { ...project, rooms };
        set({ workspace: syncActiveWorkspace(cur.workspace, next), project: next });
        return;
      }
      const nextActive = rooms[Math.max(0, idx - 1)];
      const next = { ...project, rooms, activeRoomId: nextActive?.id ?? '' };
      set({
        workspace: syncActiveWorkspace(cur.workspace, next),
        project: next,
        design: nextActive ?? createEmptyRoom(),
      });
    },

    duplicateRoom: (id) => {
      const project = syncedProject(get().project, get().design);
      const src = project.rooms.find((r) => r.id === id);
      if (!src) return '';
      const copy = cloneRoom(src, nextRoomCopyName(project.rooms, src.name));
      // The copy is added but not activated — the user stays in the lobby.
      const next = { ...project, rooms: [...project.rooms, copy] };
      set({ workspace: syncActiveWorkspace(get().workspace, next), project: next });
      return copy.id;
    },

    setActiveRoom: (id) => {
      const cur = get();
      if (id === cur.project.activeRoomId) return;
      // Persist the on-screen room before swapping in the target's.
      const project = syncedProject(cur.project, cur.design);
      const target = project.rooms.find((r) => r.id === id);
      if (!target) return;
      const next = { ...project, activeRoomId: id };
      set({ workspace: syncActiveWorkspace(cur.workspace, next), project: next, design: target });
    },

    renameRoom: (id, name) => {
      const { workspace, project, design } = get();
      const trimmed = name.trim() || nextRoomName(project.rooms.filter((r) => r.id !== id));
      const next = {
        ...project,
        rooms: project.rooms.map((r) => (r.id === id ? { ...r, name: trimmed } : r)),
      };
      set({
        workspace: syncActiveWorkspace(workspace, next),
        project: next,
        design: design.id === id ? { ...design, name: trimmed } : design,
      });
    },

    removeRoom: (id) => {
      const cur = get();
      const project = syncedProject(cur.project, cur.design);
      const idx = project.rooms.findIndex((r) => r.id === id);
      if (idx === -1) return;
      const rooms = project.rooms.filter((r) => r.id !== id);
      if (id !== project.activeRoomId) {
        const next = { ...project, rooms };
        set({ workspace: syncActiveWorkspace(cur.workspace, next), project: next });
        return;
      }
      // Removing the active room: fall back to the previous room, or leave the
      // home empty (the lobby shows its create-first-room state).
      const nextActive = rooms[Math.max(0, idx - 1)];
      const next = { ...project, rooms, activeRoomId: nextActive?.id ?? '' };
      set({
        workspace: syncActiveWorkspace(cur.workspace, next),
        project: next,
        design: nextActive ?? createEmptyRoom(),
      });
    },

    setName: (name) => set({ design: touch({ ...get().design, name }) }),

    setRoom: (patch) => {
      const d = get().design;
      const room = { ...d.room, ...patch };
      const next = { ...d, room };
      const poly = floorPolygon(next.walls);
      // Re-clamp the openings and furniture so a lowered ceiling never leaves
      // anything (a window, a tall wardrobe) poking above it.
      set({
        design: touch({
          ...next,
          openings: next.openings.map((o) => clampOpeningIn(next, o)),
          furniture: next.furniture.map((f) => clampFurniture(f, poly, room.height)),
        }),
      });
    },

    setColors: (patch) => {
      const d = get().design;
      set({ design: touch({ ...d, ...patch }) });
    },
  };
}
