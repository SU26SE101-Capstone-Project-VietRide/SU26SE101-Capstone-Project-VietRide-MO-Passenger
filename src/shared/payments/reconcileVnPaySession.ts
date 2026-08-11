import { getPaymentSessionStatus } from './paymentSessionApi';
import {
  clearPendingVnPaySession,
  getPendingVnPaySession,
} from './pendingVnPaySession';
import {
  isTerminalPaymentSessionStatus,
  type PaymentSessionStatus,
  type PaymentSessionStatusResult,
  type PendingVnPaySession,
} from './types';
import { toApiError } from '@shared/api/errors';

export const VNPAY_SESSION_POLL_DELAYS_MS = [
  0,
  600,
  1_000,
  1_500,
  2_000,
  2_500,
  3_000,
  4_000,
] as const;

type Wait = (delayMs: number) => Promise<void>;

const wait: Wait = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

export const isRetryablePaymentSessionError = (error: unknown): boolean => {
  const apiError = toApiError(error);
  const statusCode = apiError.statusCode;

  return (
    apiError.isNetworkError
    || apiError.code === 'REQUEST_TIMEOUT'
    || statusCode === 408
    || statusCode === 429
    || Boolean(statusCode && statusCode >= 500)
  );
};

export interface PollVnPaySessionOptions {
  sessionId: string;
  isCurrent?: () => boolean;
  shouldRetryError?: (error: unknown) => boolean;
  delaysMs?: readonly number[];
  waitForDelay?: Wait;
  fetchStatus?: (sessionId: string) => Promise<PaymentSessionStatusResult>;
}

/**
 * Bounded foreground poll of GET /payments/sessions/{id}.
 * Stops on terminal status or when the delay budget ends (still PENDING).
 */
export async function pollVnPaySessionStatus({
  sessionId,
  isCurrent = () => true,
  shouldRetryError = isRetryablePaymentSessionError,
  delaysMs = VNPAY_SESSION_POLL_DELAYS_MS,
  waitForDelay = wait,
  fetchStatus = getPaymentSessionStatus,
}: PollVnPaySessionOptions): Promise<PaymentSessionStatusResult | null> {
  let latest: PaymentSessionStatusResult | null = null;

  for (const delayMs of delaysMs) {
    if (!isCurrent()) return null;
    if (delayMs > 0) await waitForDelay(delayMs);
    if (!isCurrent()) return null;

    try {
      latest = await fetchStatus(sessionId);
    } catch (error) {
      if (!isCurrent() || !shouldRetryError(error)) throw error;
      continue;
    }

    if (isTerminalPaymentSessionStatus(latest.status)) {
      return latest;
    }
  }

  return latest;
}

export interface ReconcilePendingVnPaySessionResult {
  pending: PendingVnPaySession | null;
  status: PaymentSessionStatusResult | null;
  cleared: boolean;
}

export type ReconcilePendingVnPaySessionOptions =
  Omit<PollVnPaySessionOptions, 'sessionId'> & {
    ownerUserId: string;
  };

/**
 * Reconciles only the signed-in user's stored session. Owner mismatch is
 * cleared before any status request so accounts can never poll each other.
 */
export async function reconcilePendingVnPaySession({
  ownerUserId,
  ...pollOptions
}: ReconcilePendingVnPaySessionOptions): Promise<ReconcilePendingVnPaySessionResult> {
  const pending = await getPendingVnPaySession();
  if (!pending) {
    return { pending: null, status: null, cleared: false };
  }

  if (!ownerUserId || pending.ownerUserId !== ownerUserId) {
    await clearPendingVnPaySession();
    return { pending, status: null, cleared: true };
  }

  const status = await pollVnPaySessionStatus({
    ...pollOptions,
    sessionId: pending.sessionId,
  });

  if (status && isTerminalPaymentSessionStatus(status.status)) {
    await clearPendingVnPaySession();
    return { pending, status, cleared: true };
  }

  return { pending, status, cleared: false };
}

export function isSuccessfulPaymentSession(
  status: PaymentSessionStatus | null | undefined,
): boolean {
  return status === 'SUCCEEDED';
}
