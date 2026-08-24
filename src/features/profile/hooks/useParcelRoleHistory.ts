import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { getReceivedParcels } from '@features/parcel/api/parcelApi';
import { getSentParcels } from '@features/parcel/api/parcelReliabilityApi';
import { toApiError } from '@shared/api/errors';
import type { PassengerHistoryItem, PassengerHistoryPage } from '../types';
import {
  mapReceivedParcelToHistoryItem,
  mapSentParcelToHistoryItem,
} from '../utils/parcelHistoryAdapter';

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
  page: number,
  pageSize: number,
  signal: AbortSignal,
): Promise<PassengerHistoryPage<PassengerHistoryItem>> => {
  const result = await getSentParcels({ page, pageSize }, signal);
  return {
    ...result,
    items: result.items.map(mapSentParcelToHistoryItem),
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
  pageSize: number,
  enabled = true,
) {
  const userId = useAuthStore(state => state.user?.id);

  return useInfiniteQuery({
    queryKey: [
      'parcel-role-history',
      userId ?? 'guest',
      role,
      pageSize,
    ] as const,
    queryFn: ({ pageParam, signal }) =>
      role === 'SENT'
        ? fetchSentPage(pageParam, pageSize, signal)
        : fetchReceivedPage(pageParam, pageSize, signal),
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
