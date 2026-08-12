import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getSeatMap, tripKeys } from '../api/tripApi';
import type { SeatMapLayout } from '../types';

export function useSeatMap(
  tripId: string | undefined,
): UseQueryResult<SeatMapLayout, Error> {
  return useQuery({
    queryKey: tripId ? tripKeys.seats(tripId) : ['trips', 'seats', 'none'],
    queryFn: ({ signal }) => getSeatMap(tripId!, signal),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!tripId,
  });
}
