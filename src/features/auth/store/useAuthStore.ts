/**
 * Auth Store - session source of truth for the passenger app.
 *
 * Secure token persistence lives in shared/utils/storage. The store keeps only
 * UI-safe user/session state and exposes explicit lifecycle actions.
 */

import { create } from 'zustand';

import { clearToken, getRefreshToken, getToken, setToken } from '@shared/utils/storage';
import * as authApi from '../api/authApi';
import type { AuthSession, User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isAuthLoading: boolean;
  authError: string | null;

  setSession: (session: AuthSession) => Promise<void>;
  setUser: (user: User) => void;
  continueAsGuest: () => void;
  setAuthLoading: (loading: boolean) => void;
  clearAuthError: () => void;
  resetAuthState: () => void;
  initializeAuth: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
  logout: () => Promise<void>;
}

const unauthenticatedState = {
  user: null,
  isAuthenticated: false,
  isGuest: false,
  isAuthLoading: false,
  authError: null,
} satisfies Pick<AuthState, 'user' | 'isAuthenticated' | 'isGuest' | 'isAuthLoading' | 'authError'>;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isGuest: false,
  isAuthLoading: true,
  authError: null,

  setSession: async (session) => {
    const stored = await setToken(session.accessToken, session.refreshToken);

    if (!stored) {
      throw new Error('Không thể lưu phiên đăng nhập an toàn trên thiết bị.');
    }

    set({
      user: session.user,
      isAuthenticated: true,
      isGuest: false,
      isAuthLoading: false,
      authError: null,
    });
  },

  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
      isGuest: false,
      isAuthLoading: false,
      authError: null,
    }),

  continueAsGuest: () =>
    set({
      user: null,
      isAuthenticated: false,
      isGuest: true,
      isAuthLoading: false,
      authError: null,
    }),

  setAuthLoading: (loading) => set({ isAuthLoading: loading }),

  clearAuthError: () => set({ authError: null }),

  resetAuthState: () => set(unauthenticatedState),

  initializeAuth: async () => {
    set({ isAuthLoading: true, authError: null });

    try {
      const token = await getToken();

      if (!token) {
        set(unauthenticatedState);
        return;
      }

      const user = await authApi.getCurrentUser();

      set({
        user,
        isAuthenticated: true,
        isGuest: false,
        isAuthLoading: false,
        authError: null,
      });
    } catch (error) {
      await clearToken();

      set({
        ...unauthenticatedState,
        authError: error instanceof Error ? error.message : 'Phiên đăng nhập không hợp lệ.',
      });
    }
  },

  refreshSession: async () => {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      await clearToken();
      set(unauthenticatedState);
      return null;
    }

    try {
      const session = await authApi.refreshSession(refreshToken);
      const stored = await setToken(session.accessToken, session.refreshToken);

      if (!stored) {
        throw new Error('Không thể lưu phiên đăng nhập an toàn trên thiết bị.');
      }

      set({
        user: session.user,
        isAuthenticated: true,
        isGuest: false,
        isAuthLoading: false,
        authError: null,
      });

      return session;
    } catch (error) {
      await clearToken();

      set({
        ...unauthenticatedState,
        authError: error instanceof Error ? error.message : 'Không thể làm mới phiên đăng nhập.',
      });

      return null;
    }
  },

  logout: async () => {
    const refreshToken = await getRefreshToken();

    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[Auth] Logout revoke failed, clearing local session anyway:', error);
      }
    } finally {
      await clearToken();
      set(unauthenticatedState);
    }
  },
}));
