import { getPaymentSessionStatus } from './paymentSessionApi';
import { pickVnPaySessionId } from './pickSessionId';
import {
  clearPendingVnPaySession,
  savePendingVnPaySession,
} from './pendingVnPaySession';
import {
  isTerminalPaymentSessionStatus,
  type PendingVnPaySession,
  type VnPayChargeResult,
  type VnPaySessionKind,
} from './types';
import {
  assertVnPaySdkAvailable,
  openVnPaySdk,
  toOpenVnPaySdkInput,
  VnPaySdkError,
} from './vnPaySdk';

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
  ownerUserId: string;
}

export async function openVnPayPayment({
  result,
  kind,
  businessId,
  ownerUserId,
}: OpenVnPayPaymentOptions): Promise<{ sessionId: string }> {
  const sessionId = pickVnPaySessionId(result);
  const paymentUrl = result.paymentRedirectUrl?.trim() ?? '';
  const sdk = result.vnpaySdk;

  if (!sessionId || !paymentUrl || !sdk || !ownerUserId.trim()) {
    throw new VnPayPaymentOpenError(
      'VNPAY_CHARGE_INCOMPLETE',
      'Payment response is missing session, SDK, or owner metadata.',
    );
  }

  if (
    !sdk.tmnCode?.trim()
    || !sdk.scheme?.trim()
    || typeof sdk.isSandbox !== 'boolean'
  ) {
    throw new VnPayPaymentOpenError(
      'VNPAY_SDK_META_INVALID',
      'Payment response vnpaySdk is incomplete.',
    );
  }

  try {
    assertVnPaySdkAvailable();
    await savePendingVnPaySession({
      sessionId,
      kind,
      businessId,
      ownerUserId,
      paymentRedirectUrl: paymentUrl,
      vnpaySdk: {
        tmnCode: sdk.tmnCode.trim(),
        scheme: sdk.scheme.trim(),
        isSandbox: sdk.isSandbox,
      },
    });
    await openVnPaySdk(toOpenVnPaySdkInput(paymentUrl, sdk));
  } catch (error) {
    if (error instanceof VnPaySdkError) {
      throw new VnPayPaymentOpenError(error.code, error.message);
    }
    throw error;
  }

  return { sessionId };
}

export async function reopenPendingVnPayPayment(
  pending: PendingVnPaySession,
  ownerUserId: string,
): Promise<{ sessionId: string }> {
  if (!ownerUserId || pending.ownerUserId !== ownerUserId) {
    await clearPendingVnPaySession();
    throw new VnPayPaymentOpenError(
      'VNPAY_SESSION_OWNER_MISMATCH',
      'Pending VNPay session belongs to another user.',
    );
  }

  const status = await getPaymentSessionStatus(pending.sessionId);
  if (status.status !== 'PENDING') {
    if (isTerminalPaymentSessionStatus(status.status)) {
      await clearPendingVnPaySession();
    }
    throw new VnPayPaymentOpenError(
      'VNPAY_SESSION_NOT_PENDING',
      'Pending VNPay session is no longer payable.',
    );
  }

  return openVnPayPayment({
    kind: pending.kind,
    businessId: pending.businessId,
    ownerUserId,
    result: {
      paymentId: pending.sessionId,
      paymentRedirectUrl: pending.paymentRedirectUrl,
      vnpaySdk: pending.vnpaySdk,
    },
  });
}

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

  /** Single-flight reopen from a validated pending session (Detail "Open again"). */
  reopen(
    pending: PendingVnPaySession,
    ownerUserId: string,
  ): Promise<{ sessionId: string }> {
    if (this.active) return this.active;

    const request = reopenPendingVnPayPayment(pending, ownerUserId);
    this.active = request;

    const release = (): void => {
      if (this.active === request) this.active = null;
    };
    request.then(release, release);

    return request;
  }
}
