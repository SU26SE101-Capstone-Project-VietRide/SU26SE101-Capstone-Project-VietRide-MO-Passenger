import axios from 'axios';

import { API_TIMEOUT } from '@shared/constants';
import { appConfig } from '@shared/constants/config';
import {
  getRefreshToken,
  getTokenSessionEpoch,
  isTokenSessionEpochCurrent,
  setToken,
  type SecureTokenBundle,
} from '@shared/utils/storage';
import { normalizeUrlBase } from '@shared/utils/url';
import {
  apiErrorFromEnvelope,
  toApiError,
  type ApiEnvelope,
  type ApiRequestError,
} from './errors';

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
  | 'account_locked'
  | 'operator_suspended'
  | 'forbidden'
  | 'network'
  | 'server'
  | 'storage'
  | 'session_invalidated'
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

type TokenRefreshSuccessHandler = (
  bundle: RefreshTokenBundleDto,
  sessionEpoch: number,
) => void;

let refreshPromise: Promise<TokenRefreshResult> | null = null;
let refreshPromiseEpoch = -1;
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

const classifyTokenRefreshFailure = (
  apiError: ApiRequestError,
): TokenRefreshFailureReason => {
  if (apiError.code === 'AUTH_ACCOUNT_LOCKED') return 'account_locked';
  if (apiError.code === 'OPERATOR_SUSPENDED') return 'operator_suspended';
  if (apiError.statusCode === 403 || apiError.code === 'FORBIDDEN') return 'forbidden';
  if (apiError.statusCode === 401 || apiError.code === 'AUTH_TOKEN_INVALID') {
    return 'invalid_refresh_token';
  }
  if (apiError.isNetworkError || apiError.code === 'REQUEST_TIMEOUT') return 'network';
  if (apiError.statusCode && apiError.statusCode >= 500) return 'server';
  return 'unknown';
};

const tokenRefreshFailure = (
  apiError: ApiRequestError,
): TokenRefreshResult => ({
  success: false,
  reason: classifyTokenRefreshFailure(apiError),
  error: apiError,
});

export const shouldForceLogoutAfterRefreshFailure = (
  result: TokenRefreshResult,
): boolean => {
  return (
    !result.success &&
    (
      result.reason === 'missing_refresh_token'
      || result.reason === 'invalid_refresh_token'
      || result.reason === 'account_locked'
      || result.reason === 'operator_suspended'
      || result.reason === 'forbidden'
    )
  );
};

const notifyRefreshSuccess = (
  bundle: RefreshTokenBundleDto,
  sessionEpoch: number,
): void => {
  try {
    refreshSuccessHandler?.(bundle, sessionEpoch);
  } catch (error) {
    if (__DEV__) {
      console.warn('[Auth] Token refresh success handler failed:', error);
    }
  }
};

const refreshStoredTokenBundleOnce = async (
  expectedSessionEpoch: number,
): Promise<TokenRefreshResult> => {
  const refreshToken = await getRefreshToken();
  if (!isTokenSessionEpochCurrent(expectedSessionEpoch)) {
    return { success: false, reason: 'session_invalidated' };
  }

  if (!refreshToken) {
    return { success: false, reason: 'missing_refresh_token' };
  }

  try {
    const response = await refreshClient.post<ApiEnvelope<RefreshTokenBundleDto>>(
      '/auth/refresh',
      { refreshToken },
    );

    if (!response.data.success) {
      return tokenRefreshFailure(apiErrorFromEnvelope(response.data));
    }

    const nextBundle = response.data.data;
    if (!isTokenSessionEpochCurrent(expectedSessionEpoch)) {
      return { success: false, reason: 'session_invalidated' };
    }

    const stored = await setToken(
      nextBundle.accessToken,
      nextBundle.refreshToken,
      nextBundle.expiresInSeconds,
      true,
      expectedSessionEpoch,
    );

    if (!stored) {
      if (!isTokenSessionEpochCurrent(expectedSessionEpoch)) {
        return { success: false, reason: 'session_invalidated' };
      }

      return {
        success: false,
        reason: 'storage',
        error: new Error('Không thể lưu phiên đăng nhập an toàn trên thiết bị.'),
      };
    }

    if (!isTokenSessionEpochCurrent(expectedSessionEpoch)) {
      return { success: false, reason: 'session_invalidated' };
    }

    notifyRefreshSuccess(nextBundle, expectedSessionEpoch);

    return {
      success: true,
      data: nextBundle,
    };
  } catch (error) {
    if (!isTokenSessionEpochCurrent(expectedSessionEpoch)) {
      return { success: false, reason: 'session_invalidated' };
    }

    const apiError = toApiError(error);
    if (__DEV__) {
      console.warn('[Auth] Token refresh failed:', apiError);
    }
    return tokenRefreshFailure(apiError);
  }
};

export const refreshStoredTokenBundle = async (): Promise<TokenRefreshResult> => {
  const sessionEpoch = getTokenSessionEpoch();

  if (!refreshPromise || refreshPromiseEpoch !== sessionEpoch) {
    const pendingRefresh = refreshStoredTokenBundleOnce(sessionEpoch).finally(() => {
      if (refreshPromise === pendingRefresh) {
        refreshPromise = null;
        refreshPromiseEpoch = -1;
      }
    });
    refreshPromise = pendingRefresh;
    refreshPromiseEpoch = sessionEpoch;
  }

  return refreshPromise;
};
