import { create } from 'zustand';

export type Selection = { kind: 'furniture' | 'wall'; id: string } | null;
export type EditorMode = '2d' | '3d';

/**
 * The furniture add/edit dialog. `create` starts on the type picker and commits
 * a new piece on "Add"; `edit` opens the same form pre-filled with an existing
 * piece's values (opened from the selection bar's "More").
 */
export type FurnitureDialog = { mode: 'create' } | { mode: 'edit'; id: string } | null;

interface UiState {
  selection: Selection;
  draggingId: string | null;
  mode: EditorMode;
  sidebarOpen: boolean;
  furnitureDialog: FurnitureDialog;
  select: (selection: Selection) => void;
  setDragging: (id: string | null) => void;
  setMode: (mode: EditorMode) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  openAddFurniture: () => void;
  openEditFurniture: (id: string) => void;
  closeFurnitureDialog: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selection: null,
  draggingId: null,
  mode: '3d',
  // Only affects the mobile drawer; on desktop the sidebar is always visible.
  sidebarOpen: false,
  furnitureDialog: null,
  select: (selection) => set({ selection }),
  setDragging: (draggingId) => set({ draggingId }),
  setMode: (mode) => set({ mode }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openAddFurniture: () => set({ furnitureDialog: { mode: 'create' } }),
  openEditFurniture: (id) =>
    set({ selection: { kind: 'furniture', id }, furnitureDialog: { mode: 'edit', id } }),
  closeFurnitureDialog: () => set({ furnitureDialog: null }),
}));
