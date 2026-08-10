import type { VnPayChargeResult } from './types';

/** Picks the BE session id used by GET /payments/sessions/{sessionId}. */
export function pickVnPaySessionId(
  result: Pick<
    VnPayChargeResult,
    'paymentId' | 'topUpRequestId' | 'depositPaymentId' | 'balancePaymentId'
  >,
): string | null {
  const candidates = [
    result.paymentId,
    result.topUpRequestId,
    result.depositPaymentId,
    result.balancePaymentId,
  ];

  for (const value of candidates) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed) return trimmed;
  }

  return null;
}
