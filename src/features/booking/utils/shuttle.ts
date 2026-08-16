import { ApiRequestError } from '@shared/api/errors';
import {
  getGeoDistanceKm,
  isValidGeoCoordinate,
  isValidLatitude,
  isValidLongitude,
} from '@shared/utils/geo';
import type {
  BusTrip,
  DropOffPoint,
  PickUpPoint,
  ShuttleServiceDirection,
  ShuttleServiceDraft,
  ShuttleServicePayload,
} from '../types';
import type { StationDetail } from '@features/trip/types';

export const SHUTTLE_ADDRESS_MAX_LENGTH = 500;
export const SHUTTLE_REQUEST_CUTOFF_MINUTES = 30;
/** Matches Trip `ShuttleDistancePolicy.DefaultMaxDistanceMeters` (inclusive). */
export const SHUTTLE_MAX_ROAD_DISTANCE_KM = 10;
export const SHUTTLE_MAX_ROAD_DISTANCE_METERS = SHUTTLE_MAX_ROAD_DISTANCE_KM * 1_000;

export type ShuttleServiceStatus = 'loading' | 'available' | 'unavailable' | 'error';

export interface ShuttleServiceValidationResult {
  value: ShuttleServicePayload | null;
  error: string | null;
}

/**
 * Build the wire `address` for Shuttle from Google Places fields.
 *
 * Place.displayName is the POI title (e.g. "S802 Origami"); formattedAddress is
 * the street/area line (e.g. "Long Bình, Quận 9, HCM"). Saving only the
 * formatted line drops the building/POI name — that is incorrect for drivers.
 *
 * Prefer: "Display Name, Formatted Address" when the name is not already
 * present in the formatted line; never invent a place name.
 */
export const composeShuttleServiceAddress = (
  displayName: string | null | undefined,
  formattedAddress: string | null | undefined,
  maxLength: number = SHUTTLE_ADDRESS_MAX_LENGTH,
): string => {
  const name = (displayName ?? '').trim().replace(/\s+/g, ' ');
  const formatted = (formattedAddress ?? '').trim().replace(/\s+/g, ' ');

  if (!name && !formatted) {
    return '';
  }
  if (!name) {
    return formatted.slice(0, maxLength);
  }
  if (!formatted) {
    return name.slice(0, maxLength);
  }

  const nameLower = name.toLowerCase();
  const formattedLower = formatted.toLowerCase();
  // Avoid "S802 Origami, S802 Origami, Long Binh..." when formatted already
  // starts with or fully contains the display name as a prefix token.
  if (
    formattedLower === nameLower
    || formattedLower.startsWith(`${nameLower},`)
    || formattedLower.startsWith(`${nameLower} `)
  ) {
    return formatted.slice(0, maxLength);
  }

  const composed = `${name}, ${formatted}`;
  if (composed.length <= maxLength) {
    return composed;
  }

  // Prefer keeping the POI name; trim the street line if over cap.
  const separator = ', ';
  const budget = maxLength - name.length - separator.length;
  if (budget < 8) {
    return name.slice(0, maxLength);
  }
  return `${name}${separator}${formatted.slice(0, budget).trim()}`;
};

export type ShuttleEligibility =
  | { eligible: true; reason: null }
  | {
    eligible: false;
    reason:
      | 'BOARDING_POINT'
      | 'ALIGHTING_POINT'
      | 'TRIP_STATUS'
      | 'TRIP_SCHEDULE'
      | 'CUTOFF'
      | 'STATION_INACTIVE'
      | 'STATION_UNSUPPORTED'
      | 'STATION_COORDINATES';
  };

export const validateShuttleService = (
  service: Pick<ShuttleServicePayload, 'address' | 'latitude' | 'longitude'>,
): ShuttleServiceValidationResult => {
  const address = service.address.trim();

  if (!address) {
    return { value: null, error: 'Enter a Shuttle service address.' };
  }

  if (address.length > SHUTTLE_ADDRESS_MAX_LENGTH) {
    return {
      value: null,
      error: `Shuttle address must be ${SHUTTLE_ADDRESS_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!isValidLatitude(service.latitude)) {
    return { value: null, error: 'Shuttle latitude is invalid.' };
  }

  if (!isValidLongitude(service.longitude)) {
    return { value: null, error: 'Shuttle longitude is invalid.' };
  }

  return {
    value: {
      address,
      latitude: service.latitude,
      longitude: service.longitude,
    },
    error: null,
  };
};

export type ShuttleStationDistanceCheck =
  | { ok: true; distanceMeters: number }
  | { ok: false; reason: 'TOO_FAR'; distanceMeters: number }
  | { ok: false; reason: 'COORDINATES' };

/**
 * Client pre-check against the same 10 km cap BE uses for Google Routes.
 * Straight-line distance is never shorter than road distance, so a miss here
 * will also fail `SHUTTLE_DISTANCE_EXCEEDED`. Pickup compares to the origin
 * station; drop-off compares to the destination station.
 */
export const checkShuttleAddressAgainstStation = (
  address: Pick<ShuttleServicePayload, 'latitude' | 'longitude'>,
  station: Pick<{ latitude: number; longitude: number }, 'latitude' | 'longitude'>,
): ShuttleStationDistanceCheck => {
  const distanceKm = getGeoDistanceKm(address, station);
  if (distanceKm === null) {
    return { ok: false, reason: 'COORDINATES' };
  }

  const distanceMeters = distanceKm * 1_000;
  if (distanceMeters > SHUTTLE_MAX_ROAD_DISTANCE_METERS) {
    return { ok: false, reason: 'TOO_FAR', distanceMeters };
  }

  return { ok: true, distanceMeters };
};

export const validateShuttlePickup = validateShuttleService;

export const isOriginStationPickup = (
  trip: Pick<BusTrip, 'originStationId'> | null,
  pickup: Pick<PickUpPoint, 'stationId' | 'stopId'> | null,
): boolean => Boolean(
  trip
  && pickup?.stationId === trip.originStationId
  && !pickup.stopId,
);

export const isDestinationStationDropoff = (
  trip: Pick<BusTrip, 'destinationStationId'> | null,
  dropoff: Pick<DropOffPoint, 'stationId' | 'stopId'> | null,
): boolean => Boolean(
  trip
  && dropoff?.stationId === trip.destinationStationId
  && !dropoff.stopId,
);

const isEligibleTerminalPoint = (
  trip: BusTrip,
  point: PickUpPoint | DropOffPoint | null,
  direction: ShuttleServiceDirection,
): boolean => direction === 'pickup'
  ? isOriginStationPickup(trip, point)
  : isDestinationStationDropoff(trip, point);

export const isShuttleRequestCutoffPassed = (
  departureDateTime?: string,
  nowMs = Date.now(),
): boolean => {
  if (!departureDateTime) return false;

  const departureMs = Date.parse(departureDateTime);
  if (!Number.isFinite(departureMs)) return false;

  const cutoffMs = departureMs - SHUTTLE_REQUEST_CUTOFF_MINUTES * 60_000;
  return nowMs >= cutoffMs;
};

export const hasValidShuttleTripSchedule = (
  departureDateTime?: string,
): boolean => Boolean(
  departureDateTime
  && Number.isFinite(Date.parse(departureDateTime)),
);

export const getShuttleServiceEligibility = (
  trip: BusTrip,
  point: PickUpPoint | DropOffPoint | null,
  station: StationDetail,
  direction: ShuttleServiceDirection,
): ShuttleEligibility => {
  if (!isEligibleTerminalPoint(trip, point, direction)) {
    return {
      eligible: false,
      reason: direction === 'pickup' ? 'BOARDING_POINT' : 'ALIGHTING_POINT',
    };
  }
  if (trip.status !== 'SCHEDULED') {
    return { eligible: false, reason: 'TRIP_STATUS' };
  }
  if (!hasValidShuttleTripSchedule(trip.departureDateTime)) {
    return { eligible: false, reason: 'TRIP_SCHEDULE' };
  }
  if (!station.isActive) {
    return { eligible: false, reason: 'STATION_INACTIVE' };
  }
  if (!station.supportsShuttle) {
    return { eligible: false, reason: 'STATION_UNSUPPORTED' };
  }
  if (
    !isValidGeoCoordinate({
      latitude: station.latitude ?? Number.NaN,
      longitude: station.longitude ?? Number.NaN,
    })
  ) {
    return { eligible: false, reason: 'STATION_COORDINATES' };
  }

  return { eligible: true, reason: null };
};

export const getShuttleEligibility = (
  trip: BusTrip,
  pickup: PickUpPoint | null,
  station: StationDetail,
): ShuttleEligibility => getShuttleServiceEligibility(
  trip,
  pickup,
  station,
  'pickup',
);

export const toShuttleServicePayload = (
  draft: ShuttleServiceDraft | null,
  trip: BusTrip,
  point: PickUpPoint | DropOffPoint | null,
  direction: ShuttleServiceDirection,
): ShuttleServicePayload | undefined => {
  if (!draft) return undefined;

  const stationId = direction === 'pickup'
    ? trip.originStationId
    : trip.destinationStationId;
  if (
    draft.stationId !== stationId
    || !isEligibleTerminalPoint(trip, point, direction)
  ) {
    throw new ApiRequestError({
      message: direction === 'pickup'
        ? 'Shuttle pickup is only available for boarding at the origin station.'
        : 'Shuttle drop-off is only available for alighting at the destination station.',
      code: direction === 'pickup' ? 'SHUTTLE_PICKUP_STALE' : 'SHUTTLE_DROPOFF_STALE',
    });
  }

  if (trip.status !== 'SCHEDULED') {
    throw new ApiRequestError({
      message: 'This trip is no longer accepting Shuttle pickup requests.',
      code: 'SHUTTLE_TRIP_NOT_SCHEDULED',
    });
  }

  if (!hasValidShuttleTripSchedule(trip.departureDateTime)) {
    throw new ApiRequestError({
      message: 'Shuttle availability cannot be verified for this trip.',
      code: 'SHUTTLE_TRIP_SCHEDULE_UNAVAILABLE',
    });
  }

  const validation = validateShuttleService(draft);
  if (!validation.value) {
    throw new ApiRequestError({
      message: validation.error ?? 'Shuttle service address is invalid.',
      code: direction === 'pickup' ? 'SHUTTLE_PICKUP_INVALID' : 'SHUTTLE_DROPOFF_INVALID',
    });
  }

  return validation.value;
};

export const toShuttlePickupPayload = (
  draft: ShuttleServiceDraft | null,
  trip: BusTrip,
  pickup: PickUpPoint | null,
): ShuttleServicePayload | undefined => toShuttleServicePayload(
  draft,
  trip,
  pickup,
  'pickup',
);

export const toShuttleDropoffPayload = (
  draft: ShuttleServiceDraft | null,
  trip: BusTrip,
  dropoff: DropOffPoint | null,
): ShuttleServicePayload | undefined => toShuttleServicePayload(
  draft,
  trip,
  dropoff,
  'dropoff',
);

export const SHUTTLE_ERROR_TRANSLATION_KEYS: Readonly<Record<string, string>> = {
  SHUTTLE_DISTANCE_EXCEEDED: 'booking.shuttle.apiErrors.distanceExceeded',
  SHUTTLE_DISTANCE_UNAVAILABLE: 'booking.shuttle.apiErrors.distanceUnavailable',
  SHUTTLE_REQUEST_CUTOFF_PASSED: 'booking.shuttle.apiErrors.cutoffPassed',
  SHUTTLE_STATION_NOT_SUPPORTED: 'booking.shuttle.apiErrors.stationUnsupported',
  SHUTTLE_PICKUP_STALE: 'booking.shuttle.apiErrors.selectionStale',
  SHUTTLE_DROPOFF_STALE: 'booking.shuttle.apiErrors.selectionStale',
  SHUTTLE_TRIP_NOT_SCHEDULED: 'booking.shuttle.apiErrors.tripUnavailable',
  SHUTTLE_TRIP_SCHEDULE_UNAVAILABLE: 'booking.shuttle.apiErrors.scheduleUnavailable',
  SHUTTLE_PICKUP_INVALID: 'booking.shuttle.apiErrors.addressInvalid',
  SHUTTLE_DROPOFF_INVALID: 'booking.shuttle.apiErrors.addressInvalid',
  BOOKING_ROUND_TRIP_INVALID: 'booking.paymentScreen.roundTripInvalid',
  BOOKING_SEAT_UNAVAILABLE: 'booking.paymentScreen.seatUnavailable',
  ROUTE_RETURN_NOT_CONFIGURED: 'booking.paymentScreen.returnRouteNotConfigured',
};

/** Errors that keep the Shuttle draft so the user can edit the address. */
export const SHUTTLE_DRAFT_PRESERVING_ERROR_CODES = new Set([
  'SHUTTLE_DISTANCE_EXCEEDED',
  'SHUTTLE_DISTANCE_UNAVAILABLE',
  'SHUTTLE_PICKUP_INVALID',
  'SHUTTLE_DROPOFF_INVALID',
]);

export const getUserFacingShuttleErrorMessage = (
  error: { code: string; message?: string; statusCode?: number } | null | undefined,
  translate: (key: string, options?: Record<string, unknown>) => string,
): string | null => {
  if (!error) return null;

  if (
    error.code === 'SHUTTLE_DISTANCE_EXCEEDED'
    || /SHUTTLE_DISTANCE_EXCEEDED/i.test(error.message ?? '')
  ) {
    return translate('booking.shuttle.apiErrors.distanceExceeded', {
      limitKm: SHUTTLE_MAX_ROAD_DISTANCE_KM,
    });
  }

  const mappedKey = SHUTTLE_ERROR_TRANSLATION_KEYS[error.code];
  if (mappedKey) {
    return translate(mappedKey, { limitKm: SHUTTLE_MAX_ROAD_DISTANCE_KM });
  }

  if (error.statusCode === 422) {
    return translate('booking.shuttle.apiErrors.unprocessable');
  }

  return null;
};

export const getShuttleChangeAddressDirection = (
  errorCode: string | null | undefined,
): ShuttleServiceDirection | 'both' | null => {
  if (!errorCode) {
    return null;
  }
  if (errorCode === 'SHUTTLE_DROPOFF_INVALID' || errorCode === 'SHUTTLE_DROPOFF_STALE') {
    return 'dropoff';
  }
  if (errorCode === 'SHUTTLE_PICKUP_INVALID' || errorCode === 'SHUTTLE_PICKUP_STALE') {
    return 'pickup';
  }
  if (SHUTTLE_DRAFT_PRESERVING_ERROR_CODES.has(errorCode)) {
    return 'both';
  }
  return null;
};
