import { ApiRequestError } from '@shared/api/errors';
import { isUuid } from '@shared/utils/pathSegment';
import { isValidBookingSeatCount } from '../constants/bookingLimits';
import type {
  BusTrip,
  CreateBookingPayload,
  DropOffPoint,
  PickUpPoint,
  Seat,
  ShuttlePickupDraft,
} from '../types';
import { toShuttlePickupPayload } from './shuttle';

export interface BookingLegDraft {
  trip: BusTrip | null;
  seats: Seat[];
  pickUp: PickUpPoint | null;
  dropOff: DropOffPoint | null;
  shuttlePickup?: ShuttlePickupDraft | null;
}

export type BookingLegPayload = Omit<
  CreateBookingPayload,
  'voucherCode' | 'paymentMethod'
>;

type BookingLocationPayload = CreateBookingPayload['pickup'];

const toLocationPayload = (
  point: PickUpPoint | DropOffPoint | null,
  fallbackStationId?: string,
): BookingLocationPayload | null => {
  if (point?.stationId) return { stationId: point.stationId };

  const stopId = point?.stopId ?? (isUuid(point?.id) ? point.id : undefined);
  if (stopId) return { stopId };

  return fallbackStationId ? { stationId: fallbackStationId } : null;
};

const requireLocation = (
  label: string,
  payload: BookingLocationPayload | null,
): BookingLocationPayload => {
  if (payload) return payload;

  throw new ApiRequestError({
    message: `${label} must resolve to exactly one station or stop.`,
    code: 'BOOKING_LOCATION_INVALID',
  });
};

const makeSeatRequests = (seats: Seat[]): CreateBookingPayload['seats'] => {
  if (!isValidBookingSeatCount(seats.length)) {
    throw new ApiRequestError({
      message: 'Please select between 1 and 5 seats before booking.',
      code: 'BOOKING_SEAT_COUNT_INVALID',
    });
  }

  return seats.map((seat) => ({ seatNumber: seat.id }));
};

export const buildBookingLegPayload = (
  leg: BookingLegDraft,
  label = 'Trip',
): BookingLegPayload => {
  if (!leg.trip) {
    throw new ApiRequestError({
      message: `${label} is required before booking.`,
      code: 'BOOKING_TRIP_REQUIRED',
    });
  }

  const pickup = requireLocation(
    `${label} pickup`,
    toLocationPayload(leg.pickUp, leg.trip.originStationId),
  );
  const dropoff = requireLocation(
    `${label} drop-off`,
    toLocationPayload(leg.dropOff, leg.trip.destinationStationId),
  );
  const shuttlePickup = toShuttlePickupPayload(
    leg.shuttlePickup ?? null,
    leg.trip,
    leg.pickUp,
  );

  return {
    tripId: leg.trip.id,
    pickup,
    dropoff,
    ...(shuttlePickup ? { shuttlePickup } : {}),
    seats: makeSeatRequests(leg.seats),
  };
};
