import { openVnPayPayment, VnPayPaymentOpenError } from './openVnPayPayment';
import * as pending from './pendingVnPaySession';
import * as sdk from './vnPaySdk';

jest.mock('./pendingVnPaySession', () => ({
  savePendingVnPaySession: jest.fn(async (session) => session),
}));

jest.mock('./vnPaySdk', () => ({
  openVnPaySdk: jest.fn(async () => 'back'),
  toOpenVnPaySdkInput: jest.requireActual('./vnPaySdk').toOpenVnPaySdkInput,
  VnPaySdkError: jest.requireActual('./vnPaySdk').VnPaySdkError,
}));

const charge = {
  paymentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  paymentRedirectUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnpaySdk: {
    tmnCode: 'TMN',
    scheme: 'vietride',
    isSandbox: true,
  },
};

describe('openVnPayPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists session then opens SDK', async () => {
    await expect(
      openVnPayPayment({ result: charge, kind: 'booking', businessId: 'b1' }),
    ).resolves.toEqual({ sessionId: charge.paymentId });

    expect(pending.savePendingVnPaySession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: charge.paymentId,
        kind: 'booking',
        businessId: 'b1',
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

  it('refuses incomplete charge responses', async () => {
    await expect(
      openVnPayPayment({
        result: { ...charge, vnpaySdk: null },
        kind: 'booking',
      }),
    ).rejects.toBeInstanceOf(VnPayPaymentOpenError);

    expect(sdk.openVnPaySdk).not.toHaveBeenCalled();
  });
});
