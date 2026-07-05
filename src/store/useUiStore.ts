import { create } from 'zustand';

export type Selection = { kind: 'furniture' | 'wall'; id: string } | null;
export type EditorMode = '2d' | '3d';

interface UiState {
  selection: Selection;
  draggingId: string | null;
  mode: EditorMode;
  /** On mobile the sidebar collapses into a drawer; this tracks whether it's open. */
  drawerOpen: boolean;
  select: (selection: Selection) => void;
  setDragging: (id: string | null) => void;
  setMode: (mode: EditorMode) => void;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selection: null,
  draggingId: null,
  mode: '3d',
  // Only affects the mobile drawer; on desktop the sidebar is always visible.
  drawerOpen: false,
  select: (selection) => set({ selection }),
  setDragging: (draggingId) => set({ draggingId }),
  setMode: (mode) => set({ mode }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
}));
