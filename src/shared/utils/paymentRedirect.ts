import { Linking, type AppStateStatus } from 'react-native';

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

/**
 * Serializes payment-browser launches for a screen. Keeping the gate beside
 * the trusted redirect opener prevents every payment surface from growing a
 * slightly different double-tap guard.
 */
export class PaymentRedirectCoordinator {
  private active: Promise<void> | null = null;

  get isRunning(): boolean {
    return this.active !== null;
  }

  open(redirectUrl: string): Promise<void> {
    if (this.active) return this.active;

    const request = openPaymentRedirect(redirectUrl);
    this.active = request;

    const release = (): void => {
      if (this.active === request) this.active = null;
    };
    request.then(release, release);

    return request;
  }
}

/**
 * Consumes one real external-payment round trip. Merely rendering while the
 * app is active never triggers reconciliation; the app must leave the
 * foreground first and then return.
 */
export class PaymentReturnGate {
  private isArmed = false;
  private hasLeftApp = false;

  arm(currentState: AppStateStatus): void {
    this.isArmed = true;
    this.hasLeftApp = currentState !== 'active';
  }

  cancel(): void {
    this.isArmed = false;
    this.hasLeftApp = false;
  }

  consume(nextState: AppStateStatus): boolean {
    if (!this.isArmed) return false;

    if (nextState !== 'active') {
      this.hasLeftApp = true;
      return false;
    }

    if (!this.hasLeftApp) return false;

    this.cancel();
    return true;
  }
}
