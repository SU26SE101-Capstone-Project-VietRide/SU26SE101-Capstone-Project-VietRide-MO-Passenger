import type { QueryClient } from '@tanstack/react-query';

import { bookingKeys } from '@features/booking/api/bookingApi';
import { bookingHistoryKeys } from '@features/booking/api/bookingHistoryApi';
import { parcelKeys } from '@features/parcel/api/parcelApi';
import { parcelReliabilityKeys } from '@features/parcel/api/parcelReliabilityApi';
import { passengerHistoryKeys } from '@features/profile/api/passengerHistoryApi';
import { walletKeys } from '@features/profile/api/walletApi';

const BOOKING_HISTORY_REFRESH_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  'BOOKING_CONFIRMED',
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'BOOKING_REFUNDED',
  'VEHICLE_SUBSTITUTED',
]);

const PARCEL_REFRESH_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  'PARCEL_RESERVED',
  'PARCEL_LOADED',
  'PARCEL_IN_TRANSIT',
  'PARCEL_DELIVERED_PENDING_CONFIRM',
  'PARCEL_REJECTED',
  'PARCEL_RETURNED',
  'PARCEL_REVIEW_REQUESTED',
  'PARCEL_REVIEW_APPROVED',
  'PARCEL_FINAL_PAYMENT_REQUIRED',
  'PARCEL_SETTLEMENT_RECOVERED',
]);

const WALLET_REFRESH_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  'WALLET_CREDITED',
  'WALLET_DEBITED',
  'BOOKING_REFUNDED',
  'PARCEL_SETTLEMENT_RECOVERED',
]);

export const shouldRefreshPassengerBookingHistory = (
  notificationType: string,
): boolean => BOOKING_HISTORY_REFRESH_NOTIFICATION_TYPES.has(notificationType);

export const shouldRefreshPassengerParcelData = (
  notificationType: string,
): boolean => PARCEL_REFRESH_NOTIFICATION_TYPES.has(notificationType);

export const shouldRefreshPassengerWallet = (
  notificationType: string,
): boolean => WALLET_REFRESH_NOTIFICATION_TYPES.has(notificationType);

/** Refresh only server-state subtrees proved relevant by the trusted type. */
export async function refreshPassengerQueriesForNotification(
  queryClient: QueryClient,
  userId: string,
  notificationType: string,
): Promise<void> {
  const invalidations: Array<Promise<unknown>> = [];

  if (shouldRefreshPassengerBookingHistory(notificationType)) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: bookingKeys.user(userId) }),
      queryClient.invalidateQueries({ queryKey: bookingHistoryKeys.user(userId) }),
    );
  }

  if (shouldRefreshPassengerParcelData(notificationType)) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: parcelKeys.user(userId) }),
      queryClient.invalidateQueries({ queryKey: parcelReliabilityKeys.user(userId) }),
      queryClient.invalidateQueries({ queryKey: passengerHistoryKeys.user(userId) }),
    );
  }

  if (shouldRefreshPassengerWallet(notificationType)) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: walletKeys.user(userId) }),
    );
  }

  await Promise.all(invalidations);
}
