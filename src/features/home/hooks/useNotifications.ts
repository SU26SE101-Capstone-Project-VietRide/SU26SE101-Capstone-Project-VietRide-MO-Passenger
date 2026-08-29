import { useRef } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { createIdempotencyKey } from '@shared/api/idempotency';
import { isUuid } from '@shared/utils/pathSegment';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationKeys,
  type ListNotificationsParams,
  type MarkAllNotificationsReadResult,
  type NotificationItemDto,
  type NotificationListKeyFilters,
  type PagedNotifications,
} from '../api/notificationApi';
import {
  NOTIFICATION_STALE_TIME_MS,
  trimNotificationInfiniteToFirstPage,
} from '../utils/notificationQueryFreshness';

/** Filters for the infinite list — cursor/page are never part of the query key. */
export type NotificationListFilters = NotificationListKeyFilters;

export const DEFAULT_NOTIFICATION_LIST_PARAMS: Required<NotificationListFilters> = {
  unreadOnly: false,
  pageSize: 30,
};

const normalizeListFilters = (
  params: NotificationListFilters = {},
): Required<NotificationListFilters> => ({
  unreadOnly: params.unreadOnly ?? DEFAULT_NOTIFICATION_LIST_PARAMS.unreadOnly,
  pageSize: params.pageSize ?? DEFAULT_NOTIFICATION_LIST_PARAMS.pageSize,
});

/**
 * pageParam:
 * - null → first page (unreadOnly + pageSize)
 * - string starting with "cursor:" → opaque cursor
 * - string starting with "page:" → numeric page fallback
 */
export type NotificationPageParam = string | null;

const cursorPageParam = (cursor: string): string => `cursor:${cursor}`;
const numericPageParam = (page: number): string => `page:${page}`;

const parsePageParam = (
  pageParam: NotificationPageParam,
  filters: Required<NotificationListFilters>,
): ListNotificationsParams => {
  if (!pageParam) {
    return {
      unreadOnly: filters.unreadOnly,
      pageSize: filters.pageSize,
    };
  }
  if (pageParam.startsWith('cursor:')) {
    return { cursor: pageParam.slice('cursor:'.length) };
  }
  if (pageParam.startsWith('page:')) {
    const page = Number(pageParam.slice('page:'.length));
    return {
      unreadOnly: filters.unreadOnly,
      pageSize: filters.pageSize,
      page: Number.isFinite(page) && page > 1 ? page : 1,
    };
  }
  // Legacy opaque string treated as cursor.
  return { cursor: pageParam };
};

type InfiniteNotifications = InfiniteData<PagedNotifications, NotificationPageParam>;

export function useNotifications(params: NotificationListFilters = {}) {
  const userId = useAuthStore((state) => state.user?.id);
  const filters = normalizeListFilters(params);

  return useInfiniteQuery({
    queryKey: notificationKeys.list(userId ?? 'none', filters),
    queryFn: ({ pageParam, signal }) => listNotifications(
      parsePageParam(pageParam, filters),
      signal,
    ),
    initialPageParam: null as NotificationPageParam,
    getNextPageParam: (lastPage): NotificationPageParam | undefined => {
      if (lastPage.nextCursor) {
        return cursorPageParam(lastPage.nextCursor);
      }
      // Real page fallback when BE still reports hasNextPage without cursor.
      if (lastPage.hasNextPage && lastPage.page < lastPage.totalPages) {
        return numericPageParam(lastPage.page + 1);
      }
      return undefined;
    },
    enabled: Boolean(userId),
    staleTime: NOTIFICATION_STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

/** Global unread badge — reuses list endpoint with pageSize=1 and reads totalItems. */
export function useNotificationUnreadCount() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: notificationKeys.unreadCount(userId ?? 'none'),
    queryFn: ({ signal }) => listNotifications({
      unreadOnly: true,
      pageSize: 1,
    }, signal),
    select: (data) => data.totalItems,
    enabled: Boolean(userId),
    staleTime: NOTIFICATION_STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useMarkNotificationRead(params: NotificationListFilters = {}) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const scopedUserId = userId ?? 'none';
  const filters = normalizeListFilters(params);
  const listQueryKey = notificationKeys.list(scopedUserId, filters);
  const unreadCountKey = notificationKeys.unreadCount(scopedUserId);

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!isUuid(notificationId)) {
        return;
      }
      await markNotificationRead(notificationId);
    },
    retry: 0,
    onMutate: async (notificationId) => {
      if (!isUuid(notificationId)) {
        return { previousList: undefined as InfiniteNotifications | undefined, previousUnread: undefined as number | undefined };
      }

      await queryClient.cancelQueries({ queryKey: listQueryKey });
      await queryClient.cancelQueries({ queryKey: unreadCountKey });

      const previousList = queryClient.getQueryData<InfiniteNotifications>(listQueryKey);
      const previousUnread = queryClient.getQueryData<PagedNotifications>(unreadCountKey);

      const wasUnread = previousList?.pages.some((page) =>
        page.items.some((item) => item.id === notificationId && !item.readAt),
      );
      const now = new Date().toISOString();

      // Patch only the active list key (not every user list variant).
      queryClient.setQueryData<InfiniteNotifications>(listQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (
              item.id === notificationId && !item.readAt
                ? { ...item, readAt: now }
                : item
            )),
          })),
        };
      });

      if (wasUnread && previousUnread) {
        queryClient.setQueryData<PagedNotifications>(unreadCountKey, {
          ...previousUnread,
          totalItems: Math.max(0, previousUnread.totalItems - 1),
        });
      }

      return { previousList, previousUnread };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(listQueryKey, context.previousList);
      }
      if (context?.previousUnread !== undefined) {
        queryClient.setQueryData(unreadCountKey, context.previousUnread);
      }
    },
    onSettled: () => {
      // Trim then invalidate only active list + unread (bounded refetch).
      trimNotificationInfiniteToFirstPage(queryClient, listQueryKey);
      queryClient.invalidateQueries({ queryKey: listQueryKey });
      queryClient.invalidateQueries({ queryKey: unreadCountKey });
    },
  });
}

/**
 * Mark-all with stable idempotency key for ambiguous retries.
 * Patches only rows with createdAt <= readAt; reduces unread by markedCount.
 */
export function useMarkAllNotificationsRead(params: NotificationListFilters = {}) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const scopedUserId = userId ?? 'none';
  const filters = normalizeListFilters(params);
  const listQueryKey = notificationKeys.list(scopedUserId, filters);
  const unreadCountKey = notificationKeys.unreadCount(scopedUserId);
  // Keep one key for the in-flight intent; reset only after success.
  const idempotencyKeyRef = useRef<string | null>(null);

  return useMutation({
    mutationFn: async (): Promise<MarkAllNotificationsReadResult> => {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = createIdempotencyKey('notification-read-all');
      }
      return markAllNotificationsRead(idempotencyKeyRef.current);
    },
    retry: 0,
    onSuccess: (result) => {
      idempotencyKeyRef.current = null;
      const cutoffMs = Date.parse(result.readAt);

      queryClient.setQueryData<InfiniteNotifications>(listQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.readAt) return item;
              const createdMs = Date.parse(item.createdAt);
              if (!Number.isFinite(cutoffMs) || !Number.isFinite(createdMs)) {
                return item;
              }
              if (createdMs <= cutoffMs) {
                return { ...item, readAt: result.readAt };
              }
              return item;
            }),
          })),
        };
      });

      const previousUnread = queryClient.getQueryData<PagedNotifications>(unreadCountKey);
      if (previousUnread) {
        queryClient.setQueryData<PagedNotifications>(unreadCountKey, {
          ...previousUnread,
          totalItems: Math.max(0, previousUnread.totalItems - result.markedCount),
        });
      }
    },
    onSettled: () => {
      trimNotificationInfiniteToFirstPage(queryClient, listQueryKey);
      queryClient.invalidateQueries({ queryKey: listQueryKey });
      queryClient.invalidateQueries({ queryKey: unreadCountKey });
    },
  });
}

/** Flatten infinite pages, dedupe by id, preserve server order (no full re-sort). */
export function flattenNotificationPages(
  data: InfiniteData<PagedNotifications, unknown> | undefined,
): NotificationItemDto[] {
  if (!data?.pages?.length) return [];

  const seen = new Set<string>();
  const items: NotificationItemDto[] = [];
  for (const page of data.pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}
