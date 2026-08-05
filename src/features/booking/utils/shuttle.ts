import { ApiRequestError } from '@shared/api/errors';
import {
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

export type ShuttleServiceStatus = 'loading' | 'available' | 'unavailable' | 'error';

export interface ShuttleServiceValidationResult {
  value: ShuttleServicePayload | null;
  error: string | null;
}

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
  nowMs = Date.now(),
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
  if (isShuttleRequestCutoffPassed(trip.departureDateTime, nowMs)) {
    return { eligible: false, reason: 'CUTOFF' };
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
  nowMs = Date.now(),
): ShuttleEligibility => getShuttleServiceEligibility(
  trip,
  pickup,
  station,
  'pickup',
  nowMs,
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

  if (isShuttleRequestCutoffPassed(trip.departureDateTime)) {
    throw new ApiRequestError({
      message: 'Shuttle pickup must be requested at least 30 minutes before departure.',
      code: 'SHUTTLE_REQUEST_CUTOFF_PASSED',
      statusCode: 409,
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
};
