import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getTripDetail, tripKeys } from '../api/tripApi';
import type { TripDetail } from '../types';

export function useTripDetail(
  tripId: string | undefined,
): UseQueryResult<TripDetail, Error> {
  return useQuery({
    queryKey: tripId ? tripKeys.detail(tripId) : ['trips', 'detail', 'none'],
    queryFn: ({ signal }) => getTripDetail(tripId!, signal),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!tripId,
  });
}
