import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';

export type NotificationSortBy = 'createdAt' | 'readAt' | 'type';
export type NotificationSortDir = 'asc' | 'desc';

export interface NotificationItemDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
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

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params: ListNotificationsParams) =>
    [...notificationKeys.all, 'list', params] as const,
};

export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<PagedNotifications> {
  const response = await apiClient.get<ApiEnvelope<PagedNotifications>>('/notifications', {
    params: {
      unreadOnly: params.unreadOnly ?? false,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      sortBy: params.sortBy ?? 'createdAt',
      sortDir: params.sortDir ?? 'desc',
    },
  });

  return unwrapApiResponse(response.data);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiClient.post(`/notifications/${notificationId}/read`);
}
