import { toBackendPaymentMethod } from './paymentMethod';

describe('toBackendPaymentMethod', () => {
  it.each([
    ['wallet', 'WALLET'],
    ['vnpay', 'VNPAY'],
  ] as const)('maps %s to the backend value %s', (mobileMethod, backendMethod) => {
    expect(toBackendPaymentMethod(mobileMethod)).toBe(backendMethod);
  });
});
