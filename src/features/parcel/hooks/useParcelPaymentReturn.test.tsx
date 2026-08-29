import React from 'react';
import { AppState } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  useParcelPaymentReturn,
  type ParcelPaymentReturnPhase,
} from './useParcelPaymentReturn';

const mockRefetchParcel = jest.fn();
const mockGetPendingVnPaySession = jest.fn();
const mockPaymentBackRemove = jest.fn();
let mockPaymentBackHandler: ((event: { result?: string }) => void) | undefined;
const mockUserId = '11111111-1111-4111-8111-111111111111';
const mockParcelId = '22222222-2222-4222-8222-222222222222';
const mockAuthState: { user: { id: string } | null } = {
  user: { id: mockUserId },
};

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector: (state: typeof mockAuthState) => unknown) =>
      selector(mockAuthState),
    { getState: () => mockAuthState },
  ),
}));

jest.mock('@shared/payments', () => ({
  addVnPaySdkPaymentBackListener: (
    handler: (event: { result?: string }) => void,
  ) => {
    mockPaymentBackHandler = handler;
    return { remove: mockPaymentBackRemove };
  },
  getPendingVnPaySession: () => mockGetPendingVnPaySession(),
  isAbandonedVnPaySdkResult: (result?: string) =>
    result === 'CANCELLED' || result === 'FAILED',
}));

type CheckNow = (sdkResult?: string) => Promise<void>;

function HookProbe({
  enabled = true,
  expectedKind = 'parcel_deposit',
  onPhase,
  onCheckNow,
  parcelId = mockParcelId,
  paymentPending = true,
  refetchParcel = mockRefetchParcel,
}: {
  enabled?: boolean;
  expectedKind?: 'parcel_deposit' | 'parcel_final';
  onPhase: (phase: ParcelPaymentReturnPhase) => void;
  onCheckNow?: (checkNow: CheckNow) => void;
  parcelId?: string;
  paymentPending?: boolean;
  refetchParcel?: typeof mockRefetchParcel;
}): null {
  const { phase, checkNow } = useParcelPaymentReturn({
    parcelId,
    paymentPending,
    expectedKind,
    enabled,
    refetchParcel,
  });
  onPhase(phase);
  onCheckNow?.(checkNow as CheckNow);
  return null;
}

describe('useParcelPaymentReturn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.user = { id: mockUserId };
    mockPaymentBackHandler = undefined;
    mockGetPendingVnPaySession.mockResolvedValue({
      sessionId: '33333333-3333-4333-8333-333333333333',
      ownerUserId: mockUserId,
      kind: 'parcel_deposit',
      businessId: mockParcelId,
      createdAt: '2026-08-17T00:00:00.000Z',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      vnpaySdk: { tmnCode: 'tmn', scheme: 'vietride', isSandbox: true },
    });
    mockRefetchParcel.mockResolvedValue({
      data: { status: 'PENDING_PAYMENT' },
    });
  });

  it('marks SDK cancel abandoned after one business-detail refetch', async () => {
    const appStateSpy = jest.spyOn(AppState, 'addEventListener');
    let latestPhase: ParcelPaymentReturnPhase = 'idle';
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <HookProbe onPhase={(phase) => { latestPhase = phase; }} />,
      );
    });

    await act(async () => {
      mockPaymentBackHandler?.({ result: 'CANCELLED' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latestPhase).toBe('abandoned');
    expect(mockRefetchParcel).toHaveBeenCalledTimes(1);
    expect(appStateSpy).not.toHaveBeenCalled();

    act(() => renderer!.unmount());
    appStateSpy.mockRestore();
  });

  it('waits for Parcel detail when the business status remains payable', async () => {
    let latestPhase: ParcelPaymentReturnPhase = 'idle';
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <HookProbe onPhase={(phase) => { latestPhase = phase; }} />,
      );
    });

    await act(async () => {
      mockPaymentBackHandler?.({ result: 'SUCCESS' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latestPhase).toBe('awaiting_parcel');
    expect(mockRefetchParcel).toHaveBeenCalledTimes(1);
    act(() => renderer!.unmount());
  });

  it('returns idle when the refreshed Parcel is no longer payable', async () => {
    mockRefetchParcel.mockResolvedValue({ data: { status: 'RESERVED' } });
    let latestPhase: ParcelPaymentReturnPhase = 'checking';
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <HookProbe onPhase={(phase) => { latestPhase = phase; }} />,
      );
    });

    await act(async () => {
      mockPaymentBackHandler?.({ result: 'SUCCESS' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latestPhase).toBe('idle');
    expect(mockRefetchParcel).toHaveBeenCalledTimes(1);
    act(() => renderer!.unmount());
  });

  it('coalesces concurrent detail checks', async () => {
    let resolveRefetch: ((value: { data: { status: string } }) => void) | undefined;
    mockRefetchParcel.mockReturnValue(new Promise((resolve) => {
      resolveRefetch = resolve;
    }));
    let checkNow: CheckNow | undefined;
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <HookProbe
          onPhase={() => undefined}
          onCheckNow={(value) => { checkNow = value; }}
        />,
      );
    });

    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    await act(async () => {
      first = checkNow?.();
      second = checkNow?.();
      await Promise.resolve();
    });
    expect(second).toBe(first);
    expect(mockRefetchParcel).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefetch?.({ data: { status: 'RESERVED' } });
      await first;
    });
    act(() => renderer!.unmount());
  });

  it('ignores PaymentBack from another Parcel session', async () => {
    mockGetPendingVnPaySession.mockResolvedValue({
      sessionId: '33333333-3333-4333-8333-333333333333',
      ownerUserId: mockUserId,
      kind: 'parcel_deposit',
      businessId: '44444444-4444-4444-8444-444444444444',
      createdAt: '2026-08-17T00:00:00.000Z',
      paymentRedirectUrl: 'https://sandbox.vnpayment.vn/pay',
      vnpaySdk: { tmnCode: 'tmn', scheme: 'vietride', isSandbox: true },
    });
    let latestPhase: ParcelPaymentReturnPhase = 'idle';
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <HookProbe onPhase={(phase) => { latestPhase = phase; }} />,
      );
    });

    await act(async () => {
      mockPaymentBackHandler?.({ result: 'CANCELLED' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latestPhase).toBe('idle');
    expect(mockRefetchParcel).not.toHaveBeenCalled();
    act(() => renderer!.unmount());
  });

  it('drops an in-flight result after the parcel and payment kind change', async () => {
    let resolveOldRefetch: ((value: { data: { status: string } }) => void) | undefined;
    const oldRefetch = jest.fn(() => new Promise<{ data: { status: string } }>((resolve) => {
      resolveOldRefetch = resolve;
    }));
    const newRefetch = jest.fn(async () => ({ data: { status: 'PENDING_PAYMENT' } }));
    let latestPhase: ParcelPaymentReturnPhase = 'idle';
    let checkNow: CheckNow | undefined;
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <HookProbe
          onPhase={(phase) => { latestPhase = phase; }}
          onCheckNow={(value) => { checkNow = value; }}
          refetchParcel={oldRefetch}
        />,
      );
    });

    let oldRun: Promise<void> | undefined;
    await act(async () => {
      oldRun = checkNow?.();
      await Promise.resolve();
    });
    expect(latestPhase).toBe('checking');

    await act(async () => {
      renderer!.update(
        <HookProbe
          expectedKind="parcel_final"
          onPhase={(phase) => { latestPhase = phase; }}
          parcelId="44444444-4444-4444-8444-444444444444"
          refetchParcel={newRefetch}
        />,
      );
      await Promise.resolve();
    });
    expect(latestPhase).toBe('idle');

    await act(async () => {
      resolveOldRefetch?.({ data: { status: 'PENDING_PAYMENT' } });
      await oldRun;
    });

    expect(latestPhase).toBe('idle');
    expect(newRefetch).not.toHaveBeenCalled();
    act(() => renderer!.unmount());
  });

  it('drops an in-flight result when reconciliation is disabled', async () => {
    let resolveRefetch: ((value: { data: { status: string } }) => void) | undefined;
    const refetch = jest.fn(() => new Promise<{ data: { status: string } }>((resolve) => {
      resolveRefetch = resolve;
    }));
    let latestPhase: ParcelPaymentReturnPhase = 'idle';
    let checkNow: CheckNow | undefined;
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <HookProbe
          onPhase={(phase) => { latestPhase = phase; }}
          onCheckNow={(value) => { checkNow = value; }}
          refetchParcel={refetch}
        />,
      );
    });

    let oldRun: Promise<void> | undefined;
    await act(async () => {
      oldRun = checkNow?.();
      await Promise.resolve();
      renderer!.update(
        <HookProbe
          enabled={false}
          onPhase={(phase) => { latestPhase = phase; }}
          refetchParcel={refetch}
        />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      resolveRefetch?.({ data: { status: 'PENDING_PAYMENT' } });
      await oldRun;
    });

    expect(latestPhase).toBe('idle');
    act(() => renderer!.unmount());
  });

  it('ignores a delayed PaymentBack lookup after the signed-in account changes', async () => {
    let resolvePending: ((value: {
      sessionId: string;
      ownerUserId: string;
      kind: 'parcel_deposit';
      businessId: string;
    }) => void) | undefined;
    mockGetPendingVnPaySession.mockReturnValueOnce(new Promise((resolve) => {
      resolvePending = resolve;
    }));
    let latestPhase: ParcelPaymentReturnPhase = 'idle';
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <HookProbe onPhase={(phase) => { latestPhase = phase; }} />,
      );
    });

    await act(async () => {
      mockPaymentBackHandler?.({ result: 'SUCCESS' });
      await Promise.resolve();
      mockAuthState.user = { id: '55555555-5555-4555-8555-555555555555' };
      renderer!.update(
        <HookProbe onPhase={(phase) => { latestPhase = phase; }} />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      resolvePending?.({
        sessionId: '33333333-3333-4333-8333-333333333333',
        ownerUserId: mockUserId,
        kind: 'parcel_deposit',
        businessId: mockParcelId,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latestPhase).toBe('idle');
    expect(mockRefetchParcel).not.toHaveBeenCalled();
    act(() => renderer!.unmount());
  });
});
