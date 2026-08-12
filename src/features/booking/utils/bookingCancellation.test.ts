import { canCancelBooking } from './bookingCancellation';

describe('booking cancellation eligibility', () => {
  it.each(['CONFIRMED', 'PENDING_PAYMENT'])(
    'allows an explicit BE-cancellable booking status: %s',
    (status) => {
      expect(canCancelBooking(status)).toBe(true);
    },
  );

  it.each([
    'CANCELLED',
    'COMPLETED',
    'DISRUPTED',
    'EXPIRED',
    'NO_SHOW',
    'PARTIAL_NO_SHOW',
    'REFUNDED',
    'UNKNOWN_FUTURE_STATUS',
  ])('fails closed for a non-cancellable or unknown status: %s', (status) => {
    expect(canCancelBooking(status)).toBe(false);
  });
});
