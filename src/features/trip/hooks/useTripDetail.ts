import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getTripDetail, tripKeys } from '../api/tripApi';
import type { TripDetail } from '../types';

interface UseTripDetailOptions {
  enabled?: boolean;
  staleTimeMs?: number;
  getRefetchInterval?: (trip: TripDetail | undefined) => number | false;
}

export function useTripDetail(
  tripId: string | undefined,
  {
    enabled = true,
    staleTimeMs = 5 * 60 * 1000,
    getRefetchInterval,
  }: UseTripDetailOptions = {},
): UseQueryResult<TripDetail, Error> {
  return useQuery({
    queryKey: tripId ? tripKeys.detail(tripId) : ['trips', 'detail', 'none'],
    queryFn: ({ signal }) => getTripDetail(tripId!, signal),
    staleTime: staleTimeMs,
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: getRefetchInterval
      ? (query) => getRefetchInterval(query.state.data)
      : false,
    enabled: enabled && Boolean(tripId),
  });
}
