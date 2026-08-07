import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { isUuid } from '@shared/utils/pathSegment';
import {
  listNotifications,
  markNotificationRead,
  notificationKeys,
  type ListNotificationsParams,
  type NotificationItemDto,
  type PagedNotifications,
} from '../api/notificationApi';

/** Filters for the infinite list — page is never part of the query key. */
export type NotificationListFilters = Omit<ListNotificationsParams, 'page'>;

export const DEFAULT_NOTIFICATION_LIST_PARAMS: Required<NotificationListFilters> = {
  unreadOnly: false,
  pageSize: 30,
  sortBy: 'createdAt',
  sortDir: 'desc',
};

const normalizeListFilters = (
  params: NotificationListFilters = {},
): Required<NotificationListFilters> => ({
  unreadOnly: params.unreadOnly ?? DEFAULT_NOTIFICATION_LIST_PARAMS.unreadOnly,
  pageSize: params.pageSize ?? DEFAULT_NOTIFICATION_LIST_PARAMS.pageSize,
  sortBy: params.sortBy ?? DEFAULT_NOTIFICATION_LIST_PARAMS.sortBy,
  sortDir: params.sortDir ?? DEFAULT_NOTIFICATION_LIST_PARAMS.sortDir,
});

export function useNotifications(params: NotificationListFilters = {}) {
  const userId = useAuthStore((state) => state.user?.id);
  const filters = normalizeListFilters(params);

  return useInfiniteQuery({
    queryKey: notificationKeys.list(userId ?? 'none', filters),
    queryFn: ({ pageParam, signal }) => listNotifications({
      ...filters,
      page: pageParam,
    }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (
      lastPage.hasNextPage && lastPage.page < lastPage.totalPages
        ? lastPage.page + 1
        : undefined
    ),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
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
      page: 1,
      pageSize: 1,
      sortBy: 'createdAt',
      sortDir: 'desc',
    }, signal),
    select: (data) => data.totalItems,
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

type InfiniteNotifications = InfiniteData<PagedNotifications, number>;

export function useMarkNotificationRead(_params: NotificationListFilters = {}) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const scopedUserId = userId ?? 'none';
  const userQueryKey = notificationKeys.user(scopedUserId);
  const listQueryKey = notificationKeys.list(
    scopedUserId,
    normalizeListFilters(_params),
  );
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
        return { previousLists: [], previousUnread: undefined as number | undefined };
      }

      await queryClient.cancelQueries({ queryKey: userQueryKey });

      const previousLists = queryClient.getQueriesData<InfiniteNotifications>({
        queryKey: [...notificationKeys.user(scopedUserId), 'list'],
      });
      const previousUnread = queryClient.getQueryData<PagedNotifications>(unreadCountKey);

      const wasUnread = previousLists.some(([, data]) =>
        data?.pages.some((page) =>
          page.items.some((item) => item.id === notificationId && !item.readAt),
        ),
      );
      const now = new Date().toISOString();

      // Optimistically patch the item across every infinite page of this user.
      queryClient.setQueriesData<InfiniteNotifications>(
        { queryKey: [...notificationKeys.user(scopedUserId), 'list'] },
        (current) => {
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
        },
      );

      // Decrement unread count at most once if the item was previously unread.
      if (wasUnread && previousUnread) {
        queryClient.setQueryData<PagedNotifications>(unreadCountKey, {
          ...previousUnread,
          totalItems: Math.max(0, previousUnread.totalItems - 1),
        });
      }

      return { previousLists, previousUnread, listQueryKey };
    },
    onError: (_error, _notificationId, context) => {
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousUnread !== undefined) {
        queryClient.setQueryData(unreadCountKey, context.previousUnread);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKey });
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
