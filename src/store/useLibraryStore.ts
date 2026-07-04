import { create } from 'zustand';
import type { FurnitureLibraryEntry } from '../types';
import {
  deleteFurnitureFromLibrary,
  listFurnitureLibrary,
  saveFurnitureToLibrary,
} from '../lib/persistence';

interface LibraryState {
  entries: FurnitureLibraryEntry[];
  /** Saves a furniture piece to the library and returns the saved entry. */
  save: (entry: Omit<FurnitureLibraryEntry, 'id'>) => FurnitureLibraryEntry;
  remove: (id: string) => void;
}

/** Keeps the localStorage library reactive so all panels show the same list. */
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
