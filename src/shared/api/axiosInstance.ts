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
import {
  isAbsoluteUrl,
  isTrustedApiUrl,
  normalizeApiPath,
  normalizeUrlBase,
} from '@shared/utils/url';
import {
  refreshAccessTokenAfterUnauthorized,
  resolveStoredAccessToken,
} from './authSession';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    skipAuth?: boolean;
    _retry?: boolean;
    _requestId?: string;
    _requestStartedAt?: number;
  }

  export interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
    skipAuth?: boolean;
    _retry?: boolean;
    _requestId?: string;
    _requestStartedAt?: number;
  }
}

export { setUnauthorizedHandler } from './authSession';

// ─── Instance ─────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let requestSequence = 0;
const configuredApiBaseUrl = normalizeUrlBase(appConfig.apiBaseUrl);
const UUID_PATH_SEGMENT_PATTERN =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi;
const NUMERIC_PATH_SEGMENT_PATTERN = /\/\d+(?=\/|$)/g;

const nextRequestId = (): string => {
  requestSequence = (requestSequence + 1) % Number.MAX_SAFE_INTEGER;
  return `${Date.now().toString(36)}-${requestSequence.toString(36)}`;
};

const safeRouteLabel = (url?: string): string => {
  if (!url) return '/';

  let path = url.split(/[?#]/, 1)[0];
  if (isAbsoluteUrl(url)) {
    try {
      path = new URL(url).pathname;
    } catch {
      return '[invalid-url]';
    }
  }

  return path
    .replace(UUID_PATH_SEGMENT_PATTERN, '/:id')
    .replace(NUMERIC_PATH_SEGMENT_PATTERN, '/:id');
};

const elapsedMs = (startedAt?: number): number =>
  Math.max(0, Date.now() - (startedAt ?? Date.now()));

const isAuthRoute = (url?: string): boolean => {
  if (!url || isAbsoluteUrl(url)) {
    return false;
  }

  return normalizeApiPath(url).startsWith('/auth/');
};

// ─── Request Interceptor ──────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (
      config.baseURL
      && normalizeUrlBase(config.baseURL) !== configuredApiBaseUrl
    ) {
      throw new AxiosError(
        '[API] Refused an untrusted base URL.',
        'ERR_UNTRUSTED_API_URL',
        config,
      );
    }
    config.baseURL = configuredApiBaseUrl;

    if (config.url && !isTrustedApiUrl(config.url, configuredApiBaseUrl)) {
      throw new AxiosError(
        '[API] Refused an untrusted request URL.',
        'ERR_UNTRUSTED_API_URL',
        config,
      );
    }

    if (config.url && !isAbsoluteUrl(config.url)) {
      config.url = normalizeApiPath(config.url);
    }

    const accessToken = config.skipAuth
      ? null
      : await resolveStoredAccessToken({
        skipRefresh: config.skipAuthRefresh || isAuthRoute(config.url),
      });

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (__DEV__) {
      config._requestId = nextRequestId();
      config._requestStartedAt = Date.now();
      console.debug(
        `[API ${config._requestId}] -> ${config.method?.toUpperCase() ?? 'GET'} ${safeRouteLabel(config.url)}`,
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
    if (__DEV__) {
      const requestId = response.config._requestId ?? 'unknown';
      console.debug(
        `[API ${requestId}] <- ${response.status} ${response.config.method?.toUpperCase() ?? 'GET'} ${safeRouteLabel(response.config.url)} (${elapsedMs(response.config._requestStartedAt)}ms)`,
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    if (__DEV__) {
      const requestId = error.config?._requestId ?? 'unknown';
      console.warn(
        `[API ${requestId}] <- ${error.response?.status ?? error.code ?? 'ERROR'} ${error.config?.method?.toUpperCase() ?? 'REQUEST'} ${safeRouteLabel(error.config?.url)} (${elapsedMs(error.config?._requestStartedAt)}ms)`,
      );
    }

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
      const refreshedAccessToken = await refreshAccessTokenAfterUnauthorized();

      if (refreshedAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${refreshedAccessToken}`;
        return apiClient(originalRequest);
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
