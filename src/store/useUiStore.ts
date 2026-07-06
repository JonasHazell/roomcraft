import { create } from 'zustand';

export type Selection =
  | { kind: 'furniture' | 'wall'; id: string }
  | { kind: 'floor' }
  | null;
export type EditorMode = '2d' | '3d';

/**
 * A global side panel opened from the bottom action bar (AI, validation) or the
 * wall action bar (openings). Independent of the current selection, except
 * `openings`, which reads whichever wall is selected.
 */
export type Panel = 'ai' | 'validation' | 'openings' | null;

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
  panel: Panel;
  select: (selection: Selection) => void;
  setDragging: (id: string | null) => void;
  setMode: (mode: EditorMode) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  openAddFurniture: () => void;
  openEditFurniture: (id: string) => void;
  closeFurnitureDialog: () => void;
  openPanel: (panel: Exclude<Panel, null>) => void;
  closePanel: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selection: null,
  draggingId: null,
  mode: '3d',
  // Only affects the mobile drawer; on desktop the sidebar is always visible.
  sidebarOpen: false,
  furnitureDialog: null,
  panel: null,
  select: (selection) => set({ selection }),
  setDragging: (draggingId) => set({ draggingId }),
  setMode: (mode) => set({ mode }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openAddFurniture: () => set({ furnitureDialog: { mode: 'create' } }),
  openEditFurniture: (id) =>
    set({ selection: { kind: 'furniture', id }, furnitureDialog: { mode: 'edit', id } }),
  closeFurnitureDialog: () => set({ furnitureDialog: null }),
  openPanel: (panel) => set({ panel }),
  closePanel: () => set({ panel: null }),
}));
