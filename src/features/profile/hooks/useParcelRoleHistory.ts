import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { getReceivedParcels } from '@features/parcel/api/parcelApi';
import { getSentParcels } from '@features/parcel/api/parcelReliabilityApi';
import type { ParcelStatus } from '@features/parcel/types';
import { toApiError } from '@shared/api/errors';
import {
  getParcelStatusesForHistoryFilter,
  type ParcelHistoryFilter,
} from '../config/passengerHistoryFilters';
import type {
  PassengerHistoryItem,
  PassengerHistoryPage,
} from '../types';
import { comparePassengerHistoryNewestFirst } from '../utils/passengerHistoryMerge';
import {
  mapReceivedParcelToHistoryItem,
  mapSentParcelToHistoryItem,
} from '../utils/parcelHistoryAdapter';

export type ParcelHistoryRole = 'SENT' | 'RECEIVED';

const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 1) return false;
  const apiError = toApiError(error);
  return apiError.isNetworkError
    || apiError.statusCode === 408
    || apiError.statusCode === 429
    || Boolean(apiError.statusCode && apiError.statusCode >= 500);
};

const fetchSentPage = async (
  statuses: readonly ParcelStatus[] | undefined,
  page: number,
  pageSize: number,
  signal: AbortSignal,
): Promise<PassengerHistoryPage<PassengerHistoryItem>> => {
  const pages = await Promise.all(
    (statuses ?? [undefined]).map((status) => getSentParcels({
      ...(status ? { status } : {}),
      page,
      pageSize,
    }, signal)),
  );
  const seen = new Set<string>();
  const items = pages.flatMap((result) => result.items)
    .filter((item) => {
      if (seen.has(item.parcelId)) return false;
      seen.add(item.parcelId);
      return true;
    })
    .map(mapSentParcelToHistoryItem)
    .sort(comparePassengerHistoryNewestFirst);

  return {
    items,
    page,
    pageSize,
    totalItems: pages.reduce((sum, result) => sum + result.totalItems, 0),
    totalPages: Math.max(0, ...pages.map((result) => result.totalPages)),
    hasNextPage: pages.some((result) => result.hasNextPage),
    hasPreviousPage: page > 1,
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
  const userId = useAuthStore((state) => state.user?.id);
  const statuses = role === 'SENT'
    ? getParcelStatusesForHistoryFilter(filter)
    : undefined;

  return useInfiniteQuery({
    queryKey: [
      'parcel-role-history',
      userId ?? 'guest',
      role,
      role === 'SENT' ? filter : 'unfiltered',
      pageSize,
    ] as const,
    queryFn: ({ pageParam, signal }) => role === 'SENT'
      ? fetchSentPage(statuses, pageParam, pageSize, signal)
      : fetchReceivedPage(pageParam, pageSize, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasNextPage
      ? lastPage.page + 1
      : undefined,
    enabled: enabled && Boolean(userId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: shouldRetry,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
