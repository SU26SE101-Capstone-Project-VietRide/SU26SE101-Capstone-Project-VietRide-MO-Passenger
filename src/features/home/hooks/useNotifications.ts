import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import {
  listNotifications,
  markNotificationRead,
  notificationKeys,
  type ListNotificationsParams,
  type PagedNotifications,
} from '../api/notificationApi';

type MarkNotificationReadInput = string | string[];

const DEFAULT_NOTIFICATION_PARAMS: Required<ListNotificationsParams> = {
  unreadOnly: false,
  page: 1,
  pageSize: 30,
  sortBy: 'createdAt',
  sortDir: 'desc',
};

const normalizeNotificationIds = (input: MarkNotificationReadInput): string[] =>
  (Array.isArray(input) ? input : [input]).filter(Boolean);

export function useNotifications(params: ListNotificationsParams = {}) {
  const user = useAuthStore((state) => state.user);
  const normalizedParams = { ...DEFAULT_NOTIFICATION_PARAMS, ...params };

  return useQuery({
    queryKey: user
      ? notificationKeys.list(normalizedParams)
      : [...notificationKeys.all, 'list', 'none'],
    queryFn: () => listNotifications(normalizedParams),
    enabled: Boolean(user),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    networkMode: 'offlineFirst',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useMarkNotificationRead(params: ListNotificationsParams = {}) {
  const queryClient = useQueryClient();
  const normalizedParams = { ...DEFAULT_NOTIFICATION_PARAMS, ...params };
  const queryKey = notificationKeys.list(normalizedParams);

  return useMutation({
    mutationFn: async (input: MarkNotificationReadInput) => {
      const notificationIds = normalizeNotificationIds(input);
      if (notificationIds.length === 0) {
        return;
      }

      await Promise.all(notificationIds.map(markNotificationRead));
    },
    retry: 0,
    onMutate: async (input) => {
      const notificationIds = new Set(normalizeNotificationIds(input));
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PagedNotifications>(queryKey);

      queryClient.setQueryData<PagedNotifications>(queryKey, (current) => {
        if (!current || notificationIds.size === 0) {
          return current;
        }

        const now = new Date().toISOString();
        return {
          ...current,
          items: current.items.map((item) =>
            notificationIds.has(item.id) && !item.readAt
              ? { ...item, readAt: now }
              : item,
          ),
        };
      });

      return { previous };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
