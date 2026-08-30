import React from 'react';
import { Alert, AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactTestRenderer from 'react-test-renderer';

const mockNativeRemove = jest.fn();
const mockAppStateRemove = jest.fn();
const mockOpenPendingPaymentDestination = jest.fn();
const mockDiscardPendingPaymentOpen = jest.fn();
const mockReconcilePendingVnPaySession = jest.fn();
let mockNativeHandler: ((event?: { result?: string }) => void) | undefined;
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
jest.mock('@features/booking/api/bookingHistoryApi', () => ({
  bookingHistoryKeys: {
    user: (userId: string) => ['bookings', 'history', userId],
  },
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

const mockGetPendingVnPaySession = jest.fn();

jest.mock('@shared/payments', () => ({
  addVnPaySdkPaymentBackListener: (handler: (event?: { result?: string }) => void) => {
    mockNativeHandler = handler;
    return { remove: mockNativeRemove };
  },
  getPendingVnPaySession: () => mockGetPendingVnPaySession(),
  isAbandonedVnPaySdkResult: (result?: string) =>
    result === 'CANCELLED' || result === 'FAILED',
  reconcilePendingVnPaySession: (...args: unknown[]) =>
    mockReconcilePendingVnPaySession(...args),
  VNPAY_CANCEL_POLL_DELAYS_MS: [0, 400],
}));

import { PaymentLifecycleCoordinator } from './PaymentLifecycleCoordinator';

describe('PaymentLifecycleCoordinator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.user = {
      id: '11111111-1111-4111-8111-111111111111',
    };
    mockGetPendingVnPaySession.mockResolvedValue(null);
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
        delaysMs: [0],
      }),
    );

    await ReactTestRenderer.act(async () => {
      mockNativeHandler?.();
      mockAppStateHandler?.('active');
      await Promise.resolve();
    });
    expect(mockReconcilePendingVnPaySession).toHaveBeenCalledTimes(1);

    mockReconcilePendingVnPaySession.mockResolvedValue({
      pending: null,
      status: null,
      cleared: false,
    });

    await ReactTestRenderer.act(async () => {
      resolveReconciliation?.({
        pending: null,
        status: null,
        cleared: false,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockReconcilePendingVnPaySession).toHaveBeenCalledTimes(2);
    expect(mockReconcilePendingVnPaySession.mock.calls.at(-1)?.[0])
      .not.toHaveProperty('delaysMs');

    ReactTestRenderer.act(() => renderer!.unmount());
    expect(mockNativeRemove).toHaveBeenCalledTimes(1);
    expect(mockAppStateRemove).toHaveBeenCalledTimes(1);
    queryClient.clear();
  });

  it('refetches ticket and parcel owner queries after VNPay cancel', async () => {
    const pending = {
      sessionId: '33333333-3333-4333-8333-333333333333',
      ownerUserId: mockAuthState.user.id,
      kind: 'booking' as const,
      createdAt: '2026-08-15T00:00:00.000Z',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      vnpaySdk: { tmnCode: 'tmn', scheme: 'vietride', isSandbox: true },
    };
    mockReconcilePendingVnPaySession.mockResolvedValue({
      pending: null,
      status: null,
      cleared: false,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <PaymentLifecycleCoordinator />
        </QueryClientProvider>,
      );
    });

    mockGetPendingVnPaySession.mockResolvedValue(pending);
    mockReconcilePendingVnPaySession.mockResolvedValue({
      pending,
      status: { sessionId: pending.sessionId, status: 'EXPIRED' },
      cleared: true,
    });

    await ReactTestRenderer.act(async () => {
      mockNativeHandler?.({ result: 'CANCELLED' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockReconcilePendingVnPaySession).toHaveBeenLastCalledWith(
      expect.objectContaining({
        delaysMs: [0, 400],
      }),
    );
    expect(invalidateSpy).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['bookings', 'history', mockAuthState.user.id],
    });

    ReactTestRenderer.act(() => renderer!.unmount());
    queryClient.clear();
  });

  it('queues cancel polling when PaymentBack arrives during reconciliation', async () => {
    let resolveFirst: ((value: {
      pending: null;
      status: null;
      cleared: false;
    }) => void) | undefined;
    mockReconcilePendingVnPaySession.mockReturnValueOnce(new Promise((resolve) => {
      resolveFirst = resolve;
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

    mockReconcilePendingVnPaySession.mockResolvedValue({
      pending: null,
      status: { sessionId: 's', status: 'FAILED' },
      cleared: true,
    });

    await ReactTestRenderer.act(async () => {
      mockNativeHandler?.({ result: 'CANCELLED' });
      await Promise.resolve();
    });

    expect(mockReconcilePendingVnPaySession).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      resolveFirst?.({ pending: null, status: null, cleared: false });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockReconcilePendingVnPaySession).toHaveBeenCalledTimes(2);
    expect(mockReconcilePendingVnPaySession).toHaveBeenLastCalledWith(
      expect.objectContaining({
        delaysMs: [0, 400],
      }),
    );

    ReactTestRenderer.act(() => renderer!.unmount());
    queryClient.clear();
  });

  it('uses one passive check and no processing alert on app active', async () => {
    mockReconcilePendingVnPaySession.mockResolvedValue({
      pending: null,
      status: null,
      cleared: false,
    });
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
    jest.mocked(Alert.alert).mockClear();
    mockReconcilePendingVnPaySession.mockResolvedValue({
      pending: {
        sessionId: '33333333-3333-4333-8333-333333333333',
        ownerUserId: mockAuthState.user.id,
        kind: 'topup',
        createdAt: '2026-08-15T00:00:00.000Z',
        paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
        vnpaySdk: { tmnCode: 'tmn', scheme: 'vietride', isSandbox: true },
      },
      status: { sessionId: '33333333-3333-4333-8333-333333333333', status: 'PENDING' },
      cleared: false,
    });

    await ReactTestRenderer.act(async () => {
      mockAppStateHandler?.('active');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockReconcilePendingVnPaySession).toHaveBeenLastCalledWith(
      expect.objectContaining({ delaysMs: [0] }),
    );
    expect(Alert.alert).not.toHaveBeenCalled();

    ReactTestRenderer.act(() => renderer!.unmount());
    queryClient.clear();
  });

  it('opens a cold-start destination only for an explicitly unresolved PENDING session', async () => {
    const pending = {
      sessionId: '33333333-3333-4333-8333-333333333333',
      ownerUserId: mockAuthState.user.id,
      kind: 'parcel_deposit' as const,
      businessId: '44444444-4444-4444-8444-444444444444',
      createdAt: '2026-08-15T00:00:00.000Z',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      vnpaySdk: { tmnCode: 'tmn', scheme: 'vietride', isSandbox: true },
    };
    mockReconcilePendingVnPaySession.mockResolvedValue({
      pending,
      status: { sessionId: pending.sessionId, status: 'PENDING' },
      cleared: false,
    });
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
      await Promise.resolve();
    });

    expect(mockOpenPendingPaymentDestination).toHaveBeenCalledTimes(1);
    expect(mockOpenPendingPaymentDestination).toHaveBeenCalledWith(pending);

    ReactTestRenderer.act(() => renderer!.unmount());
    queryClient.clear();
  });

  it('waits for owner cache refresh before opening a retained payment destination', async () => {
    const pending = {
      sessionId: '33333333-3333-4333-8333-333333333333',
      ownerUserId: mockAuthState.user.id,
      kind: 'parcel_deposit' as const,
      businessId: '44444444-4444-4444-8444-444444444444',
      createdAt: '2026-08-15T00:00:00.000Z',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      vnpaySdk: { tmnCode: 'tmn', scheme: 'vietride', isSandbox: true },
    };
    mockReconcilePendingVnPaySession.mockResolvedValue({
      pending,
      status: { sessionId: pending.sessionId, status: 'PENDING' },
      cleared: false,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let resolveInvalidation: (() => void) | undefined;
    const invalidation = new Promise<void>((resolve) => {
      resolveInvalidation = resolve;
    });
    jest.spyOn(queryClient, 'invalidateQueries').mockReturnValue(invalidation);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <PaymentLifecycleCoordinator />
        </QueryClientProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockOpenPendingPaymentDestination).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => {
      resolveInvalidation?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockOpenPendingPaymentDestination).toHaveBeenCalledWith(pending);

    ReactTestRenderer.act(() => renderer!.unmount());
    queryClient.clear();
  });

  it('keeps a retained cold-start session resumable when status is temporarily unknown', async () => {
    const pending = {
      sessionId: '33333333-3333-4333-8333-333333333333',
      ownerUserId: mockAuthState.user.id,
      kind: 'parcel_deposit' as const,
      businessId: '44444444-4444-4444-8444-444444444444',
      createdAt: '2026-08-15T00:00:00.000Z',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      vnpaySdk: { tmnCode: 'tmn', scheme: 'vietride', isSandbox: true },
    };
    mockReconcilePendingVnPaySession.mockResolvedValue({
      pending,
      status: null,
      cleared: false,
    });
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
      await Promise.resolve();
    });

    expect(mockOpenPendingPaymentDestination).toHaveBeenCalledWith(pending);

    ReactTestRenderer.act(() => renderer!.unmount());
    queryClient.clear();
  });

  it('does not open a cold-start destination after the terminal session was cleared', async () => {
    const pending = {
      sessionId: '33333333-3333-4333-8333-333333333333',
      ownerUserId: mockAuthState.user.id,
      kind: 'parcel_deposit' as const,
      businessId: '44444444-4444-4444-8444-444444444444',
      createdAt: '2026-08-15T00:00:00.000Z',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      vnpaySdk: { tmnCode: 'tmn', scheme: 'vietride', isSandbox: true },
    };
    mockReconcilePendingVnPaySession.mockResolvedValue({
      pending,
      status: { sessionId: pending.sessionId, status: 'SUCCEEDED' },
      cleared: true,
    });
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
      await Promise.resolve();
    });

    expect(mockOpenPendingPaymentDestination).not.toHaveBeenCalled();

    ReactTestRenderer.act(() => renderer!.unmount());
    queryClient.clear();
  });

  it('detaches the old account run and starts cold reconciliation for the new account', async () => {
    let resolveFirst: ((value: {
      pending: null;
      status: null;
      cleared: false;
    }) => void) | undefined;
    mockReconcilePendingVnPaySession
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveFirst = resolve;
      }))
      .mockResolvedValue({ pending: null, status: null, cleared: false });
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

    const secondUserId = '22222222-2222-4222-8222-222222222222';
    mockAuthState.user = { id: secondUserId };
    await ReactTestRenderer.act(async () => {
      renderer!.update(
        <QueryClientProvider client={queryClient}>
          <PaymentLifecycleCoordinator />
        </QueryClientProvider>,
      );
      await Promise.resolve();
    });

    expect(mockReconcilePendingVnPaySession).toHaveBeenCalledTimes(2);
    expect(mockReconcilePendingVnPaySession).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ownerUserId: secondUserId,
        delaysMs: [0],
      }),
    );

    await ReactTestRenderer.act(async () => {
      resolveFirst?.({ pending: null, status: null, cleared: false });
      await Promise.resolve();
    });
    expect(mockReconcilePendingVnPaySession).toHaveBeenCalledTimes(2);

    ReactTestRenderer.act(() => renderer!.unmount());
    queryClient.clear();
  });

  it('does not replay a queued native wake after unmount', async () => {
    let resolveFirst: ((value: {
      pending: null;
      status: null;
      cleared: false;
    }) => void) | undefined;
    mockReconcilePendingVnPaySession.mockReturnValueOnce(new Promise((resolve) => {
      resolveFirst = resolve;
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
    await ReactTestRenderer.act(async () => {
      mockNativeHandler?.({ result: 'CANCELLED' });
      await Promise.resolve();
    });
    ReactTestRenderer.act(() => renderer!.unmount());

    await ReactTestRenderer.act(async () => {
      resolveFirst?.({ pending: null, status: null, cleared: false });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockReconcilePendingVnPaySession).toHaveBeenCalledTimes(1);
    queryClient.clear();
  });
});
