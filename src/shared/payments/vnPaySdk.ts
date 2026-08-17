import {
  requireOptionalNativeModule,
  type EventSubscription,
} from 'expo-modules-core';
import { Platform } from 'react-native';

import { isTrustedPaymentRedirectUrl } from '@shared/utils/url';
import type { VnPaySdkMeta } from './types';

export const VNPAY_RESULT_CODES = {
  APP_BACK: -1,
  CALL_MOBILE_BANKING: 10,
  SUCCESS: 97,
  FAILED: 98,
  CANCELLED: 99,
} as const;

export type VnPaySdkResultCode =
  (typeof VNPAY_RESULT_CODES)[keyof typeof VNPAY_RESULT_CODES];

export type VnPaySdkResult =
  | 'APP_BACK'
  | 'CALL_MOBILE_BANKING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

export type VnPayPaymentBackEvent = {
  resultCode: VnPaySdkResultCode;
  result: VnPaySdkResult;
};

type NativeVnPayEvents = {
  PaymentBack: (event: { resultCode: number }) => void;
};

interface NativeVnPayModule {
  addListener(
    eventName: 'PaymentBack',
    listener: NativeVnPayEvents['PaymentBack'],
  ): EventSubscription;
  show(input: OpenVnPaySdkInput): Promise<void>;
}

let nativeModule: NativeVnPayModule | null | undefined;

const getNativeModule = (): NativeVnPayModule | null => {
  if (Platform.OS !== 'android') return null;
  if (nativeModule === undefined) {
    nativeModule =
      requireOptionalNativeModule<NativeVnPayModule>('VietRideVnPay');
  }
  return nativeModule;
};

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

export const isAbandonedVnPaySdkResult = (
  result: VnPaySdkResult | undefined,
): boolean => result === 'CANCELLED' || result === 'FAILED';

export function mapVnPaySdkResultCode(
  resultCode: number,
): VnPaySdkResult {
  switch (resultCode) {
    case VNPAY_RESULT_CODES.APP_BACK:
      return 'APP_BACK';
    case VNPAY_RESULT_CODES.CALL_MOBILE_BANKING:
      return 'CALL_MOBILE_BANKING';
    case VNPAY_RESULT_CODES.SUCCESS:
      return 'SUCCESS';
    case VNPAY_RESULT_CODES.CANCELLED:
      return 'CANCELLED';
    case VNPAY_RESULT_CODES.FAILED:
    default:
      return 'FAILED';
  }
}

export function isVnPaySdkAvailable(): boolean {
  return getNativeModule() !== null;
}

export function assertVnPaySdkAvailable(): void {
  if (!isVnPaySdkAvailable()) {
    throw new VnPaySdkError(
      'VNPAY_SDK_UNAVAILABLE',
      'VNPay is available only in the VietRide Android native app.',
    );
  }
}

export function addVnPaySdkPaymentBackListener(
  listener: (event: VnPayPaymentBackEvent) => void,
): EventSubscription | null {
  const module = getNativeModule();
  if (!module) return null;

  return module.addListener('PaymentBack', (event) => {
    listener({
      resultCode: event.resultCode as VnPaySdkResultCode,
      result: mapVnPaySdkResultCode(event.resultCode),
    });
  });
}

export async function openVnPaySdk(
  input: OpenVnPaySdkInput,
): Promise<void> {
  const paymentUrl = input.paymentUrl.trim();
  const tmnCode = input.tmnCode.trim();
  const scheme = input.scheme.trim();

  if (!paymentUrl || !tmnCode) {
    throw new VnPaySdkError(
      'VNPAY_SDK_META_INVALID',
      'VNPay SDK metadata from the payment response is incomplete.',
    );
  }

  if (scheme !== 'vietride') {
    throw new VnPaySdkError(
      'VNPAY_SDK_SCHEME_INVALID',
      'VNPay SDK scheme must match the VietRide app scheme.',
    );
  }

  if (!isTrustedPaymentRedirectUrl(paymentUrl)) {
    throw new VnPaySdkError(
      'VNPAY_REDIRECT_UNTRUSTED',
      'Payment redirect URL is not a trusted VNPay HTTPS host.',
    );
  }

  const module = getNativeModule();
  if (!module) {
    throw new VnPaySdkError(
      'VNPAY_SDK_UNAVAILABLE',
      'VNPay is unavailable in this app build.',
    );
  }

  try {
    await module.show({
      paymentUrl,
      tmnCode,
      scheme,
      isSandbox: input.isSandbox,
    });
  } catch (error) {
    if (error instanceof VnPaySdkError) throw error;
    const nativeCode =
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && typeof error.code === 'string'
        ? error.code
        : 'VNPAY_SDK_OPEN_FAILED';
    throw new VnPaySdkError(
      nativeCode,
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

export function resetVnPaySdkModuleForTests(): void {
  nativeModule = undefined;
}
