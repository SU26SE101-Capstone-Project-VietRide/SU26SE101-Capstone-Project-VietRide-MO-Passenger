import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from '@tanstack/react-query';

import type { PagedNotifications } from '../api/notificationApi';

export const NOTIFICATION_STALE_TIME_MS = 30 * 1000;

export const shouldRefetchNotificationQuery = (
  queryClient: QueryClient,
  queryKey: QueryKey,
  now = Date.now(),
): boolean => {
  const state = queryClient.getQueryState(queryKey);
  if (!state || state.fetchStatus === 'fetching') return false;
  if (state.isInvalidated || state.dataUpdatedAt === 0) return true;
  return now - state.dataUpdatedAt >= NOTIFICATION_STALE_TIME_MS;
};

type InfiniteNotifications = InfiniteData<PagedNotifications, unknown>;

/** Keep only the first page so a focus refresh cannot refetch every cached page. */
export const trimNotificationInfiniteToFirstPage = (
  queryClient: QueryClient,
  queryKey: QueryKey,
): void => {
  queryClient.setQueryData<InfiniteNotifications>(queryKey, (current) => {
    if (!current?.pages?.length) return current;
    return {
      pages: [current.pages[0]],
      pageParams: [current.pageParams[0] ?? null],
    };
  });
};

export const prepareNotificationListFocusRefetch = (
  queryClient: QueryClient,
  queryKey: QueryKey,
  now = Date.now(),
): boolean => {
  if (!shouldRefetchNotificationQuery(queryClient, queryKey, now)) {
    return false;
  }
  trimNotificationInfiniteToFirstPage(queryClient, queryKey);
  return true;
};
