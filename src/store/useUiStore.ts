import { create } from 'zustand';

export type Selection = { kind: 'furniture' | 'wall'; id: string } | null;
export type EditorMode = '2d' | '3d';

interface UiState {
  selection: Selection;
  draggingId: string | null;
  mode: EditorMode;
  sidebarOpen: boolean;
  select: (selection: Selection) => void;
  setDragging: (id: string | null) => void;
  setMode: (mode: EditorMode) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selection: null,
  draggingId: null,
  mode: '3d',
  // Only affects the mobile drawer; on desktop the sidebar is always visible.
  sidebarOpen: false,
  select: (selection) => set({ selection }),
  setDragging: (draggingId) => set({ draggingId }),
  setMode: (mode) => set({ mode }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
