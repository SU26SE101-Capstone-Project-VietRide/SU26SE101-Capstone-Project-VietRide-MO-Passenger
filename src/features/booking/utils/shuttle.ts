import { ApiRequestError } from '@shared/api/errors';
import type {
  BusTrip,
  PickUpPoint,
  ShuttlePickupDraft,
  ShuttlePickupPayload,
} from '../types';
import type { StationDetail } from '@features/trip/types';

export const SHUTTLE_ADDRESS_MAX_LENGTH = 500;
export const SHUTTLE_REQUEST_CUTOFF_MINUTES = 30;

export interface ShuttlePickupValidationResult {
  value: ShuttlePickupPayload | null;
  error: string | null;
}

export type ShuttleEligibility =
  | { eligible: true; reason: null }
  | {
    eligible: false;
    reason:
      | 'BOARDING_POINT'
      | 'TRIP_STATUS'
      | 'TRIP_SCHEDULE'
      | 'CUTOFF'
      | 'STATION_INACTIVE'
      | 'STATION_UNSUPPORTED'
      | 'STATION_COORDINATES';
  };

const isCoordinateInRange = (
  value: number,
  minimum: number,
  maximum: number,
): boolean => Number.isFinite(value) && value >= minimum && value <= maximum;

export const validateShuttlePickup = (
  pickup: Pick<ShuttlePickupPayload, 'address' | 'latitude' | 'longitude'>,
): ShuttlePickupValidationResult => {
  const address = pickup.address.trim();

  if (!address) {
    return { value: null, error: 'Enter a pickup address.' };
  }

  if (address.length > SHUTTLE_ADDRESS_MAX_LENGTH) {
    return {
      value: null,
      error: `Pickup address must be ${SHUTTLE_ADDRESS_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!isCoordinateInRange(pickup.latitude, -90, 90)) {
    return { value: null, error: 'Pickup latitude is invalid.' };
  }

  if (!isCoordinateInRange(pickup.longitude, -180, 180)) {
    return { value: null, error: 'Pickup longitude is invalid.' };
  }

  return {
    value: {
      address,
      latitude: pickup.latitude,
      longitude: pickup.longitude,
    },
    error: null,
  };
};

export const isOriginStationPickup = (
  trip: Pick<BusTrip, 'originStationId'> | null,
  pickup: Pick<PickUpPoint, 'stationId' | 'stopId'> | null,
): boolean => Boolean(
  trip
  && pickup?.stationId === trip.originStationId
  && !pickup.stopId,
);

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

export const getShuttleEligibility = (
  trip: BusTrip,
  pickup: PickUpPoint | null,
  station: StationDetail,
  nowMs = Date.now(),
): ShuttleEligibility => {
  if (!isOriginStationPickup(trip, pickup)) {
    return { eligible: false, reason: 'BOARDING_POINT' };
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
    !isCoordinateInRange(station.latitude ?? Number.NaN, -90, 90)
    || !isCoordinateInRange(station.longitude ?? Number.NaN, -180, 180)
  ) {
    return { eligible: false, reason: 'STATION_COORDINATES' };
  }

  return { eligible: true, reason: null };
};

export const toShuttlePickupPayload = (
  draft: ShuttlePickupDraft | null,
  trip: BusTrip,
  pickup: PickUpPoint | null,
): ShuttlePickupPayload | undefined => {
  if (!draft) return undefined;

  if (
    draft.stationId !== trip.originStationId
    || !isOriginStationPickup(trip, pickup)
  ) {
    throw new ApiRequestError({
      message: 'Shuttle pickup is only available for boarding at the origin station.',
      code: 'SHUTTLE_PICKUP_STALE',
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

  const validation = validateShuttlePickup(draft);
  if (!validation.value) {
    throw new ApiRequestError({
      message: validation.error ?? 'Shuttle pickup is invalid.',
      code: 'SHUTTLE_PICKUP_INVALID',
    });
  }

  return validation.value;
};
