export type PaymentMethod = 'vnpay' | 'wallet';
export type BackendPaymentMethod = 'VNPAY' | 'WALLET';

const BACKEND_PAYMENT_METHOD: Readonly<Record<PaymentMethod, BackendPaymentMethod>> = {
  vnpay: 'VNPAY',
  wallet: 'WALLET',
};

/** Maps the mobile selection to the unchanged backend contract value. */
export const toBackendPaymentMethod = (
  method: PaymentMethod,
): BackendPaymentMethod => BACKEND_PAYMENT_METHOD[method];
