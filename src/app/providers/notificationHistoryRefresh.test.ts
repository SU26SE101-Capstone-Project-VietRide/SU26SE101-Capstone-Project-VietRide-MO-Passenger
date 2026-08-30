import { shouldRefreshPassengerBookingHistory } from './notificationHistoryRefresh';

describe('Passenger booking history notification refresh', () => {
  it.each([
    'BOOKING_CONFIRMED',
    'BOOKING_CREATED',
    'BOOKING_CANCELLED',
    'BOOKING_REFUNDED',
    'VEHICLE_SUBSTITUTED',
  ])('refreshes history for %s', (notificationType) => {
    expect(shouldRefreshPassengerBookingHistory(notificationType)).toBe(true);
  });

  it.each(['PARCEL_IN_TRANSIT', 'WALLET_CREDITED', '', 'UNKNOWN'])(
    'does not refresh booking history for %s',
    (notificationType) => {
      expect(shouldRefreshPassengerBookingHistory(notificationType)).toBe(false);
    },
  );
});
