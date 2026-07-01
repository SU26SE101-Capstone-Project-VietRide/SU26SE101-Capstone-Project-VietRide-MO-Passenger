/**
 * Axios Instance — Centralized HTTP client
 *
 * Features:
 * - Base URL from environment config
 * - Request interceptor: injects JWT from Keychain
 * - Response interceptor: handles 401 (token expired) and network errors
 * - Configurable timeout
 */

import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';

import { appConfig } from '@shared/constants/config';
import { API_TIMEOUT } from '@shared/constants';
import { clearToken, getTokenBundle } from '@shared/utils/storage';
import { joinUrl, normalizeApiPath, normalizeUrlBase, isAbsoluteUrl } from '@shared/utils/url';
import {
  isTokenExpiringSoon,
  refreshStoredTokenBundle,
  shouldForceLogoutAfterRefreshFailure,
} from './tokenRefresh';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null): void => {
  unauthorizedHandler = handler;
};

// ─── Instance ─────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const isAuthRoute = (url?: string): boolean => {
  if (!url || isAbsoluteUrl(url)) {
    return false;
  }

  return normalizeApiPath(url).startsWith('/auth/');
};

// ─── Request Interceptor ──────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (config.baseURL) {
      config.baseURL = normalizeUrlBase(config.baseURL);
    }

    if (config.url && !isAbsoluteUrl(config.url)) {
      config.url = normalizeApiPath(config.url);
    }

    const tokenBundle = await getTokenBundle();
    let accessToken = tokenBundle?.accessToken ?? null;

    if (
      tokenBundle &&
      !config.skipAuthRefresh &&
      !isAuthRoute(config.url) &&
      isTokenExpiringSoon(tokenBundle)
    ) {
      const refreshResult = await refreshStoredTokenBundle();

      if (refreshResult.success) {
        accessToken = refreshResult.data.accessToken;
      } else if (shouldForceLogoutAfterRefreshFailure(refreshResult)) {
        await clearToken();
        unauthorizedHandler?.();
        accessToken = null;
      }
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (__DEV__) {
      const reqId = Math.random().toString(36).slice(2, 10);
      console.groupCollapsed(`[API REQ ${reqId}] ${config.method?.toUpperCase()} ${joinUrl(config.baseURL, config.url)}`);
      console.log('  Headers:', JSON.parse(JSON.stringify(config.headers)));
      if (config.data) {
        console.log('  Body:', config.data);
      }
      if (config.params) {
        console.log('  Params:', config.params);
      }
      console.groupEnd();
      (config as unknown as Record<string, unknown>)._reqId = reqId;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// ─── Response Interceptor ─────────────────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (__DEV__) {
      const reqId = (response.config as unknown as Record<string, unknown>)?._reqId ?? '????';
      console.groupCollapsed(`[API RES ${reqId}] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
      console.log('  Status:', response.status, response.statusText);
      console.log('  Data:', response.data);
      console.groupEnd();
    }
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined;

    // Handle 401 — Unauthorized (token expired or invalid)
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh &&
      !isAuthRoute(originalRequest.url)
    ) {
      originalRequest._retry = true;
      const refreshResult = await refreshStoredTokenBundle();

      if (refreshResult.success) {
        originalRequest.headers.Authorization = `Bearer ${refreshResult.data.accessToken}`;
        return apiClient(originalRequest);
      }

      if (shouldForceLogoutAfterRefreshFailure(refreshResult)) {
        await clearToken();
        unauthorizedHandler?.();

        if (__DEV__) {
          console.warn('[API] 401 — Refresh token invalid, clearing credentials.');
        }
      }
    }

    // Handle network errors
    if (error.message === 'Network Error') {
      if (__DEV__) {
        console.warn('[API] Network Error — No internet connection.');
      }
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      if (__DEV__) {
        console.warn('[API] Request timed out.');
      }
    }

    return Promise.reject(error);
  },
);

// ─── Typed API Helpers ────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string | null;
  statusCode: number;
  success: boolean;
  meta?: {
    traceId: string;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
  };
}
