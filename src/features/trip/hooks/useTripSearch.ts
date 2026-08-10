import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { searchTrips, tripKeys } from '../api/tripApi';
import type { BusTrip, TripSearchParams } from '../types';

const hasStationPair = (p: TripSearchParams): boolean =>
  Boolean(p.originStationId?.trim() && p.destinationStationId?.trim());

const hasProvincePair = (p: TripSearchParams): boolean =>
  Boolean(p.originProvinceCode?.trim() && p.destinationProvinceCode?.trim());

/** Mirrors SearchTripsValidator.HaveStationPairOrLocationPair. */
export const canSearchTrips = (params: TripSearchParams): boolean =>
  (hasStationPair(params) || hasProvincePair(params))
  && Boolean(params.departureDate?.trim())
  && params.passengerCount > 0;

export function useTripSearch(
  params: TripSearchParams,
): UseQueryResult<BusTrip[], Error> {
  const enabled = canSearchTrips(params);

  return useQuery({
    queryKey: enabled ? tripKeys.search(params) : ['trips', 'search', 'disabled'],
    queryFn: ({ signal }) => searchTrips(params, signal),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled,
  });
}
