import { create } from 'zustand';

/**
 * Whether the most recent attempt to persist to localStorage (the design store's
 * autosave, or the furniture library) failed — e.g. quota exceeded or Safari
 * Private Browsing, where `setItem` throws unconditionally. The edit itself is
 * kept in memory either way; this only tracks whether it made it to disk, so the
 * UI can show an honest, non-blocking notice instead of the app crashing.
 */
interface StorageStatusState {
  saveFailed: boolean;
  setSaveFailed: (saveFailed: boolean) => void;
}

export const useStorageStatus = create<StorageStatusState>()((set) => ({
  saveFailed: false,
  setSaveFailed: (saveFailed) => set({ saveFailed }),
}));
