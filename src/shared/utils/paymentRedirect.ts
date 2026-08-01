import { Linking } from 'react-native';

import { isTrustedPaymentRedirectUrl } from './url';

export class PaymentRedirectError extends Error {
  constructor() {
    // Presentation copy belongs to each localized payment surface. The error
    // carries only a stable diagnostic code and is never rendered directly.
    super('PAYMENT_REDIRECT_FAILED');
    this.name = 'PaymentRedirectError';
  }
}

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
