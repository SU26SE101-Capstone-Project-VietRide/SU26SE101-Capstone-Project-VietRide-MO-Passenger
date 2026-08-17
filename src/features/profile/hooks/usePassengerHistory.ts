import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { toApiError } from '@shared/api/errors';
import type { ParcelStatus } from '@features/parcel/types';
import {
  getPassengerHistory,
  passengerHistoryKeys,
  PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
} from '../api/passengerHistoryApi';
import {
  getParcelStatusesForHistoryFilter,
  type ParcelHistoryFilter,
} from '../config/passengerHistoryFilters';
import type {
  PassengerHistoryItem,
  PassengerHistoryPage,
  PassengerHistoryQueryInput,
} from '../types';
import { comparePassengerHistoryNewestFirst } from '../utils/passengerHistoryMerge';

export {
  comparePassengerHistoryNewestFirst,
  flattenPassengerHistoryPages,
} from '../utils/passengerHistoryMerge';

const PASSENGER_HISTORY_STALE_TIME_MS = 60 * 1000;
const PASSENGER_HISTORY_GC_TIME_MS = 5 * 60 * 1000;

const getNextPassengerHistoryPage = (
  lastPage: PassengerHistoryPage<PassengerHistoryItem>,
): number | undefined => (
  lastPage.hasNextPage ? lastPage.page + 1 : undefined
);

const shouldRetryPassengerHistory = (
  failureCount: number,
  error: unknown,
): boolean => {
  if (failureCount >= 1) return false;
  const apiError = toApiError(error);
  const status = apiError.statusCode;
  return apiError.isNetworkError
    || status === undefined
    || status === 408
    || status === 429
    || Boolean(status && status >= 500);
};

export function usePassengerHistory(
  query: PassengerHistoryQueryInput,
  enabled = true,
) {
  const userId = useAuthStore((state) => state.user?.id);

  const fetchPage = ({
    pageParam,
    signal,
  }: {
    pageParam: number;
    signal: AbortSignal;
  }) => query.type === 'TICKET'
    ? getPassengerHistory(
      {
        ...query,
        type: 'TICKET',
        page: pageParam,
      },
      signal,
    )
    : getPassengerHistory(
      {
        ...query,
        type: 'PARCEL',
        page: pageParam,
      },
      signal,
    );

  return useInfiniteQuery({
    queryKey: passengerHistoryKeys.list(userId ?? 'guest', query),
    queryFn: fetchPage,
    initialPageParam: 1,
    getNextPageParam: getNextPassengerHistoryPage,
    enabled: enabled && Boolean(userId),
    staleTime: PASSENGER_HISTORY_STALE_TIME_MS,
    gcTime: PASSENGER_HISTORY_GC_TIME_MS,
    retry: shouldRetryPassengerHistory,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

const fetchMergedParcelHistoryPage = async (
  statuses: readonly ParcelStatus[],
  page: number,
  pageSize: number,
  signal: AbortSignal,
): Promise<PassengerHistoryPage<PassengerHistoryItem>> => {
  const pages = await Promise.all(
    statuses.map(status => getPassengerHistory(
      {
        type: 'PARCEL',
        status,
        page,
        pageSize,
      },
      signal,
    )),
  );

  const seen = new Set<string>();
  const items: PassengerHistoryItem[] = [];
  for (const result of pages) {
    for (const item of result.items) {
      if (seen.has(item.id)) {
        continue;
      }
      seen.add(item.id);
      items.push(item);
    }
  }

  items.sort(comparePassengerHistoryNewestFirst);

  return {
    items,
    page,
    pageSize,
    totalItems: pages.reduce((sum, result) => sum + result.totalItems, 0),
    totalPages: Math.max(1, ...pages.map(result => result.totalPages)),
    hasNextPage: pages.some(result => result.hasNextPage),
    hasPreviousPage: page > 1,
  };
};

export function usePassengerParcelHistory(
  filter: ParcelHistoryFilter,
  pageSize = PASSENGER_HISTORY_DEFAULT_PAGE_SIZE,
  enabled = true,
) {
  const userId = useAuthStore((state) => state.user?.id);
  const statuses = getParcelStatusesForHistoryFilter(filter);

  return useInfiniteQuery({
    queryKey: passengerHistoryKeys.parcelGroup(
      userId ?? 'guest',
      filter,
      pageSize,
    ),
    queryFn: ({ pageParam, signal }) => {
      if (!statuses) {
        return getPassengerHistory(
          {
            type: 'PARCEL',
            page: pageParam,
            pageSize,
          },
          signal,
        );
      }

      if (statuses.length === 1) {
        return getPassengerHistory(
          {
            type: 'PARCEL',
            status: statuses[0],
            page: pageParam,
            pageSize,
          },
          signal,
        );
      }

      return fetchMergedParcelHistoryPage(
        statuses,
        pageParam,
        pageSize,
        signal,
      );
    },
    initialPageParam: 1,
    getNextPageParam: getNextPassengerHistoryPage,
    enabled: enabled && Boolean(userId),
    staleTime: PASSENGER_HISTORY_STALE_TIME_MS,
    gcTime: PASSENGER_HISTORY_GC_TIME_MS,
    retry: shouldRetryPassengerHistory,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
