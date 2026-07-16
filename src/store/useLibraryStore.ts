import { create } from 'zustand';
import type { FurnitureLibraryEntry } from '../types';
import { FURNITURE_CATALOG } from '../lib/furnitureCatalog';
import {
  deleteFurnitureFromLibrary,
  listFurnitureLibrary,
  renameFurnitureInLibrary,
  saveFurnitureToLibrary,
} from '../lib/persistence';

interface LibraryState {
  entries: FurnitureLibraryEntry[];
  /** Saves a furniture piece to the library and returns the saved entry. */
  save: (entry: Omit<FurnitureLibraryEntry, 'id'>) => FurnitureLibraryEntry;
  /** Renames a saved entry. An empty/whitespace name falls back to the catalog label. */
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
}

/** Keeps the localStorage library reactive so all panels show the same list. */
export const useLibraryStore = create<LibraryState>((set, get) => ({
  entries: listFurnitureLibrary(),
  save: (entry) => {
    const saved = saveFurnitureToLibrary(entry);
    set({ entries: listFurnitureLibrary() });
    return saved;
  },
  rename: (id, name) => {
    const entry = get().entries.find((e) => e.id === id);
    if (!entry) return;
    const trimmed = name.trim() || FURNITURE_CATALOG[entry.kind].label;
    renameFurnitureInLibrary(id, trimmed);
    set({ entries: listFurnitureLibrary() });
  },
  remove: (id) => {
    deleteFurnitureFromLibrary(id);
    set({ entries: listFurnitureLibrary() });
  },
}));
