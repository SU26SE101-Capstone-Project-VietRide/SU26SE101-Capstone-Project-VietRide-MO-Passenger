import React from 'react';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactTestRenderer from 'react-test-renderer';

import { bookingKeys } from '@features/booking/api/bookingApi';
import { PaymentDeepLinkHandler } from './PaymentDeepLinkHandler';

type MockPaymentReturnEvent = {
  source: 'custom-scheme' | 'app-link';
};

let mockPaymentReturnHandler:
  | ((event: MockPaymentReturnEvent) => void)
  | undefined;

jest.mock('@features/booking/api/bookingApi', () => ({
  bookingKeys: {
    user: (userId: string) => ['bookings', userId] as const,
  },
}));

jest.mock('@shared/hooks', () => ({
  usePaymentDeepLink: (
    handler: (event: MockPaymentReturnEvent) => void,
  ) => {
    mockPaymentReturnHandler = handler;
  },
}));

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: (
    selector: (state: { user: { id: string } }) => unknown,
  ) => selector({ user: { id: 'user-a' } }),
}));

describe('PaymentDeepLinkHandler', () => {
  afterEach(() => {
    mockPaymentReturnHandler = undefined;
    jest.restoreAllMocks();
  });

  it('reconciles only the active user and never claims redirect success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <PaymentDeepLinkHandler />
        </QueryClientProvider>,
      );
    });

    await ReactTestRenderer.act(async () => {
      mockPaymentReturnHandler?.({ source: 'custom-scheme' });
      await Promise.resolve();
    });

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: bookingKeys.user('user-a'),
      refetchType: 'none',
    });

    const alertCopy = alert.mock.calls.flat().join(' ');
    expect(alertCopy).toContain('Đang xác nhận thanh toán');
    expect(alertCopy).not.toContain('Thanh toán thành công');

    ReactTestRenderer.act(() => renderer!.unmount());
    queryClient.clear();
  });
});
