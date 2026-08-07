import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import { createIdempotencyKey } from '@shared/api/idempotency';
import { z } from 'zod';

export type NotificationSortBy = 'createdAt' | 'readAt' | 'type';
export type NotificationSortDir = 'asc' | 'desc';

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
}

export interface ListNotificationsParams {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: NotificationSortBy;
  sortDir?: NotificationSortDir;
}

export type NotificationListKeyFilters = Omit<ListNotificationsParams, 'page'>;

export const notificationKeys = {
  all: ['notifications'] as const,
  user: (userId: string) => [...notificationKeys.all, userId] as const,
  /** Infinite list key: userId + normalized filters, never includes page. */
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
});

export async function listNotifications(
  params: ListNotificationsParams = {},
  signal?: AbortSignal,
): Promise<PagedNotifications> {
  const response = await apiClient.get<ApiEnvelope<PagedNotifications>>('/notifications', {
    params: {
      unreadOnly: params.unreadOnly ?? false,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      sortBy: params.sortBy ?? 'createdAt',
      sortDir: params.sortDir ?? 'desc',
    },
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
