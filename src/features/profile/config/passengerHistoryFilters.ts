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

/**
 * Passenger-facing parcel chips. BE still accepts exactly one ParcelStatus, so
 * each chip maps to a group and the app fetches those statuses separately.
 *
 * Omitted on purpose (settlement v2 never writes them; leftover rows stay in All):
 * PENDING_OPERATOR_REVIEW, PENDING, PENDING_ADDITIONAL_PAYMENT.
 */
export const PARCEL_HISTORY_FILTER_GROUPS = {
  NEEDS_ACTION: [
    'PENDING_PAYMENT',
    'PENDING_FINAL_PAYMENT',
    'PENDING_OPERATOR_ACTION',
  ],
  IN_PROGRESS: [
    'RESERVED',
    'CHECKED_IN',
    'READY_TO_LOAD',
    'LOADED',
    'IN_TRANSIT',
    'PENDING_TRANSFER_CONFIRM',
    'TRANSFER_ESCALATED',
    'UNLOADED',
  ],
  AWAITING_CONFIRM: [
    'DELIVERED_PENDING_CONFIRM',
  ],
  DELIVERED: [
    'DELIVERY_CONFIRMED',
  ],
  CLOSED: [
    'DELIVERY_REJECTED',
    'RETURN_INITIATED',
    'RETURNED',
    'CANCELLED',
    'REJECTED',
    'EXPIRED',
  ],
} as const satisfies Record<string, readonly ParcelStatus[]>;

export const PASSENGER_PARCEL_HISTORY_FILTERS = [
  'NEEDS_ACTION',
  'IN_PROGRESS',
  'AWAITING_CONFIRM',
  'DELIVERED',
  'CLOSED',
] as const satisfies ReadonlyArray<keyof typeof PARCEL_HISTORY_FILTER_GROUPS>;

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
  NEEDS_ACTION: 'bookingHistory.filters.needsAction',
  IN_PROGRESS: 'bookingHistory.filters.inProgress',
  AWAITING_CONFIRM: 'bookingHistory.filters.awaitingConfirm',
  DELIVERED: 'bookingHistory.filters.delivered',
  CLOSED: 'bookingHistory.filters.closed',
} as const;

export type TicketHistoryFilter =
  | 'ALL'
  | (typeof PASSENGER_TICKET_HISTORY_FILTERS)[number];

export type ParcelHistoryFilter =
  | 'ALL'
  | (typeof PASSENGER_PARCEL_HISTORY_FILTERS)[number];

export const getParcelStatusesForHistoryFilter = (
  filter: ParcelHistoryFilter,
): readonly ParcelStatus[] | undefined => {
  if (filter === 'ALL') {
    return undefined;
  }

  return PARCEL_HISTORY_FILTER_GROUPS[filter];
};