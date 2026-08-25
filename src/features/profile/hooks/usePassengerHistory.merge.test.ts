import {
  comparePassengerHistoryNewestFirst,
  flattenPassengerHistoryPages,
} from '../utils/passengerHistoryMerge';
import type { PassengerParcelHistoryItem } from '../types';

const parcel = (
  id: string,
  createdAt: string,
): PassengerParcelHistoryItem => ({
  type: 'PARCEL',
  id,
  code: id,
  tripId: 'trip',
  status: 'IN_TRANSIT',
  createdAt,
  totalAmount: 1,
  originName: null,
  destinationName: null,
  departureDateTime: null,
  estimatedArrivalTime: null,
  paymentRedirectUrl: null,
  trackingTarget: null,
  ticket: null,
  parcel: {
    bookingId: null,
    recipientName: 'A',
    sizeCategory: 'SMALL',
    photoUrl: null,
    deliveryMethod: 'TERMINAL_PICKUP',
    role: 'SENT',
    reliability: null,
  },
});

describe('flattenPassengerHistoryPages', () => {
  it('dedupes and keeps BE newest-first order across merged status pages', () => {
    const newer = parcel('b', '2026-08-17T10:00:00.000Z');
    const older = parcel('a', '2026-08-16T10:00:00.000Z');
    const sameTimeNewerId = parcel('z', '2026-08-16T10:00:00.000Z');

    const items = flattenPassengerHistoryPages([
      {
        items: [older, newer],
        page: 1,
        pageSize: 10,
        totalItems: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      {
        items: [newer, sameTimeNewerId],
        page: 2,
        pageSize: 10,
        totalItems: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    ]);

    expect(items.map(item => item.id)).toEqual(['b', 'z', 'a']);
    expect(comparePassengerHistoryNewestFirst(newer, older)).toBeLessThan(0);
  });
});
