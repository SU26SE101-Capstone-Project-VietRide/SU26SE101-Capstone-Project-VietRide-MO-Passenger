import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { getReceivedParcels } from '@features/parcel/api/parcelApi';
import { getSentParcels } from '@features/parcel/api/parcelReliabilityApi';
import type { ParcelStatus } from '@features/parcel/types';
import { toApiError } from '@shared/api/errors';
import { passengerHistoryKeys } from '../api/passengerHistoryApi';
import {
  getParcelStatusesForHistoryFilter,
  type ParcelHistoryFilter,
} from '../config/passengerHistoryFilters';
import type { PassengerHistoryItem, PassengerHistoryPage } from '../types';
import {
  mapReceivedParcelToHistoryItem,
  mapSentParcelToHistoryItem,
} from '../utils/parcelHistoryAdapter';
import { comparePassengerHistoryNewestFirst } from '../utils/passengerHistoryMerge';

export type ParcelHistoryRole = 'SENT' | 'RECEIVED';

const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 1) return false;
  const apiError = toApiError(error);
  return (
    apiError.isNetworkError ||
    apiError.statusCode === 408 ||
    apiError.statusCode === 429 ||
    Boolean(apiError.statusCode && apiError.statusCode >= 500)
  );
};

const fetchSentPage = async (
  status: ParcelStatus | undefined,
  page: number,
  pageSize: number,
  signal: AbortSignal,
): Promise<PassengerHistoryPage<PassengerHistoryItem>> => {
  const result = await getSentParcels(
    {
      ...(status ? { status } : {}),
      page,
      pageSize,
    },
    signal,
  );
  return {
    ...result,
    items: result.items.map(mapSentParcelToHistoryItem),
  };
};

const fetchMergedSentPage = async (
  statuses: readonly ParcelStatus[],
  page: number,
  pageSize: number,
  signal: AbortSignal,
): Promise<PassengerHistoryPage<PassengerHistoryItem>> => {
  const pages = await Promise.all(
    statuses.map(status => fetchSentPage(status, page, pageSize, signal)),
  );
  const seen = new Set<string>();
  const items: PassengerHistoryItem[] = [];

  for (const result of pages) {
    for (const item of result.items) {
      if (seen.has(item.id)) continue;
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
    hasPreviousPage: pages.some(result => result.hasPreviousPage),
  };
};

const fetchReceivedPage = async (
  page: number,
  pageSize: number,
  signal: AbortSignal,
): Promise<PassengerHistoryPage<PassengerHistoryItem>> => {
  const result = await getReceivedParcels(page, pageSize, signal);
  return {
    ...result,
    items: result.items.map(mapReceivedParcelToHistoryItem),
  };
};

export function useParcelRoleHistory(
  role: ParcelHistoryRole,
  filter: ParcelHistoryFilter,
  pageSize: number,
  enabled = true,
) {
  const userId = useAuthStore(state => state.user?.id);
  const statuses = getParcelStatusesForHistoryFilter(filter);

  return useInfiniteQuery({
    queryKey: [
      ...passengerHistoryKeys.user(userId ?? 'guest'),
      'PARCEL_ROLE',
      role,
      role === 'SENT' ? filter : 'unfiltered',
      pageSize,
    ] as const,
    queryFn: ({ pageParam, signal }) => {
      if (role === 'RECEIVED') {
        return fetchReceivedPage(pageParam, pageSize, signal);
      }
      if (!statuses) {
        return fetchSentPage(undefined, pageParam, pageSize, signal);
      }
      if (statuses.length === 1) {
        return fetchSentPage(statuses[0], pageParam, pageSize, signal);
      }
      return fetchMergedSentPage(statuses, pageParam, pageSize, signal);
    },
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    enabled: enabled && Boolean(userId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: shouldRetry,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
