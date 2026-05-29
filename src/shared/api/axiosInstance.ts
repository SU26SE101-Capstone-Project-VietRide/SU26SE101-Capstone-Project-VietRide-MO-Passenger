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
import { getToken, clearToken } from '@shared/utils/storage';

// ─── Instance ─────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request Interceptor ──────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (__DEV__) {
      console.log(
        `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
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

    // Handle 401 — Unauthorized (token expired or invalid)
    if (status === 401) {
      await clearToken();

      // The auth store listener will detect the token clear
      // and navigate to the Auth flow automatically.
      if (__DEV__) {
        console.warn('[API] 401 — Token expired, clearing credentials.');
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
  message: string;
  success: boolean;
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
