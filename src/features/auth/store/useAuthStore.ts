/**
 * Auth Store - session source of truth for the passenger app.
 *
 * Secure token persistence lives in shared/utils/storage. The store keeps only
 * UI-safe user/session state and exposes explicit lifecycle actions.
 */

import { create } from 'zustand';

import { queryClient } from '@shared/api/queryClient';
import { toApiError } from '@shared/api/errors';
import { clearSessionBoundState } from '@shared/session/cleanup';
import {
  isTokenExpired,
  isTokenExpiringSoon,
  refreshStoredTokenBundle,
  shouldForceLogoutAfterRefreshFailure,
  type RefreshTokenBundleDto,
} from '@shared/api/tokenRefresh';
import {
  beginTokenSession,
  clearToken,
  getTokenBundle,
  getTokenSessionEpoch,
  isTokenSessionEpochCurrent,
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
  setUser: (user: User, expectedSessionEpoch: number) => boolean;
  continueAsGuest: () => Promise<void>;
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

const clearSessionData = (): void => {
  // Destroy/cancel private queries and mutations before another account can
  // become active in this process.
  queryClient.clear();
  clearSessionBoundState();
};

const fetchCurrentUser = (): Promise<User> => {
  return queryClient.fetchQuery({
    queryKey: authApi.authKeys.me,
    queryFn: ({ signal }) => authApi.getCurrentUser(signal),
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
  cachedUser?: User | null,
): Promise<AuthSession> => {
  const user = bundle.user
    ? mapAuthUser(bundle.user as AuthUserDto, cachedUser)
    : await fetchCurrentUser();

  return {
    accessToken: bundle.accessToken,
    refreshToken: bundle.refreshToken,
    expiresInSeconds: bundle.expiresInSeconds,
    user,
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isGuest: false,
  isAuthLoading: true,
  authError: null,

  setSession: async (session) => {
    const sessionEpoch = beginTokenSession();
    const stored = await setToken(
      session.accessToken,
      session.refreshToken,
      session.expiresInSeconds,
      session.user.status === 'ACTIVE',
      sessionEpoch,
    );

    if (!stored) {
      if (isTokenSessionEpochCurrent(sessionEpoch)) {
        await clearToken();
      }
      throw new Error('Không thể lưu phiên đăng nhập an toàn trên thiết bị.');
    }

    if (!isTokenSessionEpochCurrent(sessionEpoch)) {
      throw new Error('Phiên đăng nhập đã được thay thế bởi một phiên mới hơn.');
    }

    clearSessionData();
    // POST /auth/login returns the login-safe user projection, including
    // avatarUrl. Keep that single response as the first app-frame profile.
    cacheUser(session.user);

    set({
      user: session.user,
      isAuthenticated: true,
      isGuest: false,
      isAuthLoading: false,
      authError: null,
    });
  },

  setUser: (user, expectedSessionEpoch) => {
    const current = get();
    if (
      !isTokenSessionEpochCurrent(expectedSessionEpoch)
      || !current.isAuthenticated
      || current.isGuest
      || current.user?.id !== user.id
    ) {
      return false;
    }

    setTokenRefreshAllowed(user.status === 'ACTIVE').catch(() => {
      if (__DEV__) {
        console.warn('[Auth] Failed to update credential metadata.');
      }
    });
    cacheUser(user);
    set({
      user,
      isAuthenticated: true,
      isGuest: false,
      isAuthLoading: false,
      authError: null,
    });
    return true;
  },

  continueAsGuest: async () => {
    const clearPromise = clearToken();
    const guestSessionEpoch = getTokenSessionEpoch();
    const cleared = await clearPromise;
    if (!isTokenSessionEpochCurrent(guestSessionEpoch)) {
      return;
    }

    if (!cleared) {
      throw new Error('Không thể xóa phiên đăng nhập cũ khỏi thiết bị. Vui lòng thử lại.');
    }

    clearSessionData();
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
    clearSessionData();
    set(unauthenticatedState);
  },

  initializeAuth: async () => {
    const initializationEpoch = getTokenSessionEpoch();
    set({ isAuthLoading: true, authError: null });

    try {
      const tokenBundle = await getTokenBundle();
      if (!isTokenSessionEpochCurrent(initializationEpoch)) {
        return;
      }

      if (!tokenBundle) {
        set(unauthenticatedState);
        return;
      }

      let user: User | null = null;
      const canRefreshStoredToken = tokenBundle.refreshAllowed !== false;

      if (!canRefreshStoredToken && isTokenExpired(tokenBundle)) {
        const clearPromise = clearToken();
        const clearedSessionEpoch = getTokenSessionEpoch();
        await clearPromise;
        if (!isTokenSessionEpochCurrent(clearedSessionEpoch)) {
          return;
        }
        clearSessionData();
        set({
          ...unauthenticatedState,
          authError: 'PhiÃªn Ä‘Äƒng nháº­p Ä‘Ã£ háº¿t háº¡n. Vui lÃ²ng xÃ¡c thá»±c email rá»“i Ä‘Äƒng nháº­p láº¡i.',
        });
        return;
      }

      if (canRefreshStoredToken && (isTokenExpired(tokenBundle) || isTokenExpiringSoon(tokenBundle))) {
        const refreshResult = await refreshStoredTokenBundle();

        if (refreshResult.success) {
          const session = await authSessionFromRefreshBundle(
            refreshResult.data,
            get().user,
          );
          if (!isTokenSessionEpochCurrent(initializationEpoch)) {
            return;
          }
          user = session.user;
          cacheUser(user);
        } else if (
          isTokenExpired(tokenBundle) &&
          shouldForceLogoutAfterRefreshFailure(refreshResult)
        ) {
          const clearPromise = clearToken();
          const clearedSessionEpoch = getTokenSessionEpoch();
          await clearPromise;
          if (!isTokenSessionEpochCurrent(clearedSessionEpoch)) {
            return;
          }
          clearSessionData();
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

      if (!isTokenSessionEpochCurrent(initializationEpoch)) {
        return;
      }

      set({
        user,
        isAuthenticated: true,
        isGuest: false,
        isAuthLoading: false,
        authError: null,
      });
    } catch (error) {
      if (!isTokenSessionEpochCurrent(initializationEpoch)) {
        return;
      }

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
        const session = await authSessionFromRefreshBundle(
          refreshResult.data,
          get().user,
        );
        if (!isTokenSessionEpochCurrent(initializationEpoch)) {
          return;
        }
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
        const clearPromise = clearToken();
        const clearedSessionEpoch = getTokenSessionEpoch();
        await clearPromise;
        if (!isTokenSessionEpochCurrent(clearedSessionEpoch)) {
          return;
        }
        clearSessionData();

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
    const refreshSessionEpoch = getTokenSessionEpoch();
    const refreshResult = await refreshStoredTokenBundle();

    if (!isTokenSessionEpochCurrent(refreshSessionEpoch)) {
      return null;
    }

    if (!refreshResult.success) {
      if (shouldForceLogoutAfterRefreshFailure(refreshResult)) {
        const clearPromise = clearToken();
        const clearedSessionEpoch = getTokenSessionEpoch();
        await clearPromise;
        if (!isTokenSessionEpochCurrent(clearedSessionEpoch)) {
          return null;
        }
        clearSessionData();
        set(unauthenticatedState);
      }

      return null;
    }

    try {
      const session = await authSessionFromRefreshBundle(
        refreshResult.data,
        get().user,
      );
      if (!isTokenSessionEpochCurrent(refreshSessionEpoch)) {
        return null;
      }
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
      if (!isTokenSessionEpochCurrent(refreshSessionEpoch)) {
        return null;
      }

      if (shouldKeepLocalSession(error)) {
        set({
          isAuthLoading: false,
          authError: error instanceof Error ? error.message : 'Không thể đồng bộ hồ sơ lúc này.',
        });
        return null;
      }

      const clearPromise = clearToken();
      const clearedSessionEpoch = getTokenSessionEpoch();
      await clearPromise;
      if (!isTokenSessionEpochCurrent(clearedSessionEpoch)) {
        return null;
      }
      clearSessionData();
      set({
        ...unauthenticatedState,
        authError: error instanceof Error ? error.message : 'Không thể làm mới phiên đăng nhập.',
      });
      return null;
    }
  },

  logout: async () => {
    const logoutSessionEpoch = getTokenSessionEpoch();
    const tokenBundle = await getTokenBundle();
    if (!isTokenSessionEpochCurrent(logoutSessionEpoch)) {
      return;
    }

    let clearPromise = clearToken();
    let clearedSessionEpoch = getTokenSessionEpoch();
    let cleared = await clearPromise;
    if (!cleared && isTokenSessionEpochCurrent(clearedSessionEpoch)) {
      clearPromise = clearToken();
      clearedSessionEpoch = getTokenSessionEpoch();
      cleared = await clearPromise;
    }

    if (isTokenSessionEpochCurrent(clearedSessionEpoch)) {
      clearSessionData();
      set({
        ...unauthenticatedState,
        authError: cleared
          ? null
          : 'Không thể xóa hoàn toàn phiên đăng nhập khỏi thiết bị. Vui lòng khởi động lại ứng dụng.',
      });
    }

    try {
      if (tokenBundle) {
        await authApi.logout(tokenBundle.refreshToken, tokenBundle.accessToken);
      }
    } catch (error) {
      if (__DEV__) {
        const apiError = toApiError(error);
        console.warn(
          `[Auth] Session revoke failed (${apiError.code}, ${apiError.statusCode ?? 'no-status'}).`,
        );
      }
    }
  },
}));
