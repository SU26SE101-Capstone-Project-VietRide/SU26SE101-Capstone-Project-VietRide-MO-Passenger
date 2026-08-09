import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import { createIdempotencyKey } from '@shared/api/idempotency';
import { z } from 'zod';

export interface NotificationItemDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface PagedNotifications {
  items: NotificationItemDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  /** Opaque keyset cursor for the next page (BE v1.63+). */
  nextCursor: string | null;
}

export interface ListNotificationsParams {
  unreadOnly?: boolean;
  pageSize?: number;
  /** Opaque cursor from a previous page; omit on first page / refresh. */
  cursor?: string;
  /**
   * Page fallback only when BE returns hasNextPage without nextCursor
   * (pre-keyset or partial deploy). Prefer cursor when present.
   */
  page?: number;
}

/** Filters for the infinite list key — cursor/page are never part of the key. */
export type NotificationListKeyFilters = Omit<ListNotificationsParams, 'cursor' | 'page'>;

export const notificationKeys = {
  all: ['notifications'] as const,
  user: (userId: string) => [...notificationKeys.all, userId] as const,
  /** Infinite list key: userId + filters only (no cursor/page). */
  list: (userId: string, filters: NotificationListKeyFilters) =>
    [...notificationKeys.user(userId), 'list', filters] as const,
  unreadCount: (userId: string) =>
    [...notificationKeys.user(userId), 'unread-count'] as const,
};

const notificationItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string().trim().min(1),
  title: z.string(),
  body: z.string(),
  data: z.unknown().nullable(),
  readAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

const pagedNotificationsSchema = z.object({
  items: z.array(notificationItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  // Missing nextCursor → null; hooks may fall back to page when hasNextPage.
  nextCursor: z.string().trim().min(1).nullable().optional().default(null),
});

export interface MarkAllNotificationsReadResult {
  markedCount: number;
  readAt: string;
}

const markAllReadResultSchema = z.object({
  markedCount: z.number().int().nonnegative(),
  readAt: z.string().datetime({ offset: true }),
}).strict();

/**
 * List notifications.
 * First page: unreadOnly + pageSize (server order createdAt DESC, id DESC).
 * Subsequent pages: opaque cursor only (BE keyset). Do not send sort params.
 */
export async function listNotifications(
  params: ListNotificationsParams = {},
  signal?: AbortSignal,
): Promise<PagedNotifications> {
  const query: Record<string, string | number | boolean> = {};
  if (params.cursor) {
    query.cursor = params.cursor;
  } else {
    query.unreadOnly = params.unreadOnly ?? false;
    query.pageSize = params.pageSize ?? 20;
    if (params.page && params.page > 1) {
      query.page = params.page;
    }
  }

  const response = await apiClient.get<ApiEnvelope<PagedNotifications>>('/notifications', {
    params: query,
    ...(signal ? { signal } : {}),
  });

  return pagedNotificationsSchema.parse(unwrapApiResponse(response.data));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const notificationIdSegment = encodeUuidPathSegment(notificationId, 'notificationId');
  await apiClient.post(`/notifications/${notificationIdSegment}/read`, undefined, {
    headers: { 'Idempotency-Key': createIdempotencyKey('notification-read') },
  });
}

/**
 * Mark all notifications read as of server cutoff.
 * Reuse the same idempotency key when retrying an ambiguous in-flight intent.
 */
export async function markAllNotificationsRead(
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<MarkAllNotificationsReadResult> {
  const response = await apiClient.post<ApiEnvelope<MarkAllNotificationsReadResult>>(
    '/notifications/read-all',
    undefined,
    {
      headers: { 'Idempotency-Key': idempotencyKey },
      ...(signal ? { signal } : {}),
    },
  );
  return markAllReadResultSchema.parse(unwrapApiResponse(response.data));
}
