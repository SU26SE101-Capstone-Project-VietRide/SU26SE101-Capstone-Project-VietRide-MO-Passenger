/**
 * Auth Store — Authentication state management
 *
 * Manages user object, authentication status, and auth actions.
 * Token persistence is handled by the Keychain utility, not here.
 */

import { create } from 'zustand';
import { clearToken } from '@shared/utils/storage';

// ─── Types ────────────────────────────────────────────────

export interface User {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
}

interface AuthState {
  /** Current authenticated user, or null */
  user: User | null;

  /** Whether the user is authenticated */
  isAuthenticated: boolean;

  /** Whether initial auth check is in progress */
  isAuthLoading: boolean;

  // ─── Actions ──────────────────────────────────────────
  setUser: (user: User) => void;
  setAuthLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
      isAuthLoading: false,
    }),

  setAuthLoading: (loading) => set({ isAuthLoading: loading }),

  logout: async () => {
    await clearToken();
    set({
      user: null,
      isAuthenticated: false,
      isAuthLoading: false,
    });
  },
}));
