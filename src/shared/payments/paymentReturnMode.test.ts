import { withVnPayPaymentReturnMode } from './paymentReturnMode';

describe('withVnPayPaymentReturnMode', () => {
  it('adds MOBILE_SDK for VNPAY paymentMethod', () => {
    expect(
      withVnPayPaymentReturnMode({ paymentMethod: 'VNPAY', amount: 1 }),
    ).toEqual({
      paymentMethod: 'VNPAY',
      amount: 1,
      paymentReturnMode: 'MOBILE_SDK',
    });
  });

  it('adds MOBILE_SDK for top-up method field', () => {
    expect(
      withVnPayPaymentReturnMode({ method: 'VNPAY', amount: 10_000 }),
    ).toEqual({
      method: 'VNPAY',
      amount: 10_000,
      paymentReturnMode: 'MOBILE_SDK',
    });
  });

  it('omits paymentReturnMode for WALLET', () => {
    expect(
      withVnPayPaymentReturnMode({
        paymentMethod: 'WALLET',
        paymentReturnMode: 'MOBILE_SDK',
      }),
    ).toEqual({ paymentMethod: 'WALLET' });
  });
});
