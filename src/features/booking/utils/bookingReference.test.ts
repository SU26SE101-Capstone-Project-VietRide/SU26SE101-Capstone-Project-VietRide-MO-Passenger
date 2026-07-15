import type { BookingResult, RoundTripResult } from '../types/booking';
import { getBookingReference } from './bookingReference';

const oneWayResult = {
  bookingId: 'booking-id',
  bookingCode: 'VR-ONE-WAY',
  status: 'CONFIRMED',
  totalAmount: 250_000,
  discountAmount: 0,
  paymentId: null,
  paymentRedirectUrl: null,
  tickets: [],
} satisfies BookingResult;

const roundTripResult = {
  bookingGroupId: 'group-id',
  outbound: {
    bookingId: 'outbound-id',
    bookingCode: 'VR-OUTBOUND',
    totalAmount: 250_000,
    discountAmount: 0,
    tickets: [],
  },
  return: {
    bookingId: 'return-id',
    bookingCode: 'VR-RETURN',
    totalAmount: 250_000,
    discountAmount: 0,
    tickets: [],
  },
  grandTotal: 500_000,
  paymentId: null,
  status: 'CONFIRMED',
  paymentRedirectUrl: null,
} satisfies RoundTripResult;

describe('getBookingReference', () => {
  it('uses the API-issued one-way booking code', () => {
    expect(getBookingReference(oneWayResult)).toBe('VR-ONE-WAY');
  });

  it('combines both API-issued round-trip booking codes', () => {
    expect(getBookingReference(roundTripResult)).toBe('VR-OUTBOUND/VR-RETURN');
  });

  it('never invents a reference when API data is absent or invalid', () => {
    expect(getBookingReference(null)).toBeNull();
    expect(getBookingReference({ ...oneWayResult, bookingCode: '   ' })).toBeNull();
    expect(getBookingReference({
      ...roundTripResult,
      return: { ...roundTripResult.return, bookingCode: '' },
    })).toBeNull();
  });
});
