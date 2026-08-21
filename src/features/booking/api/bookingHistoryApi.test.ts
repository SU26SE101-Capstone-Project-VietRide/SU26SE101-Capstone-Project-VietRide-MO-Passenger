import { bookingHistoryKeys, parseBookingHistoryPage } from './bookingHistoryApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const BOOKING_ID = '11111111-1111-4111-8111-111111111111';
const TRIP_ID = '22222222-2222-4222-8222-222222222222';
const TICKET_ID = '33333333-3333-4333-8333-333333333333';
const STOP_ID = '44444444-4444-4444-8444-444444444444';
const STATION_ID = '55555555-5555-4555-8555-555555555555';
const NOW = '2026-08-22T09:00:00+07:00';

const bookingItem = {
  bookingId: BOOKING_ID,
  bookingCode: 'BKG-001',
  tripId: TRIP_ID,
  status: 'CONFIRMED',
  createdAt: NOW,
  totalAmount: 250_000,
  originName: 'Hà Nội',
  destinationName: 'Đà Nẵng',
  departureDateTime: NOW,
  bookingGroupId: null,
  tripDirection: 'OUTBOUND',
  routeName: 'Hà Nội - Đà Nẵng',
  tickets: [{
    ticketId: TICKET_ID,
    ticketCode: 'T-001',
    seatNumber: 'A01',
    status: 'ISSUED',
    paidAmount: 250_000,
  }],
  dropoffStopId: STOP_ID,
  dropoffStationId: STATION_ID,
  vehicle: null,
  paymentRedirectUrl: null,
};

const page = (item: Record<string, unknown>) => ({
  items: [item],
  page: 1,
  pageSize: 10,
  totalItems: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
});

describe('direct Booking History adapter', () => {
  it('normalizes a missing shuttleRequests field to an empty array', () => {
    const parsed = parseBookingHistoryPage(page(bookingItem));
    expect(parsed.items[0].ticket.shuttleRequests).toEqual([]);
  });

  it('preserves BE order and active/cancelled inbound/outbound state', () => {
    const parsed = parseBookingHistoryPage(page({
      ...bookingItem,
      shuttleRequests: [{
        direction: 'INBOUND_TO_STATION',
        address: '12 Lê Lợi',
        latitude: 10.78,
        longitude: 106.69,
        roadDistanceMeters: 3_200,
        isActive: true,
        requestedAt: NOW,
        cancelledAt: null,
      }, {
        direction: 'OUTBOUND_FROM_STATION',
        address: '34 Trần Phú',
        latitude: 16.05,
        longitude: 108.2,
        roadDistanceMeters: null,
        isActive: false,
        requestedAt: NOW,
        cancelledAt: '2026-08-22T10:00:00+07:00',
      }],
    }));
    expect(parsed.items[0].ticket.shuttleRequests.map((request) => ({
      direction: request.direction,
      isActive: request.isActive,
      address: request.address,
    }))).toEqual([
      { direction: 'INBOUND_TO_STATION', isActive: true, address: '12 Lê Lợi' },
      { direction: 'OUTBOUND_FROM_STATION', isActive: false, address: '34 Trần Phú' },
    ]);
  });

  it('prefers the drop-off stop over station for the tracking target', () => {
    const parsed = parseBookingHistoryPage(page(bookingItem));
    expect(parsed.items[0].trackingTarget).toEqual({ kind: 'STOP', stopId: STOP_ID });
  });

  it('scopes query keys by user ID', () => {
    expect(bookingHistoryKeys.list('user-a', {})).not.toEqual(
      bookingHistoryKeys.list('user-b', {}),
    );
  });
});
