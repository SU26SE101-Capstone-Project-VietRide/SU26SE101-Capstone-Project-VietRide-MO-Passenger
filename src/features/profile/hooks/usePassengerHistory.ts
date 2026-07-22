import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { toApiError } from '@shared/api/errors';
import {
  getPassengerHistory,
  passengerHistoryKeys,
} from '../api/passengerHistoryApi';
import type {
  PassengerHistoryItem,
  PassengerHistoryPage,
  PassengerHistoryQueryInput,
} from '../types';

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
