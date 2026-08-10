import type { PaymentReturnMode } from './types';

export const MOBILE_SDK_RETURN_MODE: PaymentReturnMode = 'MOBILE_SDK';

type WithOptionalReturnMode = {
  paymentMethod?: string;
  method?: string;
  paymentReturnMode?: PaymentReturnMode;
};

/**
 * Attaches `paymentReturnMode: MOBILE_SDK` when the charge method is VNPAY.
 * WALLET (and other non-VNPAY) bodies never include the field.
 */
export function withVnPayPaymentReturnMode<T extends WithOptionalReturnMode>(
  payload: T,
): T {
  const method = (payload.paymentMethod ?? payload.method ?? '').toUpperCase();
  if (method !== 'VNPAY') {
    if (payload.paymentReturnMode === undefined) {
      return payload;
    }

    const next = { ...payload };
    delete next.paymentReturnMode;
    return next;
  }

  return {
    ...payload,
    paymentReturnMode: MOBILE_SDK_RETURN_MODE,
  };
}
