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
import { joinUrl, normalizeApiPath, normalizeUrlBase, isAbsoluteUrl } from '@shared/utils/url';
import {
  refreshAccessTokenAfterUnauthorized,
  resolveStoredAccessToken,
} from './authSession';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    skipAuth?: boolean;
    _retry?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
    skipAuth?: boolean;
    _retry?: boolean;
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

    const accessToken = config.skipAuth
      ? null
      : await resolveStoredAccessToken({
        skipRefresh: config.skipAuthRefresh || isAuthRoute(config.url),
      });

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (__DEV__) {
      const reqId = Math.random().toString(36).slice(2, 10);
      console.log(`\n======================================`);
      console.log(`[API REQ ${reqId}] ${config.method?.toUpperCase()} ${joinUrl(config.baseURL, config.url)}`);
      console.log('  Headers:', JSON.parse(JSON.stringify(config.headers)));
      if (config.data) {
        console.log('  Body:', JSON.stringify(config.data, null, 2));
      }
      if (config.params) {
        console.log('  Params:', config.params);
      }
      console.log(`======================================\n`);
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
      console.log(`\n======================================`);
      console.log(`[API RES ${reqId}] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
      console.log('  Status:', response.status, response.statusText);
      console.log('  Data:', JSON.stringify(response.data, null, 2));
      console.log(`======================================\n`);
    }
    return response;
  },
  async (error: AxiosError) => {
    if (__DEV__) {
      const reqId = (error.config as unknown as Record<string, unknown>)?._reqId ?? '????';
      console.log(`\n======================================`);
      console.log(`[API ERR ${reqId}] ${error.response?.status || error.code || 'UNKNOWN'} ${error.config?.method?.toUpperCase() || ''} ${error.config?.url || ''}`);
      console.log('  Message:', error.message);
      if (error.response?.data) {
        console.log('  Data:', JSON.stringify(error.response.data, null, 2));
      }
      console.log(`======================================\n`);
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
