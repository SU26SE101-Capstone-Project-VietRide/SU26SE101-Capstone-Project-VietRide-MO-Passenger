import { QueryClient } from '@tanstack/react-query';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {},
}));
jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: jest.fn(),
}));
jest.mock('@features/home/api/notificationApi', () => ({
  notificationKeys: {
    user: (userId: string) => ['notifications', userId] as const,
  },
}));
jest.mock('@features/profile/api/walletApi', () => ({
  walletKeys: {
    user: (userId: string) => ['wallet', userId] as const,
  },
}));
jest.mock('../api/bookingPendingActionApi', () => ({
  resolveBookingPendingAction: jest.fn(),
}));

import { notificationKeys } from '@features/home/api/notificationApi';
import { walletKeys } from '@features/profile/api/walletApi';
import { bookingKeys } from '../api/bookingApi';
import { bookingHistoryKeys } from '../api/bookingHistoryApi';
import { invalidateResolvedBookingQueries } from './useResolvePendingAction';

describe('resolved booking pending-action invalidation', () => {
  it('refreshes only ticket/payment/notification/wallet scopes', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as unknown as QueryClient;
    const userId = '11111111-1111-4111-8111-111111111111';

    await invalidateResolvedBookingQueries(queryClient, userId);

    expect(bookingHistoryKeys.user(userId)).toEqual([
      'bookings',
      'history',
      userId,
    ]);
    expect(bookingKeys.paymentStatusRoot(userId)).toEqual([
      'bookings',
      userId,
      'payment-status',
    ]);

    expect(invalidateQueries.mock.calls.map(([filters]) => filters)).toEqual([
      { queryKey: bookingHistoryKeys.user(userId) },
      { queryKey: bookingKeys.paymentStatusRoot(userId) },
      { queryKey: notificationKeys.user(userId) },
      { queryKey: walletKeys.user(userId) },
    ]);
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: bookingKeys.user(userId),
    });
  });

  it('invalidates a round-trip payment query when the changed booking is second', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const userId = '11111111-1111-4111-8111-111111111111';
    const outboundId = '22222222-2222-4222-8222-222222222222';
    const returnId = '33333333-3333-4333-8333-333333333333';
    const roundTripKey = bookingKeys.paymentStatus(userId, [
      outboundId,
      returnId,
    ]);

    queryClient.setQueryData(roundTripKey, ['PENDING_PAYMENT']);

    await invalidateResolvedBookingQueries(queryClient, userId);

    expect(queryClient.getQueryState(roundTripKey)?.isInvalidated).toBe(true);
    queryClient.clear();
  });
});
