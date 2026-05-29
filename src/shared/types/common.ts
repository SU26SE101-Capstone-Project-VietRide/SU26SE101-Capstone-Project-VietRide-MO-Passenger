/**
 * Shared Types — Common TypeScript types & enums
 */

// ─── API Response Types ───────────────────────────────────

export interface ApiErrorResponse {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

// ─── Pagination ───────────────────────────────────────────

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  hasNextPage: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

// ─── Common Entity Types ──────────────────────────────────

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface TimeRange {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}
