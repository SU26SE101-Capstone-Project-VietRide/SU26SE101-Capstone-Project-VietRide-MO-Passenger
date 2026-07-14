import { Linking } from 'react-native';

import { isTrustedPaymentRedirectUrl } from './url';

export const PAYMENT_REDIRECT_ERROR_TITLE = 'Không thể mở trang thanh toán';
const PAYMENT_REDIRECT_ERROR_MESSAGE =
  'Liên kết thanh toán không hợp lệ hoặc thiết bị không thể mở liên kết này.';

export class PaymentRedirectError extends Error {
  constructor() {
    super(PAYMENT_REDIRECT_ERROR_MESSAGE);
    this.name = 'PaymentRedirectError';
  }
}

export const getPaymentRedirectErrorMessage = (error: unknown): string =>
  error instanceof PaymentRedirectError
    ? error.message
    : PAYMENT_REDIRECT_ERROR_MESSAGE;

export const openPaymentRedirect = async (redirectUrl: string): Promise<void> => {
  const normalizedUrl = redirectUrl.trim();
  if (!isTrustedPaymentRedirectUrl(normalizedUrl)) {
    throw new PaymentRedirectError();
  }

  try {
    const canOpen = await Linking.canOpenURL(normalizedUrl);
    if (!canOpen) {
      throw new PaymentRedirectError();
    }

    await Linking.openURL(normalizedUrl);
  } catch (error) {
    if (error instanceof PaymentRedirectError) {
      throw error;
    }

    throw new PaymentRedirectError();
  }
};
