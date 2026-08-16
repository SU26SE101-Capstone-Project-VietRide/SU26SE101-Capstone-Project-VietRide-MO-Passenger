import type { BookingStatus } from '@features/booking/types';
import type { ParcelStatus } from '@features/parcel/types';

/**
 * GET /v1/passenger/history?type=TICKET&status= accepts every BookingStatus.
 * Chips are the passenger-facing subset; PARTIAL_NO_SHOW stays in All only.
 */
export const PASSENGER_TICKET_HISTORY_FILTERS = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'DISRUPTED',
  'REFUNDED',
  'NO_SHOW',
] as const satisfies readonly BookingStatus[];

export const PASSENGER_PARCEL_HISTORY_FILTERS = [
  'PENDING_PAYMENT',
  'IN_TRANSIT',
  'DELIVERY_CONFIRMED',
  'CANCELLED',
  'EXPIRED',
] as const satisfies readonly ParcelStatus[];

export const TICKET_HISTORY_FILTER_LABEL_KEYS = {
  ALL: 'bookingHistory.filters.all',
  PENDING_PAYMENT: 'bookingHistory.filters.pendingPayment',
  CONFIRMED: 'bookingHistory.filters.confirmed',
  COMPLETED: 'bookingHistory.filters.completed',
  CANCELLED: 'bookingHistory.filters.cancelled',
  EXPIRED: 'bookingHistory.filters.expired',
  DISRUPTED: 'bookingHistory.filters.disrupted',
  REFUNDED: 'bookingHistory.filters.refunded',
  NO_SHOW: 'bookingHistory.filters.noShow',
} as const;

export const PARCEL_HISTORY_FILTER_LABEL_KEYS = {
  ALL: 'bookingHistory.filters.all',
  PENDING_PAYMENT: 'bookingHistory.filters.pendingPayment',
  IN_TRANSIT: 'bookingHistory.filters.inTransit',
  DELIVERY_CONFIRMED: 'bookingHistory.filters.delivered',
  CANCELLED: 'bookingHistory.filters.cancelled',
  EXPIRED: 'bookingHistory.filters.expired',
} as const;

export type TicketHistoryFilter =
  | 'ALL'
  | (typeof PASSENGER_TICKET_HISTORY_FILTERS)[number];

export type ParcelHistoryFilter =
  | 'ALL'
  | (typeof PASSENGER_PARCEL_HISTORY_FILTERS)[number];
