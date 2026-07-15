import type {
  BookingResult,
  BookingStatus,
  BookingStatusResult,
  RoundTripResult,
} from '../types';
import { toApiError } from '@shared/api/errors';

const ACTIVE_BOOKING_STATUS: BookingStatus = 'CONFIRMED';
const PENDING_BOOKING_STATUS: BookingStatus = 'PENDING_PAYMENT';

export const BOOKING_PAYMENT_POLL_DELAYS_MS = [
  0,
  600,
  1_000,
  1_500,
  2_000,
  2_500,
  3_000,
  4_000,
] as const;

export type BookingPaymentResolution =
  | { phase: 'pending'; statuses: readonly BookingStatusResult[] }
  | { phase: 'confirmed'; statuses: readonly BookingStatusResult[] }
  | {
    phase: 'expired';
    statuses: readonly BookingStatusResult[];
    terminalStatus: 'EXPIRED';
  }
  | {
    phase: 'inactive';
    statuses: readonly BookingStatusResult[];
    terminalStatus: BookingStatus;
  };

export const getBookingIds = (
  result: BookingResult | RoundTripResult | null,
): readonly string[] => {
  if (!result) return [];

  return 'bookingId' in result
    ? [result.bookingId]
    : [result.outbound.bookingId, result.return.bookingId];
};

export const resolveBookingPayment = (
  statuses: readonly BookingStatusResult[],
): BookingPaymentResolution => {
  const expired = statuses.find(({ status }) => status === 'EXPIRED');
  if (expired) {
    return { phase: 'expired', statuses, terminalStatus: 'EXPIRED' };
  }

  const inactive = statuses.find(
    ({ status }) => status !== ACTIVE_BOOKING_STATUS && status !== PENDING_BOOKING_STATUS,
  );
  if (inactive) {
    return { phase: 'inactive', statuses, terminalStatus: inactive.status };
  }

  if (
    statuses.length > 0
    && statuses.every(({ status }) => status === ACTIVE_BOOKING_STATUS)
  ) {
    return { phase: 'confirmed', statuses };
  }

  return { phase: 'pending', statuses };
};

type Wait = (delayMs: number) => Promise<void>;

const wait: Wait = (delayMs) => new Promise((resolve) => {
  setTimeout(resolve, delayMs);
});

interface PollBookingPaymentOptions {
  fetchResolution: () => Promise<BookingPaymentResolution>;
  isCurrent?: () => boolean;
  shouldRetryError?: (error: unknown) => boolean;
  delaysMs?: readonly number[];
  waitForDelay?: Wait;
}

export const isRetryableBookingStatusError = (error: unknown): boolean => {
  const apiError = toApiError(error);
  const statusCode = apiError.statusCode;

  return apiError.isNetworkError
    || apiError.code === 'REQUEST_TIMEOUT'
    || statusCode === 408
    || statusCode === 429
    || Boolean(statusCode && statusCode >= 500);
};

/**
 * Bounded post-redirect reconciliation. It deliberately stops after a short
 * foreground window so a pending VNPay session never polls for its full TTL.
 */
export async function pollBookingPayment({
  fetchResolution,
  isCurrent = () => true,
  shouldRetryError = () => false,
  delaysMs = BOOKING_PAYMENT_POLL_DELAYS_MS,
  waitForDelay = wait,
}: PollBookingPaymentOptions): Promise<BookingPaymentResolution | null> {
  let latest: BookingPaymentResolution = { phase: 'pending', statuses: [] };

  for (const delayMs of delaysMs) {
    if (!isCurrent()) return null;
    if (delayMs > 0) await waitForDelay(delayMs);
    if (!isCurrent()) return null;

    try {
      latest = await fetchResolution();
    } catch (error) {
      if (!isCurrent() || !shouldRetryError(error)) throw error;
      continue;
    }
    if (!isCurrent()) return null;
    if (latest.phase !== 'pending') return latest;
  }

  return latest;
}
