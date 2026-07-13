import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Location } from '@features/location/types/location';
import { searchStations, stationKeys } from '@features/trip/api/stationApi';
import type { StationSearchResult } from '@features/trip/types';
import type { Station } from '../types';
import type { CurrentCoordinates } from './useCurrentCoordinates';

const STATION_STALE_TIME_MS = 10 * 60 * 1000;
const STATION_GC_TIME_MS = 30 * 60 * 1000;

const stationAddress = (station: StationSearchResult): string => {
  return [station.addressStreet, station.city, station.province]
    .filter(Boolean)
    .join(', ');
};

const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

const getDistanceKm = (
  from: CurrentCoordinates | null,
  station: StationSearchResult,
): number | null => {
  if (
    !from
    || station.latitude == null
    || station.longitude == null
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const latDelta = toRadians(station.latitude - from.latitude);
  const lonDelta = toRadians(station.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const stationLat = toRadians(station.latitude);

  const haversine =
    Math.sin(latDelta / 2) ** 2
    + Math.cos(fromLat) * Math.cos(stationLat) * Math.sin(lonDelta / 2) ** 2;
  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusKm * angularDistance;
};

const formatDistance = (distanceKm: number | null): string | null => {
  if (distanceKm == null) {
    return null;
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }

  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km away`;
};

export const mapParcelStation = (
  station: StationSearchResult,
  index: number,
  currentCoordinates: CurrentCoordinates | null = null,
  isResolvingCurrentLocation = false,
): Station => ({
  id: station.id,
  name: station.name,
  address: stationAddress(station) || station.name,
  distance: formatDistance(getDistanceKm(currentCoordinates, station))
    ?? (isResolvingCurrentLocation && station.latitude != null && station.longitude != null
      ? 'Calculating distance...'
      : null)
    ?? (index === 0 ? 'Suggested terminal' : station.city || station.province || 'Terminal'),
  isClosest: index === 0,
  rating: 4.8,
  reviewsCount: 0,
  city: station.city || station.province || '',
  workingHours: 'Terminal hours',
  acceptingParcels: true,
});

export function useParcelStations(
  location: Location | null,
  enabled = true,
  currentCoordinates: CurrentCoordinates | null = null,
  isResolvingCurrentLocation = false,
) {
  const locationId = location?.id.trim() ?? '';

  const query = useQuery({
    queryKey: stationKeys.search(locationId),
    queryFn: () => searchStations(locationId),
    enabled: enabled && Boolean(locationId),
    staleTime: STATION_STALE_TIME_MS,
    gcTime: STATION_GC_TIME_MS,
    retry: 1,
    networkMode: 'offlineFirst',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const stations = useMemo(() => {
    const data = Array.isArray(query.data) ? query.data : [];
    return [...data]
      .sort((left, right) => {
        const leftDistance = getDistanceKm(currentCoordinates, left);
        const rightDistance = getDistanceKm(currentCoordinates, right);

        if (leftDistance == null && rightDistance == null) {
          return 0;
        }

        if (leftDistance == null) {
          return 1;
        }

        if (rightDistance == null) {
          return -1;
        }

        return leftDistance - rightDistance;
      })
      .map((station, index) => mapParcelStation(
        station,
        index,
        currentCoordinates,
        isResolvingCurrentLocation,
      ));
  }, [currentCoordinates, isResolvingCurrentLocation, query.data]);

  return {
    ...query,
    stations,
  };
}
