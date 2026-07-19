import { create } from 'zustand';
import {
  apiLogin,
  apiLogout,
  apiMe,
  apiRegister,
  type AuthUser,
} from '../lib/authApi';

/**
 * `loading` until the first `/api/auth/me` resolves, then `ready`. The rest of
 * the app reads `enabled` to know whether to surface sign-in at all: it's false
 * in dev with no database, where the app stays fully usable without an account.
 */
type AuthStatus = 'loading' | 'ready';

interface AuthState {
  user: AuthUser | null;
  /** Whether the server has sign-in configured (a database is connected). */
  enabled: boolean;
  status: AuthStatus;
  /**
   * Set by `lib/projectSync.ts` when the account's free-tier saved-room cap
   * was hit on the last sync attempt (the limit that was hit, or null when
   * nothing is currently over it) — drives the `RoomCapDialog` upgrade prompt.
   */
  roomCapLimit: number | null;
  setRoomCapLimit: (limit: number | null) => void;
  /** Fetches the current session; called once on app start. */
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  enabled: false,
  status: 'loading',
  roomCapLimit: null,
  setRoomCapLimit: (roomCapLimit) => set({ roomCapLimit }),
  refresh: async () => {
    const { user, authEnabled } = await apiMe();
    set({ user, enabled: authEnabled, status: 'ready' });
  },
  login: async (email, password) => {
    const user = await apiLogin(email, password);
    set({ user, enabled: true, status: 'ready' });
  },
  register: async (email, password) => {
    const user = await apiRegister(email, password);
    set({ user, enabled: true, status: 'ready' });
  },
  logout: async () => {
    await apiLogout();
    set({ user: null, roomCapLimit: null });
  },
}));
