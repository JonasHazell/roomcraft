import {
  clampOpeningIn,
  cloneRoom,
  createDefaultRoom,
  createEmptyRoom,
  nextRoomCopyName,
  nextRoomName,
  syncedProject,
  touch,
  type DesignGet,
  type DesignSet,
  type RoomActions,
} from '../designModel';

/** Room- and project-level actions: create, duplicate, switch, rename and remove rooms. */
export function createRoomSlice(set: DesignSet, get: DesignGet): RoomActions {
  return {
    setProjectName: (name) =>
      set({ project: { ...get().project, name, updatedAt: new Date().toISOString() } }),

    addRoom: ({ name, copyCurrent }) => {
      // Snapshot the current room into the project before adding a sibling.
      const project = syncedProject(get().project, get().design);
      const room = copyCurrent
        ? cloneRoom(get().design, name?.trim() || nextRoomName(project.rooms))
        : createDefaultRoom(name?.trim() || nextRoomName(project.rooms));
      set({
        project: { ...project, rooms: [...project.rooms, room], activeRoomId: room.id },
        design: room,
      });
      return room.id;
    },

    createRoom: (name) => {
      const project = syncedProject(get().project, get().design);
      const room = createEmptyRoom(name?.trim() || nextRoomName(project.rooms));
      set({
        project: { ...project, rooms: [...project.rooms, room], activeRoomId: room.id },
        design: room,
      });
      return room.id;
    },

    exitToLobby: () => {
      // Fold the on-screen room back into the project so its lobby card is current.
      set({ project: syncedProject(get().project, get().design) });
    },

    discardRoomIfUndrawn: (id) => {
      // Fold the on-screen room back in first (as exitToLobby does), so a room
      // we keep has a current card.
      const cur = get();
      const project = syncedProject(cur.project, cur.design);
      const room = project.rooms.find((r) => r.id === id);
      const drawn = !!room && room.walls.some((w) => w.kind === 'exterior');
      if (!room || drawn) {
        set({ project });
        return;
      }
      // Undrawn: drop it. If it was active, fall back to the previous room (or an
      // empty workspace), mirroring removeRoom.
      const idx = project.rooms.findIndex((r) => r.id === id);
      const rooms = project.rooms.filter((r) => r.id !== id);
      if (id !== project.activeRoomId) {
        set({ project: { ...project, rooms } });
        return;
      }
      const nextActive = rooms[Math.max(0, idx - 1)];
      set({
        project: { ...project, rooms, activeRoomId: nextActive?.id ?? '' },
        design: nextActive ?? createEmptyRoom(),
      });
    },

    duplicateRoom: (id) => {
      const project = syncedProject(get().project, get().design);
      const src = project.rooms.find((r) => r.id === id);
      if (!src) return '';
      const copy = cloneRoom(src, nextRoomCopyName(project.rooms, src.name));
      // The copy is added but not activated — the user stays in the lobby.
      set({ project: { ...project, rooms: [...project.rooms, copy] } });
      return copy.id;
    },

    setActiveRoom: (id) => {
      const cur = get();
      if (id === cur.project.activeRoomId) return;
      // Persist the on-screen room before swapping in the target's.
      const project = syncedProject(cur.project, cur.design);
      const target = project.rooms.find((r) => r.id === id);
      if (!target) return;
      set({ project: { ...project, activeRoomId: id }, design: target });
    },

    renameRoom: (id, name) => {
      const { project, design } = get();
      const trimmed = name.trim() || nextRoomName(project.rooms.filter((r) => r.id !== id));
      set({
        project: {
          ...project,
          rooms: project.rooms.map((r) => (r.id === id ? { ...r, name: trimmed } : r)),
        },
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
        set({ project: { ...project, rooms } });
        return;
      }
      // Removing the active room: fall back to the previous room, or leave the
      // workspace empty (the lobby shows its create-first-room state).
      const nextActive = rooms[Math.max(0, idx - 1)];
      set({
        project: { ...project, rooms, activeRoomId: nextActive?.id ?? '' },
        design: nextActive ?? createEmptyRoom(),
      });
    },

    setName: (name) => set({ design: touch({ ...get().design, name }) }),

    setRoom: (patch) => {
      const d = get().design;
      const room = { ...d.room, ...patch };
      const next = { ...d, room };
      // Re-clamp the openings so a lowered ceiling never leaves anything outside.
      set({
        design: touch({
          ...next,
          openings: next.openings.map((o) => clampOpeningIn(next, o)),
        }),
      });
    },

    setColors: (patch) => {
      const d = get().design;
      set({ design: touch({ ...d, ...patch }) });
    },
  };
}
