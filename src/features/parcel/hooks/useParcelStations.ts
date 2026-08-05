import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Location } from '@features/location/types/location';
import { searchStations, stationKeys } from '@features/trip/api/stationApi';
import type { StationSearchResult } from '@features/trip/types';
import type { CurrentCoordinates } from '@shared/hooks/useCurrentCoordinates';
import { getGeoDistanceKm } from '@shared/utils/geo';
import i18n from '@shared/i18n';
import type { Station } from '../types';

const STATION_STALE_TIME_MS = 10 * 60 * 1000;
const STATION_GC_TIME_MS = 30 * 60 * 1000;

const stationAddress = (station: StationSearchResult): string => {
  return [station.addressStreet, station.ward, station.city]
    .filter(Boolean)
    .join(', ');
};

const getStationDistanceKm = (
  from: CurrentCoordinates | null,
  station: StationSearchResult,
): number | null => {
  if (!from || station.latitude == null || station.longitude == null) {
    return null;
  }

  return getGeoDistanceKm(from, {
    latitude: station.latitude,
    longitude: station.longitude,
  });
};

const formatDistance = (
  distanceKm: number | null,
  t: TFunction,
): string | null => {
  if (distanceKm == null) {
    return null;
  }

  if (distanceKm < 1) {
    return t('parcel.stations.distanceMeters', {
      distance: Math.round(distanceKm * 1000),
    });
  }

  return t('parcel.stations.distanceKilometers', {
    distance: distanceKm.toFixed(distanceKm < 10 ? 1 : 0),
  });
};

export const mapParcelStation = (
  station: StationSearchResult,
  index: number,
  currentCoordinates: CurrentCoordinates | null = null,
  isResolvingCurrentLocation = false,
  precomputedDistanceKm?: number | null,
  t: TFunction = i18n.t,
): Station => {
  const distanceKm =
    precomputedDistanceKm === undefined
      ? getStationDistanceKm(currentCoordinates, station)
      : precomputedDistanceKm;

  return {
    id: station.id,
    name: station.name,
    address: stationAddress(station) || station.name,
    distance:
      formatDistance(distanceKm, t) ??
      (isResolvingCurrentLocation &&
      station.latitude != null &&
      station.longitude != null
        ? t('parcel.stations.calculatingDistance')
        : null),
    isClosest: index === 0 && distanceKm != null,
    city: station.city || station.ward || '',
  };
};

export function useParcelStations(
  location: Location | null,
  enabled = true,
  currentCoordinates: CurrentCoordinates | null = null,
  isResolvingCurrentLocation = false,
) {
  const { t } = useTranslation();
  const locationId = location?.id.trim() ?? '';

  const query = useQuery({
    queryKey: stationKeys.search(locationId),
    queryFn: ({ signal }) => searchStations(locationId, signal),
    enabled: enabled && Boolean(locationId),
    staleTime: STATION_STALE_TIME_MS,
    gcTime: STATION_GC_TIME_MS,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const stations = useMemo(() => {
    const data = Array.isArray(query.data) ? query.data : [];
    return data
      .map((station, sourceIndex) => ({
        station,
        sourceIndex,
        distanceKm: getStationDistanceKm(currentCoordinates, station),
      }))
      .sort((left, right) => {
        const leftDistance = left.distanceKm;
        const rightDistance = right.distanceKm;

        if (leftDistance == null && rightDistance == null) {
          return left.sourceIndex - right.sourceIndex;
        }

        if (leftDistance == null) {
          return 1;
        }

        if (rightDistance == null) {
          return -1;
        }

        return (
          leftDistance - rightDistance || left.sourceIndex - right.sourceIndex
        );
      })
      .map(({ station, distanceKm }, index) =>
        mapParcelStation(
          station,
          index,
          currentCoordinates,
          isResolvingCurrentLocation,
          distanceKm,
          t,
        ),
      );
  }, [currentCoordinates, isResolvingCurrentLocation, query.data, t]);

  return {
    ...query,
    stations,
  };
}
