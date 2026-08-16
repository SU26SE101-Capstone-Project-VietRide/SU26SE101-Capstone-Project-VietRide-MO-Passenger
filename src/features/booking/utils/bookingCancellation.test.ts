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

  it('hides cancel once the trip is running', () => {
    expect(canCancelBooking({
      bookingStatus: 'CONFIRMED',
      tripStatus: 'IN_PROGRESS',
    })).toBe(false);
    expect(canCancelBooking({
      bookingStatus: 'CONFIRMED',
      tripStatus: 'in_progress',
    })).toBe(false);
  });

  it.each(['COMPLETED', 'CANCELLED', 'DISRUPTED'])(
    'hides cancel after the trip has ended: %s',
    (tripStatus) => {
      expect(canCancelBooking({
        bookingStatus: 'CONFIRMED',
        tripStatus,
      })).toBe(false);
    },
  );

  it('keeps cancel while the trip is still scheduled or boarding', () => {
    expect(canCancelBooking({
      bookingStatus: 'CONFIRMED',
      tripStatus: 'SCHEDULED',
    })).toBe(true);
    expect(canCancelBooking({
      bookingStatus: 'CONFIRMED',
      tripStatus: 'BOARDING',
    })).toBe(true);
  });

  it('does not hide cancel from an unknown departure time', () => {
    expect(canCancelBooking({
      bookingStatus: 'CONFIRMED',
    })).toBe(true);
  });

  it('hides cancel once departure time has passed, even if the trip is still scheduled', () => {
    expect(canCancelBooking({
      bookingStatus: 'CONFIRMED',
      tripStatus: 'SCHEDULED',
      departureDateTime: '2026-08-17T14:45:00+07:00',
      nowMs: Date.parse('2026-08-17T14:56:00+07:00'),
    })).toBe(false);
  });

  it('keeps cancel before departure while the trip is still scheduled', () => {
    expect(canCancelBooking({
      bookingStatus: 'CONFIRMED',
      tripStatus: 'SCHEDULED',
      departureDateTime: '2026-08-17T14:45:00+07:00',
      nowMs: Date.parse('2026-08-17T14:30:00+07:00'),
    })).toBe(true);
  });
});
