import { create } from 'zustand';

export type Selection = { kind: 'furniture' | 'wall'; id: string } | null;
export type EditorMode = '2d' | '3d';

interface UiState {
  selection: Selection;
  draggingId: string | null;
  mode: EditorMode;
  select: (selection: Selection) => void;
  setDragging: (id: string | null) => void;
  setMode: (mode: EditorMode) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selection: null,
  draggingId: null,
  mode: '3d',
  select: (selection) => set({ selection }),
  setDragging: (draggingId) => set({ draggingId }),
  setMode: (mode) => set({ mode }),
}));
