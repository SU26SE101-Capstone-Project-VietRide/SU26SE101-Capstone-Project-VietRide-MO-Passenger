import {
  openVnPayPayment,
  reopenPendingVnPayPayment,
  VnPayPaymentOpenCoordinator,
  VnPayPaymentOpenError,
} from './openVnPayPayment';
import * as paymentSessionApi from './paymentSessionApi';
import * as pending from './pendingVnPaySession';
import * as sdk from './vnPaySdk';
import type { PendingVnPaySession } from './types';

jest.mock('./paymentSessionApi', () => ({
  getPaymentSessionStatus: jest.fn(),
}));

jest.mock('./pendingVnPaySession', () => ({
  clearPendingVnPaySession: jest.fn(async () => undefined),
  savePendingVnPaySession: jest.fn(async (session) => session),
}));

jest.mock('./vnPaySdk', () => ({
  assertVnPaySdkAvailable: jest.fn(),
  openVnPaySdk: jest.fn(async () => undefined),
  toOpenVnPaySdkInput: jest.requireActual('./vnPaySdk').toOpenVnPaySdkInput,
  VnPaySdkError: jest.requireActual('./vnPaySdk').VnPaySdkError,
}));

const OWNER_USER_ID = '11111111-1111-4111-8111-111111111111';
const charge = {
  paymentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  paymentRedirectUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnpaySdk: {
    tmnCode: 'TMN',
    scheme: 'vietride',
    isSandbox: true,
  },
};

const options = {
  result: charge,
  kind: 'booking' as const,
  businessId: 'b1',
  ownerUserId: OWNER_USER_ID,
};

describe('openVnPayPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks native availability, persists full session, then opens SDK', async () => {
    await expect(openVnPayPayment(options)).resolves.toEqual({
      sessionId: charge.paymentId,
    });

    expect(sdk.assertVnPaySdkAvailable).toHaveBeenCalledTimes(1);
    expect(pending.savePendingVnPaySession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: charge.paymentId,
        kind: 'booking',
        businessId: 'b1',
        ownerUserId: OWNER_USER_ID,
        paymentRedirectUrl: charge.paymentRedirectUrl,
        vnpaySdk: charge.vnpaySdk,
      }),
    );
    expect(sdk.openVnPaySdk).toHaveBeenCalledWith({
      paymentUrl: charge.paymentRedirectUrl,
      tmnCode: 'TMN',
      scheme: 'vietride',
      isSandbox: true,
    });
  });

  it('fails before persistence when native SDK is unavailable', async () => {
    jest.mocked(sdk.assertVnPaySdkAvailable).mockImplementationOnce(() => {
      throw new sdk.VnPaySdkError('VNPAY_SDK_UNAVAILABLE', 'missing');
    });

    await expect(openVnPayPayment(options)).rejects.toMatchObject({
      code: 'VNPAY_SDK_UNAVAILABLE',
    });
    expect(pending.savePendingVnPaySession).not.toHaveBeenCalled();
    expect(sdk.openVnPaySdk).not.toHaveBeenCalled();
  });

  it('refuses incomplete charge responses', async () => {
    await expect(
      openVnPayPayment({
        result: { ...charge, vnpaySdk: null },
        kind: 'booking',
        ownerUserId: OWNER_USER_ID,
      }),
    ).rejects.toBeInstanceOf(VnPayPaymentOpenError);

    expect(sdk.openVnPaySdk).not.toHaveBeenCalled();
  });

  it('checks PENDING status before reopening a saved session', async () => {
    jest.mocked(paymentSessionApi.getPaymentSessionStatus).mockResolvedValue({
      sessionId: charge.paymentId,
      status: 'PENDING',
    });
    const saved: PendingVnPaySession = {
      sessionId: charge.paymentId,
      kind: 'booking',
      businessId: 'b1',
      ownerUserId: OWNER_USER_ID,
      createdAt: '2026-08-11T00:00:00.000Z',
      paymentRedirectUrl: charge.paymentRedirectUrl,
      vnpaySdk: charge.vnpaySdk,
    };

    await expect(
      reopenPendingVnPayPayment(saved, OWNER_USER_ID),
    ).resolves.toEqual({ sessionId: charge.paymentId });
    expect(paymentSessionApi.getPaymentSessionStatus).toHaveBeenCalledWith(
      charge.paymentId,
    );
  });

  it('clears a terminal session instead of reopening it', async () => {
    jest.mocked(paymentSessionApi.getPaymentSessionStatus).mockResolvedValue({
      sessionId: charge.paymentId,
      status: 'SUCCEEDED',
    });
    const saved: PendingVnPaySession = {
      sessionId: charge.paymentId,
      kind: 'booking',
      ownerUserId: OWNER_USER_ID,
      createdAt: '2026-08-11T00:00:00.000Z',
      paymentRedirectUrl: charge.paymentRedirectUrl,
      vnpaySdk: charge.vnpaySdk,
    };

    await expect(
      reopenPendingVnPayPayment(saved, OWNER_USER_ID),
    ).rejects.toMatchObject({ code: 'VNPAY_SESSION_NOT_PENDING' });
    expect(pending.clearPendingVnPaySession).toHaveBeenCalledTimes(1);
    expect(sdk.openVnPaySdk).not.toHaveBeenCalled();
  });

  it('coalesces double-open attempts', async () => {
    let resolveOpen: (() => void) | undefined;
    jest.mocked(sdk.openVnPaySdk).mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        resolveOpen = resolve;
      }),
    );
    const coordinator = new VnPayPaymentOpenCoordinator();

    const first = coordinator.open(options);
    const second = coordinator.open(options);

    expect(second).toBe(first);
    await Promise.resolve();
    resolveOpen?.();
    await expect(first).resolves.toEqual({ sessionId: charge.paymentId });
    expect(sdk.openVnPaySdk).toHaveBeenCalledTimes(1);
  });
});
