import { pickVnPaySessionId } from './pickSessionId';
import { savePendingVnPaySession } from './pendingVnPaySession';
import type { VnPayChargeResult, VnPaySessionKind } from './types';
import { openVnPaySdk, toOpenVnPaySdkInput, VnPaySdkError } from './vnPaySdk';

export class VnPayPaymentOpenError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'VnPayPaymentOpenError';
    this.code = code;
  }
}

export interface OpenVnPayPaymentOptions {
  result: VnPayChargeResult;
  kind: VnPaySessionKind;
  businessId?: string;
}

/**
 * Persists the BE session id, then opens VNPay. Callers poll session status
 * after the user returns to the app — never infer paid from the open result.
 */
export async function openVnPayPayment({
  result,
  kind,
  businessId,
}: OpenVnPayPaymentOptions): Promise<{ sessionId: string }> {
  const sessionId = pickVnPaySessionId(result);
  const paymentUrl = result.paymentRedirectUrl?.trim() ?? '';
  const sdk = result.vnpaySdk;

  if (!sessionId || !paymentUrl || !sdk) {
    throw new VnPayPaymentOpenError(
      'VNPAY_CHARGE_INCOMPLETE',
      'Payment response is missing sessionId, paymentRedirectUrl, or vnpaySdk.',
    );
  }

  if (
    !sdk.tmnCode?.trim()
    || !sdk.scheme?.trim()
    || typeof sdk.isSandbox !== 'boolean'
  ) {
    throw new VnPayPaymentOpenError(
      'VNPAY_SDK_META_INVALID',
      'payment response vnpaySdk is incomplete.',
    );
  }

  await savePendingVnPaySession({
    sessionId,
    kind,
    businessId,
    paymentRedirectUrl: paymentUrl,
    vnpaySdk: {
      tmnCode: sdk.tmnCode.trim(),
      scheme: sdk.scheme.trim(),
      isSandbox: sdk.isSandbox,
    },
  });

  try {
    await openVnPaySdk(toOpenVnPaySdkInput(paymentUrl, sdk));
  } catch (error) {
    if (error instanceof VnPaySdkError) {
      throw new VnPayPaymentOpenError(error.code, error.message);
    }
    throw error;
  }

  return { sessionId };
}

/**
 * Re-opens VNPay for a previously saved pending session (continue-pay / resume).
 */
export async function reopenPendingVnPayPayment(
  pending: {
    sessionId: string;
    kind: VnPaySessionKind;
    businessId?: string;
    paymentRedirectUrl?: string;
    vnpaySdk?: {
      tmnCode: string;
      scheme: string;
      isSandbox: boolean;
    };
  },
): Promise<{ sessionId: string }> {
  return openVnPayPayment({
    kind: pending.kind,
    businessId: pending.businessId,
    result: {
      paymentId: pending.sessionId,
      paymentRedirectUrl: pending.paymentRedirectUrl,
      vnpaySdk: pending.vnpaySdk ?? null,
    },
  });
}

/** Double-tap gate matching the previous PaymentRedirectCoordinator behaviour. */
export class VnPayPaymentOpenCoordinator {
  private active: Promise<{ sessionId: string }> | null = null;

  get isRunning(): boolean {
    return this.active !== null;
  }

  open(options: OpenVnPayPaymentOptions): Promise<{ sessionId: string }> {
    if (this.active) return this.active;

    const request = openVnPayPayment(options);
    this.active = request;

    const release = (): void => {
      if (this.active === request) this.active = null;
    };
    request.then(release, release);

    return request;
  }
}
