import { QueryClient } from '@tanstack/react-query';

import {
  NOTIFICATION_STALE_TIME_MS,
  prepareNotificationListFocusRefetch,
  shouldRefetchNotificationQuery,
} from '../utils/notificationQueryFreshness';

describe('notification focus freshness', () => {
  const queryKey = ['notifications', 'user', 'list'] as const;
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => queryClient.clear());

  it('does not refetch a fresh query and refetches it after stale time', () => {
    queryClient.setQueryData(queryKey, { items: [] });
    const updatedAt = queryClient.getQueryState(queryKey)!.dataUpdatedAt;

    expect(shouldRefetchNotificationQuery(
      queryClient,
      queryKey,
      updatedAt + NOTIFICATION_STALE_TIME_MS - 1,
    )).toBe(false);
    expect(shouldRefetchNotificationQuery(
      queryClient,
      queryKey,
      updatedAt + NOTIFICATION_STALE_TIME_MS,
    )).toBe(true);
  });

  it('refetches an invalidated query but not one already fetching', async () => {
    queryClient.setQueryData(queryKey, { items: [] });
    await queryClient.invalidateQueries({ queryKey, refetchType: 'none' });
    expect(shouldRefetchNotificationQuery(queryClient, queryKey)).toBe(true);

    let resolveFetch: (() => void) | undefined;
    const fetching = queryClient.fetchQuery({
      queryKey,
      queryFn: () => new Promise<{ items: never[] }>((resolve) => {
        resolveFetch = () => resolve({ items: [] });
      }),
      staleTime: 0,
    });
    expect(shouldRefetchNotificationQuery(queryClient, queryKey)).toBe(false);
    resolveFetch?.();
    await fetching;
  });

  it('trims stale infinite data to its first page before focus refetch', () => {
    queryClient.setQueryData(queryKey, {
      pages: [
        { items: [{ id: 'first' }] },
        { items: [{ id: 'second' }] },
        { items: [{ id: 'third' }] },
      ],
      pageParams: [null, { cursor: 'page-2' }, { cursor: 'page-3' }],
    });
    const updatedAt = queryClient.getQueryState(queryKey)!.dataUpdatedAt;

    expect(prepareNotificationListFocusRefetch(
      queryClient,
      queryKey,
      updatedAt + NOTIFICATION_STALE_TIME_MS,
    )).toBe(true);
    expect(queryClient.getQueryData(queryKey)).toEqual({
      pages: [{ items: [{ id: 'first' }] }],
      pageParams: [null],
    });
  });

  it('keeps every cached page when focus data is still fresh', () => {
    const infiniteData = {
      pages: [
        { items: [{ id: 'first' }] },
        { items: [{ id: 'second' }] },
      ],
      pageParams: [null, { cursor: 'page-2' }],
    };
    queryClient.setQueryData(queryKey, infiniteData);
    const updatedAt = queryClient.getQueryState(queryKey)!.dataUpdatedAt;

    expect(prepareNotificationListFocusRefetch(
      queryClient,
      queryKey,
      updatedAt + NOTIFICATION_STALE_TIME_MS - 1,
    )).toBe(false);
    expect(queryClient.getQueryData(queryKey)).toEqual(infiniteData);
  });
});
