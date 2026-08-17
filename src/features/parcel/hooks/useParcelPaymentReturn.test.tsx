import React from 'react';
import { AppState } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { PendingVnPaySession } from '@shared/payments';
import {
  useParcelPaymentReturn,
  type ParcelPaymentReturnPhase,
} from './useParcelPaymentReturn';

const mockRefetchParcel = jest.fn();
const mockGetPendingVnPaySession = jest.fn();
const mockPollVnPaySessionStatus = jest.fn();
const mockPaymentBackRemove = jest.fn();
const mockAppStateRemove = jest.fn();
let mockPaymentBackHandler: ((event: { result: string }) => void) | undefined;
let mockAppStateHandler: ((state: string) => void) | undefined;
const mockUserId = '11111111-1111-4111-8111-111111111111';

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector: (state: { user: { id: string } }) => unknown) =>
      selector({ user: { id: mockUserId } }),
    { getState: () => ({ user: { id: mockUserId } }) },
  ),
}));

jest.mock('@shared/payments', () => ({
  addVnPaySdkPaymentBackListener: (
    handler: (event: { result: string }) => void,
  ) => {
    mockPaymentBackHandler = handler;
    return { remove: mockPaymentBackRemove };
  },
  getPendingVnPaySession: () => mockGetPendingVnPaySession(),
  isAbandonedVnPaySdkResult: (result?: string) =>
    result === 'CANCELLED' || result === 'FAILED',
  isTerminalPaymentSessionStatus: (status: string) =>
    status === 'SUCCEEDED'
    || status === 'FAILED'
    || status === 'EXPIRED'
    || status === 'REFUNDED',
  pollVnPaySessionStatus: (...args: unknown[]) =>
    mockPollVnPaySessionStatus(...args),
  VNPAY_CANCEL_POLL_DELAYS_MS: [0, 400],
  VNPAY_SESSION_POLL_DELAYS_MS: [0, 600],
}));

const pendingSession: PendingVnPaySession = {
  sessionId: '22222222-2222-4222-8222-222222222222',
  ownerUserId: mockUserId,
  kind: 'parcel_deposit',
  businessId: '33333333-3333-4333-8333-333333333333',
  createdAt: '2026-08-17T00:00:00.000Z',
  paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
  vnpaySdk: { tmnCode: 'tmn', scheme: 'vietride', isSandbox: true },
};

function HookProbe({
  onPhase,
}: {
  onPhase: (phase: ParcelPaymentReturnPhase) => void;
}): null {
  const { phase } = useParcelPaymentReturn({
    parcelId: pendingSession.businessId!,
    paymentPending: true,
    expectedKind: 'parcel_deposit',
    enabled: true,
    refetchParcel: mockRefetchParcel,
  });
  onPhase(phase);
  return null;
}

describe('useParcelPaymentReturn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPaymentBackHandler = undefined;
    mockAppStateHandler = undefined;
    mockGetPendingVnPaySession.mockResolvedValue(pendingSession);
    mockRefetchParcel.mockResolvedValue({
      data: { status: 'PENDING_PAYMENT' },
    });
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

  it('clears the overlay phase immediately on SDK cancel', async () => {
    mockPollVnPaySessionStatus.mockResolvedValue({
      sessionId: pendingSession.sessionId,
      status: 'PENDING',
    });

    let latestPhase: ParcelPaymentReturnPhase = 'idle';
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <HookProbe onPhase={(phase) => {
          latestPhase = phase;
        }}
        />,
      );
    });

    await act(async () => {
      mockPaymentBackHandler?.({ result: 'CANCELLED' });
      await Promise.resolve();
    });

    expect(latestPhase).toBe('abandoned');
    expect(mockPollVnPaySessionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: pendingSession.sessionId,
        delaysMs: [0, 400],
      }),
    );

    act(() => renderer!.unmount());
  });

  it('refetches the parcel after the payment session succeeds', async () => {
    jest.useFakeTimers();
    mockPollVnPaySessionStatus.mockResolvedValue({
      sessionId: pendingSession.sessionId,
      status: 'SUCCEEDED',
    });
    mockRefetchParcel
      .mockResolvedValueOnce({ data: { status: 'PENDING_PAYMENT' } })
      .mockResolvedValueOnce({ data: { status: 'PENDING_PAYMENT' } })
      .mockResolvedValue({ data: { status: 'RESERVED' } });

    let latestPhase: ParcelPaymentReturnPhase = 'idle';
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <HookProbe onPhase={(phase) => {
          latestPhase = phase;
        }}
        />,
      );
    });

    await act(async () => {
      mockAppStateHandler?.('active');
      await Promise.resolve();
    });
    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockPollVnPaySessionStatus).toHaveBeenCalled();
    expect(mockRefetchParcel.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(latestPhase).toBe('idle');

    act(() => renderer!.unmount());
    jest.useRealTimers();
  });
});
