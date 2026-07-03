import { create } from 'zustand';

interface UiState {
  selectedId: string | null;
  draggingId: string | null;
  select: (id: string | null) => void;
  setDragging: (id: string | null) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  selectedId: null,
  draggingId: null,
  select: (selectedId) => set({ selectedId }),
  setDragging: (draggingId) => set({ draggingId }),
}));
