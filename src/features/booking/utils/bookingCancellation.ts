import type { BookingStatus } from '../types';

const CANCELLABLE_BOOKING_STATUSES: ReadonlySet<BookingStatus> = new Set([
  'CONFIRMED',
  'PENDING_PAYMENT',
]);

const TRIP_STATUSES_HIDING_CANCEL = new Set([
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'DISRUPTED',
]);

export interface BookingCancelEligibility {
  bookingStatus: string;
  tripStatus?: string | null;
}

/** Hide cancel once the trip is running or already finished. */
export const canCancelBooking = (
  statusOrInput: string | BookingCancelEligibility,
): boolean => {
  const input = typeof statusOrInput === 'string'
    ? { bookingStatus: statusOrInput }
    : statusOrInput;

  if (!CANCELLABLE_BOOKING_STATUSES.has(input.bookingStatus as BookingStatus)) {
    return false;
  }

  const tripStatus = input.tripStatus?.trim().toUpperCase();
  if (tripStatus && TRIP_STATUSES_HIDING_CANCEL.has(tripStatus)) {
    return false;
  }

  return true;
};
