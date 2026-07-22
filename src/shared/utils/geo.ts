import type { GeoCoordinate } from '@shared/types/common';

export const isValidLatitude = (latitude: number): boolean => Number.isFinite(latitude)
  && latitude >= -90
  && latitude <= 90;

export const isValidLongitude = (longitude: number): boolean => Number.isFinite(longitude)
  && longitude >= -180
  && longitude <= 180;

/**
 * Checks coordinates before they cross into native map/location modules.
 * Keeping this guard shared avoids subtly different latitude/longitude rules
 * between Shuttle, device location and live tracking.
 */
export const isValidGeoCoordinate = (
  coordinate: Pick<GeoCoordinate, 'latitude' | 'longitude'>,
): boolean => isValidLatitude(coordinate.latitude)
  && isValidLongitude(coordinate.longitude);
