import React from 'react';
import { Alert, AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactTestRenderer from 'react-test-renderer';

const mockNativeRemove = jest.fn();
const mockAppStateRemove = jest.fn();
const mockOpenPendingPaymentDestination = jest.fn();
const mockDiscardPendingPaymentOpen = jest.fn();
const mockReconcilePendingVnPaySession = jest.fn();
let mockNativeHandler: (() => void) | undefined;
let mockAppStateHandler: ((state: string) => void) | undefined;

const mockAuthState = {
  user: { id: '11111111-1111-4111-8111-111111111111' },
};


jest.mock('@app/navigation/navigationRef', () => ({
  discardPendingPaymentOpen: () => mockDiscardPendingPaymentOpen(),
  openPendingPaymentDestination: (...args: unknown[]) =>
    mockOpenPendingPaymentDestination(...args),
}));

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector: (state: typeof mockAuthState) => unknown) =>
      selector(mockAuthState),
    { getState: () => mockAuthState },
  ),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@features/booking/api/bookingApi', () => ({
  bookingKeys: { user: (userId: string) => ['booking', userId] },
}));
jest.mock('@features/parcel/api/parcelApi', () => ({
  parcelKeys: { user: (userId: string) => ['parcel', userId] },
}));
jest.mock('@features/profile/api/passengerHistoryApi', () => ({
  passengerHistoryKeys: { user: (userId: string) => ['history', userId] },
}));
jest.mock('@features/profile/api/walletApi', () => ({
  walletKeys: { user: (userId: string) => ['wallet', userId] },
}));

jest.mock('@shared/payments', () => ({
  addVnPaySdkPaymentBackListener: (handler: () => void) => {
    mockNativeHandler = handler;
    return { remove: mockNativeRemove };
  },
  reconcilePendingVnPaySession: (...args: unknown[]) =>
    mockReconcilePendingVnPaySession(...args),
}));

import { PaymentLifecycleCoordinator } from './PaymentLifecycleCoordinator';

describe('PaymentLifecycleCoordinator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNativeHandler = undefined;
    mockAppStateHandler = undefined;
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.spyOn(AppState, 'addEventListener').mockImplementation((
      _event,
      handler,
    ) => {
      mockAppStateHandler = handler as (state: string) => void;
      return { remove: mockAppStateRemove };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('coalesces cold, native, and active wake signals and cleans listeners', async () => {
    let resolveReconciliation: ((value: {
      pending: null;
      status: null;
      cleared: false;
    }) => void) | undefined;
    mockReconcilePendingVnPaySession.mockReturnValueOnce(new Promise((resolve) => {
      resolveReconciliation = resolve;
    }));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <PaymentLifecycleCoordinator />
        </QueryClientProvider>,
      );
    });

    expect(mockReconcilePendingVnPaySession).toHaveBeenCalledTimes(1);
    expect(mockReconcilePendingVnPaySession).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: mockAuthState.user.id,
        isCurrent: expect.any(Function),
      }),
    );

    await ReactTestRenderer.act(async () => {
      mockNativeHandler?.();
      mockAppStateHandler?.('active');
      await Promise.resolve();
    });
    expect(mockReconcilePendingVnPaySession).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      resolveReconciliation?.({
        pending: null,
        status: null,
        cleared: false,
      });
      await Promise.resolve();
    });

    ReactTestRenderer.act(() => renderer!.unmount());
    expect(mockNativeRemove).toHaveBeenCalledTimes(1);
    expect(mockAppStateRemove).toHaveBeenCalledTimes(1);
    queryClient.clear();
  });
});
