jest.mock('@features/booking/api/bookingApi', () => ({
  bookingKeys: {
    user: (userId: string) => ['bookings', userId],
  },
}));
jest.mock('@features/booking/api/bookingHistoryApi', () => ({
  bookingHistoryKeys: {
    user: (userId: string) => ['bookings', 'history', userId],
  },
}));
jest.mock('@features/parcel/api/parcelApi', () => ({
  parcelKeys: {
    user: (userId: string) => ['parcels', userId],
  },
}));
jest.mock('@features/parcel/api/parcelReliabilityApi', () => ({
  parcelReliabilityKeys: {
    user: (userId: string) => ['parcels', 'reliability', userId],
  },
}));
jest.mock('@features/profile/api/passengerHistoryApi', () => ({
  passengerHistoryKeys: {
    user: (userId: string) => ['passenger-history', userId],
  },
}));
jest.mock('@features/profile/api/walletApi', () => ({
  walletKeys: {
    user: (userId: string) => ['wallet', userId],
  },
}));

import { QueryClient } from '@tanstack/react-query';

import { bookingKeys } from '@features/booking/api/bookingApi';
import { bookingHistoryKeys } from '@features/booking/api/bookingHistoryApi';
import { parcelKeys } from '@features/parcel/api/parcelApi';
import { parcelReliabilityKeys } from '@features/parcel/api/parcelReliabilityApi';
import { passengerHistoryKeys } from '@features/profile/api/passengerHistoryApi';
import { walletKeys } from '@features/profile/api/walletApi';
import {
  refreshPassengerQueriesForNotification,
  shouldRefreshPassengerBookingHistory,
  shouldRefreshPassengerParcelData,
  shouldRefreshPassengerWallet,
} from './notificationHistoryRefresh';

const USER_ID = '11111111-1111-4111-8111-111111111111';

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

describe('Passenger notification query refresh targets', () => {
  it('classifies Parcel and Wallet server-state events independently', () => {
    expect(shouldRefreshPassengerParcelData('PARCEL_IN_TRANSIT')).toBe(true);
    expect(shouldRefreshPassengerParcelData('BOOKING_CONFIRMED')).toBe(false);
    expect(shouldRefreshPassengerWallet('WALLET_CREDITED')).toBe(true);
    expect(shouldRefreshPassengerWallet('BOOKING_REFUNDED')).toBe(true);
    expect(shouldRefreshPassengerWallet('PARCEL_SETTLEMENT_RECOVERED')).toBe(true);
    expect(shouldRefreshPassengerWallet('PARCEL_IN_TRANSIT')).toBe(false);
  });

  it('invalidates all Parcel views when a Parcel status push arrives', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);

    await refreshPassengerQueriesForNotification(
      queryClient,
      USER_ID,
      'PARCEL_IN_TRANSIT',
    );

    expect(invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      parcelKeys.user(USER_ID),
      parcelReliabilityKeys.user(USER_ID),
      passengerHistoryKeys.user(USER_ID),
    ]);
  });

  it('refreshes booking and wallet state together for a refund push', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);

    await refreshPassengerQueriesForNotification(
      queryClient,
      USER_ID,
      'BOOKING_REFUNDED',
    );

    expect(invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      bookingKeys.user(USER_ID),
      bookingHistoryKeys.user(USER_ID),
      walletKeys.user(USER_ID),
    ]);
  });
});
