import { useQuery } from '@tanstack/react-query';
import type { Location } from '@features/location/types/location';
import { searchStations, stationKeys } from '../api/stationApi';

const STATION_STALE_TIME_MS = 10 * 60 * 1000;
const STATION_GC_TIME_MS = 30 * 60 * 1000;

export function useStationSearch(location: Location | null) {
  const locationId = location?.id.trim() ?? '';

  return useQuery({
    queryKey: stationKeys.search(locationId),
    queryFn: ({ signal }) => searchStations(locationId, signal),
    enabled: Boolean(locationId),
    staleTime: STATION_STALE_TIME_MS,
    gcTime: STATION_GC_TIME_MS,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
