import * as Location from 'expo-location';

import type { GeoCoordinate } from '@shared/types/common';
import { isValidGeoCoordinate } from '@shared/utils/geo';

const DEFAULT_LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;
const MAX_GEOCODE_ADDRESS_LENGTH = 500;

export type DeviceLocationErrorCode =
  | 'permission-denied'
  | 'position-unavailable'
  | 'invalid-address'
  | 'invalid-coordinates'
  | 'address-not-found'
  | 'geocoding-unavailable';

const SAFE_ERROR_MESSAGES: Record<DeviceLocationErrorCode, string> = {
  'permission-denied': 'Location access was not granted.',
  'position-unavailable': 'Your current location is unavailable. Please try again.',
  'invalid-address': 'Enter a valid address.',
  'invalid-coordinates': 'The selected coordinates are invalid.',
  'address-not-found': 'No location was found for this address.',
  'geocoding-unavailable': 'Address lookup is unavailable. Please try again.',
};

/**
 * Stable, privacy-safe error exposed to feature UIs.
 * Native error messages are deliberately not retained because they may contain
 * device or location details and must not reach logs or crash breadcrumbs.
 */
export class DeviceLocationError extends Error {
  readonly code: DeviceLocationErrorCode;
  readonly canAskAgain?: boolean;

  constructor(code: DeviceLocationErrorCode, canAskAgain?: boolean) {
    super(SAFE_ERROR_MESSAGES[code]);
    this.name = 'DeviceLocationError';
    this.code = code;
    this.canAskAgain = canAskAgain;
  }
}

export const isDeviceLocationError = (error: unknown): error is DeviceLocationError => {
  return error instanceof DeviceLocationError;
};

export interface ForegroundLocationPermission {
  granted: true;
  canAskAgain: boolean;
}

export interface GetCurrentCoordinatesOptions {
  lastKnownMaxAgeMs?: number;
  onLastKnownCoordinates?: (coordinates: GeoCoordinate) => void;
}

export interface GeocodedAddress {
  city: string | null;
  district: string | null;
  streetNumber: string | null;
  street: string | null;
  region: string | null;
  subregion: string | null;
  country: string | null;
  postalCode: string | null;
  name: string | null;
  isoCountryCode: string | null;
  formattedAddress: string | null;
}

const toCoordinates = (
  value: Pick<Location.LocationGeocodedLocation, 'latitude' | 'longitude'>,
): GeoCoordinate => {
  const coordinates = {
    latitude: value.latitude,
    longitude: value.longitude,
  };

  if (!isValidGeoCoordinate(coordinates)) {
    throw new DeviceLocationError('invalid-coordinates');
  }

  return coordinates;
};

/** Request foreground access only when a feature is actively asking for location. */
export const requestForegroundLocationPermission = async (): Promise<ForegroundLocationPermission> => {
  let permission: Location.LocationPermissionResponse;

  try {
    permission = await Location.requestForegroundPermissionsAsync();
  } catch {
    throw new DeviceLocationError('permission-denied');
  }

  if (!permission.granted && permission.status !== Location.PermissionStatus.GRANTED) {
    throw new DeviceLocationError('permission-denied', permission.canAskAgain);
  }

  return {
    granted: true,
    canAskAgain: permission.canAskAgain,
  };
};

/**
 * Emits a recent native location early when available, then resolves with a
 * fresh Balanced-accuracy location. Permission must be requested explicitly by
 * the calling, user-visible flow before invoking this function.
 */
export const getCurrentCoordinates = async ({
  lastKnownMaxAgeMs = DEFAULT_LAST_KNOWN_MAX_AGE_MS,
  onLastKnownCoordinates,
}: GetCurrentCoordinatesOptions = {}): Promise<GeoCoordinate> => {
  const safeLastKnownMaxAgeMs = Number.isFinite(lastKnownMaxAgeMs)
    ? Math.max(0, lastKnownMaxAgeMs)
    : DEFAULT_LAST_KNOWN_MAX_AGE_MS;

  try {
    const lastKnownPosition = await Location.getLastKnownPositionAsync({
      maxAge: safeLastKnownMaxAgeMs,
    });

    if (lastKnownPosition) {
      onLastKnownCoordinates?.(toCoordinates(lastKnownPosition.coords));
    }
  } catch {
    // A missing/invalid cache must not prevent a fresh native location lookup.
  }

  try {
    const currentPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return toCoordinates(currentPosition.coords);
  } catch (error) {
    if (isDeviceLocationError(error)) {
      throw error;
    }
    throw new DeviceLocationError('position-unavailable');
  }
};

/**
 * Resolve a user-entered address without retaining or logging the query.
 * Android callers must request foreground permission in the user-visible flow.
 */
export const geocodeAddress = async (address: string): Promise<GeoCoordinate> => {
  const normalizedAddress = address.trim();
  if (!normalizedAddress || normalizedAddress.length > MAX_GEOCODE_ADDRESS_LENGTH) {
    throw new DeviceLocationError('invalid-address');
  }

  let candidates: Location.LocationGeocodedLocation[];
  try {
    candidates = await Location.geocodeAsync(normalizedAddress);
  } catch {
    throw new DeviceLocationError('geocoding-unavailable');
  }

  const firstCandidate = candidates[0];
  if (!firstCandidate) {
    throw new DeviceLocationError('address-not-found');
  }

  return toCoordinates(firstCandidate);
};

/**
 * Resolve coordinates into a structured native address without persistence.
 * Android callers must request foreground permission in the user-visible flow.
 */
export const reverseGeocodeCoordinates = async (
  coordinates: GeoCoordinate,
): Promise<GeocodedAddress> => {
  if (!isValidGeoCoordinate(coordinates)) {
    throw new DeviceLocationError('invalid-coordinates');
  }

  let candidates: Location.LocationGeocodedAddress[];
  try {
    candidates = await Location.reverseGeocodeAsync(coordinates);
  } catch {
    throw new DeviceLocationError('geocoding-unavailable');
  }

  const firstCandidate = candidates[0];
  if (!firstCandidate) {
    throw new DeviceLocationError('address-not-found');
  }

  return firstCandidate;
};

const appendUniqueAddressPart = (parts: string[], value: string | null): void => {
  const normalized = value?.trim();
  if (!normalized) {
    return;
  }

  const comparisonValue = normalized.toLocaleLowerCase();
  if (!parts.some((part) => part.toLocaleLowerCase() === comparisonValue)) {
    parts.push(normalized);
  }
};

/** Create review-friendly address copy from platform-specific geocoder fields. */
export const formatGeocodedAddress = (address: GeocodedAddress): string => {
  const formattedAddress = address.formattedAddress?.trim();
  if (formattedAddress) {
    return formattedAddress;
  }

  const parts: string[] = [];
  appendUniqueAddressPart(parts, address.name);
  appendUniqueAddressPart(
    parts,
    [address.streetNumber, address.street].filter(Boolean).join(' ') || null,
  );
  appendUniqueAddressPart(parts, address.district);
  appendUniqueAddressPart(parts, address.city);
  appendUniqueAddressPart(parts, address.subregion);
  appendUniqueAddressPart(parts, address.region);
  appendUniqueAddressPart(parts, address.country);
  return parts.join(', ');
};
