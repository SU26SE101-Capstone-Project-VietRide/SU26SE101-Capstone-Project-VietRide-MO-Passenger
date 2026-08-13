import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  isTokenExpired,
  isTokenExpiringSoon,
  refreshStoredTokenBundle,
  shouldForceLogoutAfterRefreshFailure,
  TOKEN_REFRESH_WINDOW_MS,
} from '@shared/api/tokenRefresh';
import { clearToken, getTokenBundle } from '@shared/utils/storage';
import { useAuthStore } from '../store/useAuthStore';

export function useTokenRefreshScheduler(): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userStatus = useAuthStore((state) => state.user?.status);

  useEffect(() => {
    if (!isAuthenticated || userStatus !== 'ACTIVE') {
      return undefined;
    }

    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRefreshTimer = (): void => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    };

    const forceLogoutIfRefreshTokenIsInvalid = async (): Promise<void> => {
      await clearToken();
      useAuthStore.getState().resetAuthState();
    };

    const runAsync = (task: () => Promise<void>): void => {
      task().catch((error) => {
        if (__DEV__) {
          console.warn('[Auth] Token refresh scheduler task failed:', error);
        }
      });
    };

    const scheduleNextRefresh = async (): Promise<void> => {
      clearRefreshTimer();

      const tokenBundle = await getTokenBundle();

      if (disposed || !tokenBundle?.expiresAt || tokenBundle.refreshAllowed === false) {
        return;
      }

      const delayMs = Math.max(
        tokenBundle.expiresAt - Date.now() - TOKEN_REFRESH_WINDOW_MS,
        0,
      );

      refreshTimer = setTimeout(() => {
        runAsync(refreshIfNeeded);
      }, delayMs);
    };

    const refreshIfNeeded = async (): Promise<void> => {
      const tokenBundle = await getTokenBundle();

      if (disposed || !tokenBundle || tokenBundle.refreshAllowed === false) {
        return;
      }

      if (!isTokenExpiringSoon(tokenBundle)) {
        await scheduleNextRefresh();
        return;
      }

      const refreshResult = await refreshStoredTokenBundle();

      if (
        !refreshResult.success &&
        shouldForceLogoutAfterRefreshFailure(refreshResult) &&
        isTokenExpired(tokenBundle)
      ) {
        await forceLogoutIfRefreshTokenIsInvalid();
        return;
      }

      if (!disposed) {
        await scheduleNextRefresh();
      }
    };

    const handleAppStateChange = (nextState: AppStateStatus): void => {
      if (nextState === 'active') {
        runAsync(refreshIfNeeded);
      }
    };

    runAsync(scheduleNextRefresh);

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      disposed = true;
      clearRefreshTimer();
      subscription.remove();
    };
  }, [isAuthenticated, userStatus]);
}
