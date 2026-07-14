import { create } from 'zustand';
import type { Design } from '../types';
import { fetchProposals, type ProposalsResponse } from '../lib/aiProposals';
import { useAuthStore } from './useAuthStore';

/**
 * A generation runs Claude on the server (proposals in parallel) and usually
 * finishes in under a minute; this is a generous safety cap so a stalled request
 * never leaves the panel stuck on "thinking" forever (mobile networks drop; the
 * server can hang).
 */
const TIMEOUT_MS = 4 * 60 * 1000;

/**
 * AI furnishing state, lifted out of the panel so it survives the panel being
 * closed and reopened. On a phone the panel is a full-viewport sheet that's easy
 * to dismiss by accident mid-run — keeping the request, the typed needs and the
 * results here means none of that is lost when the sheet closes. The request
 * itself is fired from the store, so it also keeps running while the panel is
 * unmounted.
 */
interface AiState {
  /** The user's free-text description of the room's needs (the prompt). */
  needs: string;
  loading: boolean;
  /** Epoch ms when the current run began, for the elapsed-time readout. */
  startedAt: number | null;
  error: string | null;
  result: ProposalsResponse | null;
  /** Title of the proposal the user last saved, so the card can show "In use". */
  appliedTitle: string | null;
  /**
   * Set if the tab was hidden while a run was in flight. Mobile browsers throttle
   * or suspend background tabs, which can silently kill the request — this lets
   * the panel explain a failure that follows.
   */
  interrupted: boolean;
  setNeeds: (needs: string) => void;
  generate: (design: Design) => Promise<void>;
  cancel: () => void;
  markHidden: () => void;
  setApplied: (title: string) => void;
}

// The controller and timeout live at module scope (not in state) so aborting
// never triggers a re-render, and a stale run can't clobber a newer one.
let controller: AbortController | null = null;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

export const useAiStore = create<AiState>()((set, get) => ({
  needs: '',
  loading: false,
  startedAt: null,
  error: null,
  result: null,
  appliedTitle: null,
  interrupted: false,

  setNeeds: (needs) => set({ needs }),

  generate: async (design) => {
    const { loading, needs } = get();
    if (loading || needs.trim().length === 0) return;

    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    clearTimer();
    let timedOut = false;
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller?.abort();
    }, TIMEOUT_MS);

    set({
      loading: true,
      error: null,
      result: null,
      appliedTitle: null,
      interrupted: false,
      startedAt: Date.now(),
    });

    try {
      const result = await fetchProposals(design, needs, signal);
      set({ result, loading: false, startedAt: null });
    } catch (e) {
      if (signal.aborted && !timedOut) {
        // The user cancelled — stop quietly, keep their typed needs.
        set({ loading: false, startedAt: null });
      } else if (timedOut) {
        set({
          loading: false,
          startedAt: null,
          error:
            'That took too long and was stopped. Try again, or describe the room a little more simply.',
        });
      } else {
        set({
          loading: false,
          startedAt: null,
          error: e instanceof Error ? e.message : 'Something went wrong.',
        });
        // The session may have lapsed server-side (401); re-sync so the panel can
        // fall back to the sign-in prompt instead of showing a stale form.
        if (useAuthStore.getState().enabled) void useAuthStore.getState().refresh();
      }
    } finally {
      clearTimer();
      controller = null;
    }
  },

  cancel: () => {
    controller?.abort();
    clearTimer();
    set({ loading: false, startedAt: null });
  },

  markHidden: () => {
    if (get().loading) set({ interrupted: true });
  },

  setApplied: (appliedTitle) => set({ appliedTitle }),
}));
