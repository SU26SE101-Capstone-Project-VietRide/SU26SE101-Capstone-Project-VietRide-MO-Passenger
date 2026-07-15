jest.mock('../../auth/store/useAuthStore', () => ({
  useAuthStore: jest.fn(),
}));
jest.mock('@shared/constants/demoMode', () => ({
  isDemoMode: false,
}));

import { isUuid } from '@shared/utils/pathSegment';
import { BOOKING_HISTORY_FIXTURE } from '../data/bookingHistoryFixture';
import {
  resolveBookingHistorySnapshot,
  resolveBookingHistoryTicketSnapshot,
} from './useBookingHistory';

const USER_ID = '99999999-9999-4999-8999-999999999999';

describe('booking history provider boundary', () => {
  it('returns labelled demo data only when the demo provider is enabled', () => {
    const result = resolveBookingHistorySnapshot({ userId: USER_ID, demoMode: true });

    expect(result).toEqual({ source: 'demo', items: BOOKING_HISTORY_FIXTURE });
    expect(BOOKING_HISTORY_FIXTURE.every((item) => (
      isUuid(item.id)
      && isUuid(item.tripId)
      && [
        'PENDING_PAYMENT',
        'CONFIRMED',
        'COMPLETED',
        'EXPIRED',
        'CANCELLED',
        'NO_SHOW',
        'PARTIAL_NO_SHOW',
        'REFUNDED',
        'DISRUPTED',
      ].includes(item.status)
    ))).toBe(true);
  });

  it('fails closed instead of reporting a fake empty production history', () => {
    expect(resolveBookingHistorySnapshot({ userId: USER_ID, demoMode: false })).toEqual({
      source: 'unavailable',
      reason: 'backend_not_supported',
    });
  });

  it('requires authentication before exposing a fixture', () => {
    expect(resolveBookingHistorySnapshot({ demoMode: true })).toEqual({
      source: 'unavailable',
      reason: 'authentication_required',
    });
  });

  it('resolves a complete demo ticket detail without calling a booking detail endpoint', () => {
    const bookingId = BOOKING_HISTORY_FIXTURE[0].id;
    const result = resolveBookingHistoryTicketSnapshot(
      bookingId,
      { userId: USER_ID, demoMode: true },
    );

    expect(result.source).toBe('demo');
    if (result.source === 'demo') {
      expect(result.detail.id).toBe(bookingId);
      expect(result.detail.seatNumbers.length).toBeGreaterThan(0);
      expect(result.detail.ticketCode).toBeTruthy();
    }
  });
});
