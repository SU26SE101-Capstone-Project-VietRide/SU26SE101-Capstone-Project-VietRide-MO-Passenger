import type { BookingStatus } from '../types';

const CANCELLABLE_BOOKING_STATUSES: ReadonlySet<BookingStatus> = new Set([
  'CONFIRMED',
  'PENDING_PAYMENT',
]);

export const canCancelBooking = (status: string): boolean => (
  CANCELLABLE_BOOKING_STATUSES.has(status as BookingStatus)
);
