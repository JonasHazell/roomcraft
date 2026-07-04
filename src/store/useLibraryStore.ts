import { create } from 'zustand';
import type { FurnitureLibraryEntry } from '../types';
import {
  deleteFurnitureFromLibrary,
  listFurnitureLibrary,
  saveFurnitureToLibrary,
} from '../lib/persistence';

interface LibraryState {
  entries: FurnitureLibraryEntry[];
  /** Sparar en möbel i biblioteket och returnerar den sparade posten. */
  save: (entry: Omit<FurnitureLibraryEntry, 'id'>) => FurnitureLibraryEntry;
  remove: (id: string) => void;
}

/** Håller localStorage-biblioteket reaktivt så att alla paneler visar samma lista. */
export const useLibraryStore = create<LibraryState>((set) => ({
  entries: listFurnitureLibrary(),
  save: (entry) => {
    const saved = saveFurnitureToLibrary(entry);
    set({ entries: listFurnitureLibrary() });
    return saved;
  },
  remove: (id) => {
    deleteFurnitureFromLibrary(id);
    set({ entries: listFurnitureLibrary() });
  },
}));
