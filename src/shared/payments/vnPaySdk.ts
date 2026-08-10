import { Linking } from 'react-native';

import { isTrustedPaymentRedirectUrl } from '@shared/utils/url';
import type { VnPaySdkMeta } from './types';

export class VnPaySdkError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'VnPaySdkError';
    this.code = code;
  }
}

export type OpenVnPaySdkInput = {
  paymentUrl: string;
  tmnCode: string;
  scheme: string;
  isSandbox: boolean;
};

export type OpenVnPaySdkResult = 'back' | 'error';

/**
 * Opens the VNPay checkout surface.
 *
 * Native merchant SDK package is not pinned yet (team decision). Until then,
 * we open the BE-issued HTTPS payment URL after validating SDK metadata that
 * BE requires for MOBILE_SDK sessions. Return handling must not trust deep-link
 * query params — poll GET /payments/sessions/{id} instead.
 *
 * Replace the body of this function when the official RN VNPay SDK is added;
 * keep the input shape stable.
 */
export async function openVnPaySdk(
  input: OpenVnPaySdkInput,
): Promise<OpenVnPaySdkResult> {
  const paymentUrl = input.paymentUrl.trim();
  const tmnCode = input.tmnCode.trim();
  const scheme = input.scheme.trim();

  if (!paymentUrl || !tmnCode || !scheme) {
    throw new VnPaySdkError(
      'VNPAY_SDK_META_INVALID',
      'VNPay SDK metadata from the payment response is incomplete.',
    );
  }

  if (!isTrustedPaymentRedirectUrl(paymentUrl)) {
    throw new VnPaySdkError(
      'VNPAY_REDIRECT_UNTRUSTED',
      'Payment redirect URL is not a trusted VNPay HTTPS host.',
    );
  }

  // isSandbox is intentionally read so callers must pass BE value (no hardcode).
  void input.isSandbox;

  try {
    const canOpen = await Linking.canOpenURL(paymentUrl);
    if (!canOpen) {
      throw new VnPaySdkError(
        'VNPAY_SDK_OPEN_FAILED',
        'Unable to open the VNPay payment surface.',
      );
    }

    await Linking.openURL(paymentUrl);
    return 'back';
  } catch (error) {
    if (error instanceof VnPaySdkError) throw error;
    throw new VnPaySdkError(
      'VNPAY_SDK_OPEN_FAILED',
      'Unable to open the VNPay payment surface.',
    );
  }
}

export function toOpenVnPaySdkInput(
  paymentUrl: string,
  meta: VnPaySdkMeta,
): OpenVnPaySdkInput {
  return {
    paymentUrl,
    tmnCode: meta.tmnCode,
    scheme: meta.scheme,
    isSandbox: meta.isSandbox,
  };
}
