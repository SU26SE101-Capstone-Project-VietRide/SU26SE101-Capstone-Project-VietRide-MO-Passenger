import type { PassengerTicketStatus } from '@features/profile/types';

export interface BookingHistoryListKeyInput {
  status?: PassengerTicketStatus;
  from?: string;
  to?: string;
  pageSize?: number;
}

export const bookingHistoryKeys = {
  root: ['bookings', 'history'] as const,
  user: (userId: string) => [...bookingHistoryKeys.root, userId] as const,
  ticketSnapshot: (userId: string, bookingId: string) => [
    ...bookingHistoryKeys.user(userId),
    'ticket-snapshot',
    bookingId,
  ] as const,
  replacementTrip: (userId: string, bookingId: string, sourceTripId: string) => [
    ...bookingHistoryKeys.user(userId),
    'replacement-trip',
    bookingId.toLowerCase(),
    sourceTripId.toLowerCase(),
  ] as const,
  paymentRefresh: (userId: string, bookingIds: readonly string[]) => [
    ...bookingHistoryKeys.user(userId),
    'payment-refresh',
    ...bookingIds.map(bookingId => bookingId.toLowerCase()),
  ] as const,
  list: (userId: string, query: BookingHistoryListKeyInput) => [
    ...bookingHistoryKeys.user(userId),
    query.status ?? 'all',
    query.from ?? 'any-from',
    query.to ?? 'any-to',
    query.pageSize ?? 10,
  ] as const,
};
