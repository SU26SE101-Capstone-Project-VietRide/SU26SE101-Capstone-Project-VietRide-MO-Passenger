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
import { getToken, getRefreshToken, setToken, clearToken } from '@shared/utils/storage';
import { joinUrl, normalizeApiPath, normalizeUrlBase, isAbsoluteUrl } from '@shared/utils/url';
import type { ApiEnvelope } from './errors';

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

interface TokenBundleDto {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

type UnauthorizedHandler = () => void;

let refreshPromise: Promise<string | null> | null = null;
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

const refreshClient = axios.create({
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

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        return null;
      }

      try {
        const response = await refreshClient.post<ApiEnvelope<TokenBundleDto>>(
          '/auth/refresh',
          { refreshToken },
        );

        if (!response.data.success) {
          return null;
        }

        const stored = await setToken(response.data.data.accessToken, response.data.data.refreshToken);

        if (!stored) {
          return null;
        }

        return response.data.data.accessToken;
      } catch (error) {
        if (__DEV__) {
          console.warn('[API] Token refresh failed:', error);
        }
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
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

    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (__DEV__) {
      console.log(
        `[API] ${config.method?.toUpperCase()} ${joinUrl(config.baseURL, config.url)}`,
      );
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
      const nextAccessToken = await refreshAccessToken();

      if (nextAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        return apiClient(originalRequest);
      }

      await clearToken();
      unauthorizedHandler?.();

      if (__DEV__) {
        console.warn('[API] 401 — Refresh failed, clearing credentials.');
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
