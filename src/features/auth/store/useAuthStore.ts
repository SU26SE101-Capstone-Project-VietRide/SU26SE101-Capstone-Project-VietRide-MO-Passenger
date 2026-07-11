/**
 * Auth Store - session source of truth for the passenger app.
 *
 * Secure token persistence lives in shared/utils/storage. The store keeps only
 * UI-safe user/session state and exposes explicit lifecycle actions.
 */

import { create } from 'zustand';

import { queryClient } from '@shared/api/queryClient';
import { toApiError } from '@shared/api/errors';
import {
  isTokenExpired,
  isTokenExpiringSoon,
  refreshStoredTokenBundle,
  shouldForceLogoutAfterRefreshFailure,
  type RefreshTokenBundleDto,
} from '@shared/api/tokenRefresh';
import {
  clearToken,
  getRefreshToken,
  getTokenBundle,
  setToken,
  setTokenRefreshAllowed,
} from '@shared/utils/storage';
import * as authApi from '../api/authApi';
import { mapAuthUser, type AuthSession, type AuthUserDto, type User } from '../types';

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

const AUTH_ME_STALE_TIME_MS = 5 * 60 * 1000;

const cacheUser = (user: User): void => {
  queryClient.setQueryData(authApi.authKeys.me, user);
};

const clearAuthCache = (): void => {
  queryClient.removeQueries({ queryKey: authApi.authKeys.all });
};

const fetchCurrentUser = (): Promise<User> => {
  return queryClient.fetchQuery({
    queryKey: authApi.authKeys.me,
    queryFn: authApi.getCurrentUser,
    staleTime: AUTH_ME_STALE_TIME_MS,
  });
};

const shouldKeepLocalSession = (error: unknown): boolean => {
  const apiError = toApiError(error);

  return (
    apiError.isNetworkError ||
    apiError.code === 'REQUEST_TIMEOUT' ||
    Boolean(apiError.statusCode && apiError.statusCode >= 500)
  );
};

const authSessionFromRefreshBundle = async (
  bundle: RefreshTokenBundleDto,
): Promise<AuthSession> => {
  const user = bundle.user
    ? mapAuthUser(bundle.user as AuthUserDto)
    : await fetchCurrentUser();

  return {
    accessToken: bundle.accessToken,
    refreshToken: bundle.refreshToken,
    expiresInSeconds: bundle.expiresInSeconds,
    user,
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isGuest: false,
  isAuthLoading: true,
  authError: null,

  setSession: async (session) => {
    const stored = await setToken(
      session.accessToken,
      session.refreshToken,
      session.expiresInSeconds,
      session.user.status === 'ACTIVE',
    );

    if (!stored) {
      throw new Error('Không thể lưu phiên đăng nhập an toàn trên thiết bị.');
    }

    cacheUser(session.user);

    set({
      user: session.user,
      isAuthenticated: true,
      isGuest: false,
      isAuthLoading: false,
      authError: null,
    });
  },

  setUser: (user) =>
    {
      void setTokenRefreshAllowed(user.status === 'ACTIVE');
      cacheUser(user);
      set({
        user,
        isAuthenticated: true,
        isGuest: false,
        isAuthLoading: false,
        authError: null,
      });
    },

  continueAsGuest: () =>
    {
      clearAuthCache();
      set({
        user: null,
        isAuthenticated: false,
        isGuest: true,
        isAuthLoading: false,
        authError: null,
      });
    },

  setAuthLoading: (loading) => set({ isAuthLoading: loading }),

  clearAuthError: () => set({ authError: null }),

  resetAuthState: () => {
    clearAuthCache();
    set(unauthenticatedState);
  },

  initializeAuth: async () => {
    set({ isAuthLoading: true, authError: null });

    try {
      const tokenBundle = await getTokenBundle();

      if (!tokenBundle) {
        set(unauthenticatedState);
        return;
      }

      let user: User | null = null;
      const canRefreshStoredToken = tokenBundle.refreshAllowed !== false;

      if (!canRefreshStoredToken && isTokenExpired(tokenBundle)) {
        await clearToken();
        clearAuthCache();
        set({
          ...unauthenticatedState,
          authError: 'PhiÃªn Ä‘Äƒng nháº­p Ä‘Ã£ háº¿t háº¡n. Vui lÃ²ng xÃ¡c thá»±c email rá»“i Ä‘Äƒng nháº­p láº¡i.',
        });
        return;
      }

      if (canRefreshStoredToken && (isTokenExpired(tokenBundle) || isTokenExpiringSoon(tokenBundle))) {
        const refreshResult = await refreshStoredTokenBundle();

        if (refreshResult.success) {
          const session = await authSessionFromRefreshBundle(refreshResult.data);
          user = session.user;
          cacheUser(user);
        } else if (
          isTokenExpired(tokenBundle) &&
          shouldForceLogoutAfterRefreshFailure(refreshResult)
        ) {
          await clearToken();
          clearAuthCache();
          set({
            ...unauthenticatedState,
            authError: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          });
          return;
        }
      }

      if (!user) {
        user = await fetchCurrentUser();
      }

      set({
        user,
        isAuthenticated: true,
        isGuest: false,
        isAuthLoading: false,
        authError: null,
      });
    } catch (error) {
      if (shouldKeepLocalSession(error)) {
        const cachedUser = queryClient.getQueryData<User>(authApi.authKeys.me) ?? null;

        set({
          user: cachedUser,
          isAuthenticated: true,
          isGuest: false,
          isAuthLoading: false,
          authError: error instanceof Error ? error.message : 'Không thể đồng bộ hồ sơ lúc này.',
        });
        return;
      }

      const refreshResult = await refreshStoredTokenBundle();

      if (refreshResult.success) {
        const session = await authSessionFromRefreshBundle(refreshResult.data);
        cacheUser(session.user);
        set({
          user: session.user,
          isAuthenticated: true,
          isGuest: false,
          isAuthLoading: false,
          authError: null,
        });
        return;
      }

      if (shouldForceLogoutAfterRefreshFailure(refreshResult)) {
        await clearToken();
        clearAuthCache();

        set({
          ...unauthenticatedState,
          authError: error instanceof Error ? error.message : 'Phiên đăng nhập không hợp lệ.',
        });
        return;
      }

      const cachedUser = queryClient.getQueryData<User>(authApi.authKeys.me) ?? null;

      set({
        user: cachedUser,
        isAuthenticated: true,
        isGuest: false,
        isAuthLoading: false,
        authError: error instanceof Error ? error.message : 'Không thể đồng bộ hồ sơ lúc này.',
      });
    }
  },

  refreshSession: async () => {
    const refreshResult = await refreshStoredTokenBundle();

    if (!refreshResult.success) {
      if (shouldForceLogoutAfterRefreshFailure(refreshResult)) {
        await clearToken();
        clearAuthCache();
        set(unauthenticatedState);
      }

      return null;
    }

    try {
      const session = await authSessionFromRefreshBundle(refreshResult.data);
      cacheUser(session.user);

      set({
        user: session.user,
        isAuthenticated: true,
        isGuest: false,
        isAuthLoading: false,
        authError: null,
      });

      return session;
    } catch (error) {
      if (shouldKeepLocalSession(error)) {
        set({
          isAuthLoading: false,
          authError: error instanceof Error ? error.message : 'Không thể đồng bộ hồ sơ lúc này.',
        });
        return null;
      }

      await clearToken();
      clearAuthCache();
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
      clearAuthCache();
      set(unauthenticatedState);
    }
  },
}));
