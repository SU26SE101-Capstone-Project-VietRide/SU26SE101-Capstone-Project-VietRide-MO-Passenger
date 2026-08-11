/** Shared VNPay MOBILE_SDK contract types (BE v1.73+). */

export type PaymentReturnMode = 'MOBILE_SDK';

export type VnPaySessionKind =
  | 'booking'
  | 'topup'
  | 'parcel_deposit'
  | 'parcel_final';

export interface VnPaySdkMeta {
  tmnCode: string;
  scheme: string;
  isSandbox: boolean;
}

/** Terminal + in-flight statuses from GET /payments/sessions/{sessionId}. */
export type PaymentSessionStatus =
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED';

export interface PaymentSessionStatusResult {
  sessionId: string;
  status: PaymentSessionStatus;
}

/**
 * Minimal charge result fields required to open VNPay and poll.
 * Endpoint-specific ids are optional; exactly one session id must resolve.
 */
export interface VnPayChargeResult {
  paymentRedirectUrl: string | null | undefined;
  paymentReturnMode?: PaymentReturnMode | string | null;
  vnpaySdk?: VnPaySdkMeta | null;
  paymentId?: string | null;
  topUpRequestId?: string | null;
  depositPaymentId?: string | null;
  balancePaymentId?: string | null;
}

export interface PendingVnPaySession {
  sessionId: string;
  ownerUserId: string;
  kind: VnPaySessionKind;
  businessId?: string;
  createdAt: string;
  paymentRedirectUrl: string;
  vnpaySdk: VnPaySdkMeta;
}

export const isTerminalPaymentSessionStatus = (
  status: PaymentSessionStatus,
): boolean =>
  status === 'SUCCEEDED'
  || status === 'FAILED'
  || status === 'EXPIRED'
  || status === 'REFUNDED';
