import axios from 'axios';

import { API_TIMEOUT } from '@shared/constants';
import { appConfig } from '@shared/constants/config';
import { getRefreshToken, setToken, type SecureTokenBundle } from '@shared/utils/storage';
import { normalizeUrlBase } from '@shared/utils/url';
import { toApiError, type ApiEnvelope } from './errors';

export const TOKEN_REFRESH_WINDOW_MS = 3 * 60 * 1000;

export interface RefreshTokenBundleDto {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user?: unknown;
}

type TokenRefreshFailureReason =
  | 'missing_refresh_token'
  | 'invalid_refresh_token'
  | 'network'
  | 'server'
  | 'storage'
  | 'unknown';

export type TokenRefreshResult =
  | {
      success: true;
      data: RefreshTokenBundleDto;
    }
  | {
      success: false;
      reason: TokenRefreshFailureReason;
      error?: Error;
    };

type TokenRefreshSuccessHandler = (bundle: RefreshTokenBundleDto) => void;

let refreshPromise: Promise<TokenRefreshResult> | null = null;
let refreshSuccessHandler: TokenRefreshSuccessHandler | null = null;

const refreshClient = axios.create({
  baseURL: normalizeUrlBase(appConfig.apiBaseUrl),
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export const setTokenRefreshSuccessHandler = (
  handler: TokenRefreshSuccessHandler | null,
): void => {
  refreshSuccessHandler = handler;
};

export const isTokenExpired = (
  bundle: Pick<SecureTokenBundle, 'expiresAt'> | null,
  now = Date.now(),
): boolean => {
  return Boolean(bundle?.expiresAt && bundle.expiresAt <= now);
};

export const isTokenExpiringSoon = (
  bundle: Pick<SecureTokenBundle, 'expiresAt'> | null,
  windowMs = TOKEN_REFRESH_WINDOW_MS,
  now = Date.now(),
): boolean => {
  if (!bundle?.expiresAt) {
    return false;
  }

  return bundle.expiresAt - now <= windowMs;
};

export const shouldForceLogoutAfterRefreshFailure = (
  result: TokenRefreshResult,
): boolean => {
  return (
    !result.success &&
    (result.reason === 'missing_refresh_token' || result.reason === 'invalid_refresh_token')
  );
};

const notifyRefreshSuccess = (bundle: RefreshTokenBundleDto): void => {
  try {
    refreshSuccessHandler?.(bundle);
  } catch (error) {
    if (__DEV__) {
      console.warn('[Auth] Token refresh success handler failed:', error);
    }
  }
};

const refreshStoredTokenBundleOnce = async (): Promise<TokenRefreshResult> => {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return { success: false, reason: 'missing_refresh_token' };
  }

  try {
    const response = await refreshClient.post<ApiEnvelope<RefreshTokenBundleDto>>(
      '/auth/refresh',
      { refreshToken },
    );

    if (!response.data.success) {
      const reason = response.data.statusCode === 401
        ? 'invalid_refresh_token'
        : 'unknown';

      return {
        success: false,
        reason,
        error: new Error(response.data.error.message),
      };
    }

    const nextBundle = response.data.data;
    const stored = await setToken(
      nextBundle.accessToken,
      nextBundle.refreshToken,
      nextBundle.expiresInSeconds,
      true,
    );

    if (!stored) {
      return {
        success: false,
        reason: 'storage',
        error: new Error('Không thể lưu phiên đăng nhập an toàn trên thiết bị.'),
      };
    }

    notifyRefreshSuccess(nextBundle);

    return {
      success: true,
      data: nextBundle,
    };
  } catch (error) {
    const apiError = toApiError(error);

    if (__DEV__) {
      console.warn('[Auth] Token refresh failed:', apiError);
    }

    if (apiError.statusCode === 401 || apiError.code === 'AUTH_TOKEN_INVALID') {
      return { success: false, reason: 'invalid_refresh_token', error: apiError };
    }

    if (apiError.isNetworkError || apiError.code === 'REQUEST_TIMEOUT') {
      return { success: false, reason: 'network', error: apiError };
    }

    if (apiError.statusCode && apiError.statusCode >= 500) {
      return { success: false, reason: 'server', error: apiError };
    }

    return { success: false, reason: 'unknown', error: apiError };
  }
};

export const refreshStoredTokenBundle = async (): Promise<TokenRefreshResult> => {
  if (!refreshPromise) {
    refreshPromise = refreshStoredTokenBundleOnce().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};
