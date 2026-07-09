import { useQuery } from '@tanstack/react-query';
import type { Location } from '@features/location/types/location';
import { searchStations, stationKeys } from '../api/stationApi';

const STATION_STALE_TIME_MS = 10 * 60 * 1000;
const STATION_GC_TIME_MS = 30 * 60 * 1000;

export function useStationSearch(location: Location | null, q: string) {
  const normalizedQuery = q.trim();
  const locationName = location?.name ?? '';
  const locationType = location?.type ?? 'PROVINCE';

  return useQuery({
    queryKey: stationKeys.search(normalizedQuery, locationName, locationType),
    queryFn: () => searchStations(normalizedQuery, locationName, locationType),
    enabled: Boolean(location && normalizedQuery),
    staleTime: STATION_STALE_TIME_MS,
    gcTime: STATION_GC_TIME_MS,
    retry: 1,
    networkMode: 'offlineFirst',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
