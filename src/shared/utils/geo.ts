import type { GeoCoordinate } from '@shared/types/common';

export const isValidLatitude = (latitude: number): boolean =>
  Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;

export const isValidLongitude = (longitude: number): boolean =>
  Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

/**
 * Checks coordinates before they cross into native map/location modules.
 * Keeping this guard shared avoids subtly different latitude/longitude rules
 * between Shuttle, device location and live tracking.
 */
export const isValidGeoCoordinate = (
  coordinate: Pick<GeoCoordinate, 'latitude' | 'longitude'>,
): boolean =>
  isValidLatitude(coordinate.latitude) &&
  isValidLongitude(coordinate.longitude);

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

/**
 * Returns the great-circle distance between two coordinates.
 * Invalid or unavailable coordinates deliberately return null so callers can
 * keep unknown locations at the end of a sorted list without inventing data.
 */
export const getGeoDistanceKm = (
  from: Pick<GeoCoordinate, 'latitude' | 'longitude'> | null | undefined,
  to: Pick<GeoCoordinate, 'latitude' | 'longitude'> | null | undefined,
): number | null => {
  if (
    !from ||
    !to ||
    !isValidGeoCoordinate(from) ||
    !isValidGeoCoordinate(to)
  ) {
    return null;
  }

  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const clampedHaversine = Math.min(1, Math.max(0, haversine));
  const angularDistance =
    2 *
    Math.atan2(Math.sqrt(clampedHaversine), Math.sqrt(1 - clampedHaversine));

  return EARTH_RADIUS_KM * angularDistance;
};
