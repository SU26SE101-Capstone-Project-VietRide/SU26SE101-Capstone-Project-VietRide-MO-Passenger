import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Location } from '@features/location/types/location';
import { searchStations, stationKeys } from '@features/trip/api/stationApi';
import type { StationSearchResult } from '@features/trip/types';
import type { Station } from '../types';

const STATION_STALE_TIME_MS = 10 * 60 * 1000;
const STATION_GC_TIME_MS = 30 * 60 * 1000;

const stationAddress = (station: StationSearchResult): string => {
  return [station.addressStreet, station.city, station.province]
    .filter(Boolean)
    .join(', ');
};

export const mapParcelStation = (
  station: StationSearchResult,
  index: number,
): Station => ({
  id: station.id,
  name: station.name,
  address: stationAddress(station) || station.name,
  distance: index === 0 ? 'Suggested terminal' : station.city || station.province || 'Terminal',
  isClosest: index === 0,
  rating: 4.8,
  reviewsCount: 0,
  city: station.city || station.province || '',
  workingHours: 'Terminal hours',
  acceptingParcels: true,
});

export function useParcelStations(location: Location | null) {
  const locationId = location?.id.trim() ?? '';

  const query = useQuery({
    queryKey: stationKeys.search(locationId),
    queryFn: () => searchStations(locationId),
    enabled: Boolean(locationId),
    staleTime: STATION_STALE_TIME_MS,
    gcTime: STATION_GC_TIME_MS,
    retry: 1,
    networkMode: 'offlineFirst',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const stations = useMemo(
    () => (query.data ?? []).map(mapParcelStation),
    [query.data],
  );

  return {
    ...query,
    stations,
  };
}
