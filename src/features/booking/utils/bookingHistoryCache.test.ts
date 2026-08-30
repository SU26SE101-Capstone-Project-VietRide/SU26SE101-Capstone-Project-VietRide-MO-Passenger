import { QueryClient } from '@tanstack/react-query';

jest.mock('../api/bookingHistoryKeys', () => {
  const root = ['bookings', 'history'] as const;
  const user = (userId: string) => [...root, userId] as const;
  return {
    bookingHistoryKeys: {
      root,
      user,
      ticketSnapshot: (userId: string, bookingId: string) => [
        ...user(userId), 'ticket-snapshot', bookingId,
      ] as const,
      list: (userId: string, query: { pageSize?: number }) => [
        ...user(userId),
        'all',
        'any-from',
        'any-to',
        query.pageSize ?? 10,
      ] as const,
    },
  };
});

import { bookingHistoryKeys } from '../api/bookingHistoryKeys';
import { reconcilePassengerHistoryBookingStatus } from './bookingPayment';
import {
  selectFresherBookingHistoryTicketSnapshot,
  updateBookingHistoryTicketCaches,
  upsertBookingHistoryTicketSnapshot,
} from './bookingHistoryCache';
import type {
  PassengerHistoryPage,
  PassengerTicketHistoryItem,
} from '@features/profile/types';

const userId = '11111111-1111-4111-8111-111111111111';
const pendingItem: PassengerTicketHistoryItem = {
  id: '22222222-2222-4222-8222-222222222222',
  code: 'VR-BOOKING-1',
  tripId: '33333333-3333-4333-8333-333333333333',
  type: 'TICKET',
  status: 'PENDING_PAYMENT',
  createdAt: '2026-08-30T08:00:00Z',
  totalAmount: 250_000,
  originName: 'Ho Chi Minh City',
  destinationName: 'Da Lat',
  departureDateTime: '2026-09-01T08:00:00Z',
  estimatedArrivalTime: null,
  paymentRedirectUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  trackingTarget: null,
  ticket: {
    bookingGroupId: null,
    tripDirection: 'OUTBOUND',
    routeName: 'Ho Chi Minh City - Da Lat',
    tickets: [{
      ticketId: '44444444-4444-4444-8444-444444444444',
      ticketCode: 'VR-TICKET-1',
      seatNumber: 'A01',
      status: 'PENDING_PAYMENT',
      paidAmount: 250_000,
    }],
    vehicle: null,
    shuttleRequests: [],
  },
  parcel: null,
};
const confirmedItem = reconcilePassengerHistoryBookingStatus(pendingItem, {
  bookingId: pendingItem.id,
  status: 'CONFIRMED',
});

const historyPage = (
  item: PassengerTicketHistoryItem,
): PassengerHistoryPage<PassengerTicketHistoryItem> => ({
  items: [item],
  page: 1,
  pageSize: 20,
  totalItems: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
});

describe('booking history cache synchronization', () => {
  it('updates the detail snapshot and every matching History list together', () => {
    const queryClient = new QueryClient();
    const listKey = bookingHistoryKeys.list(userId, { pageSize: 20 });
    queryClient.setQueryData(listKey, {
      pages: [historyPage(pendingItem)],
      pageParams: [1],
    });
    upsertBookingHistoryTicketSnapshot(queryClient, userId, pendingItem);

    updateBookingHistoryTicketCaches(
      queryClient,
      userId,
      pendingItem.id,
      item => reconcilePassengerHistoryBookingStatus(item, {
        bookingId: pendingItem.id,
        status: 'CONFIRMED',
      }),
    );

    expect(queryClient.getQueryData(
      bookingHistoryKeys.ticketSnapshot(userId, pendingItem.id),
    )).toMatchObject({
      status: 'CONFIRMED',
      ticket: { tickets: [{ status: 'ISSUED' }] },
    });
    expect(queryClient.getQueryData(listKey)).toMatchObject({
      pages: [{
        items: [{
          status: 'CONFIRMED',
          ticket: { tickets: [{ status: 'ISSUED' }] },
        }],
      }],
    });
    queryClient.clear();
  });

  it('does not let a stale pending navigation snapshot replace confirmed data', () => {
    expect(selectFresherBookingHistoryTicketSnapshot(
      confirmedItem,
      pendingItem,
    )).toBe(confirmedItem);

    const queryClient = new QueryClient();
    upsertBookingHistoryTicketSnapshot(queryClient, userId, confirmedItem);
    upsertBookingHistoryTicketSnapshot(queryClient, userId, pendingItem);

    expect(queryClient.getQueryData(
      bookingHistoryKeys.ticketSnapshot(userId, pendingItem.id),
    )).toBe(confirmedItem);
    queryClient.clear();
  });
});
