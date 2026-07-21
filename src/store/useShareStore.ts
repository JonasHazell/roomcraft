import { create } from 'zustand';
import type { Design } from '../types';
import { syncActiveProposal } from '../lib/persistence';
import { apiCreateShare } from '../lib/shareApi';

/**
 * Drives the "Share this room" dialog (#353): posts a point-in-time snapshot of
 * the active room to the server and holds the resulting link (or an error) for
 * `ShareDialog` to show. Lifted into its own store, like `useAiStore`, so the
 * trigger (`ProposalSwitcher`'s menu) and the dialog don't need to be siblings.
 */
interface ShareState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  url: string | null;
  error: string | null;
  /** Creates a share from the given room and opens the dialog with its link. */
  share: (design: Design) => Promise<void>;
  /** Closes the dialog and clears any in-flight/finished result. */
  dismiss: () => void;
}

export const useShareStore = create<ShareState>()((set) => ({
  status: 'idle',
  url: null,
  error: null,
  share: async (design) => {
    set({ status: 'loading', url: null, error: null });
    try {
      // Mirror the live furniture/colours into the proposal snapshot first, the
      // same normalization done before persisting or exporting the project, so
      // the shared copy matches what's actually on screen.
      const id = await apiCreateShare(syncActiveProposal(design));
      set({ status: 'ready', url: `${window.location.origin}/#share/${id}` });
    } catch (e) {
      set({
        status: 'error',
        error: e instanceof Error ? e.message : 'Could not create the share link.',
      });
    }
  },
  dismiss: () => set({ status: 'idle', url: null, error: null }),
}));
