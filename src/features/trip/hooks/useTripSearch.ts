import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { searchTrips, tripKeys } from '../api/tripApi';
import type { BusTrip, TripSearchParams } from '../types';

export function useTripSearch(
  params: TripSearchParams
): UseQueryResult<BusTrip[], Error> {
  const hasStationPair = Boolean(params.originStationId && params.destinationStationId);
  const hasLocationPair = Boolean(params.originLocationCode && params.destinationLocationCode);
  const isEnabled = (hasStationPair || hasLocationPair) && Boolean(params.departureDate);
  
  return useQuery({
    queryKey: isEnabled ? tripKeys.search(params) : ['trips', 'search', 'none'],
    queryFn: () => searchTrips(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    networkMode: 'offlineFirst',
    refetchOnWindowFocus: false,
    enabled: isEnabled,
  });
}
