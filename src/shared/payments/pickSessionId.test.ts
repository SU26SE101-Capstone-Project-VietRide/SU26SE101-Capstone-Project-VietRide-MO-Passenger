import { pickVnPaySessionId } from './pickSessionId';

describe('pickVnPaySessionId', () => {
  it('prefers paymentId then top-up then parcel ids', () => {
    expect(
      pickVnPaySessionId({
        paymentId: 'pay-1',
        topUpRequestId: 'top-1',
      }),
    ).toBe('pay-1');

    expect(
      pickVnPaySessionId({
        paymentId: null,
        topUpRequestId: 'top-1',
      }),
    ).toBe('top-1');

    expect(
      pickVnPaySessionId({
        depositPaymentId: 'dep-1',
      }),
    ).toBe('dep-1');

    expect(
      pickVnPaySessionId({
        balancePaymentId: 'bal-1',
      }),
    ).toBe('bal-1');

    expect(pickVnPaySessionId({})).toBeNull();
  });
});
