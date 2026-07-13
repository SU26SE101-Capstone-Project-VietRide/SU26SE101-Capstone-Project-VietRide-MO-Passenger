import { clearToken, getTokenBundle } from '@shared/utils/storage';
import {
  isTokenExpiringSoon,
  refreshStoredTokenBundle,
  shouldForceLogoutAfterRefreshFailure,
} from './tokenRefresh';

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null): void => {
  unauthorizedHandler = handler;
};

export const notifyUnauthorized = (): void => {
  unauthorizedHandler?.();
};

export const resolveStoredAccessToken = async ({
  skipRefresh = false,
}: {
  skipRefresh?: boolean;
} = {}): Promise<string | null> => {
  const tokenBundle = await getTokenBundle();
  let accessToken = tokenBundle?.accessToken ?? null;

  if (
    tokenBundle
    && tokenBundle.refreshAllowed !== false
    && !skipRefresh
    && isTokenExpiringSoon(tokenBundle)
  ) {
    const refreshResult = await refreshStoredTokenBundle();

    if (refreshResult.success) {
      accessToken = refreshResult.data.accessToken;
    } else if (shouldForceLogoutAfterRefreshFailure(refreshResult)) {
      await clearToken();
      notifyUnauthorized();
      accessToken = null;
    }
  }

  return accessToken;
};

export const refreshAccessTokenAfterUnauthorized = async (): Promise<string | null> => {
  const refreshResult = await refreshStoredTokenBundle();

  if (refreshResult.success) {
    return refreshResult.data.accessToken;
  }

  if (shouldForceLogoutAfterRefreshFailure(refreshResult)) {
    await clearToken();
    notifyUnauthorized();
  }

  return null;
};
