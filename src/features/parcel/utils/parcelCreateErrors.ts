import { isAmbiguousIdempotentRequestError, toApiError } from '@shared/api/errors';
import type { ParcelPaymentMethod } from '../types';
import { isParcelQuoteErrorCode } from './parcelQuote';

/** BE-proven create/search trip freshness conflicts that warrant re-selection. */
export const PARCEL_TRIP_FRESHNESS_ERROR_CODES = [
  'TRIP_NOT_FOUND',
  'TRIP_NOT_ACCEPTING_PARCEL',
  'TRIP_CARGO_CAPACITY_EXCEEDED',
] as const;

/**
 * In-memory exact-retry UI state. Never persist payload/token/key.
 * Deposit keeps locked paymentMethod for preflight and intent equality.
 */
export type AmbiguousRetryState =
  | null
  | { kind: 'create' }
  | {
      kind: 'deposit';
      parcelId: string;
      paymentMethod: ParcelPaymentMethod;
    };

export const isAmbiguousRetryActive = (
  state: AmbiguousRetryState,
): state is Exclude<AmbiguousRetryState, null> => state !== null;

export type ParcelCreateConflictKind =
  | 'session'
  | 'quote_expired'
  | 'quote_invalid'
  | 'idempotency_pending'
  | 'trip_freshness'
  | 'code_collision'
  | 'retry_intent_changed'
  | 'ambiguous'
  | 'generic';

export const classifyParcelCreateConflict = (
  error: unknown,
): ParcelCreateConflictKind => {
  const apiError = toApiError(error);
  const code = apiError.code;

  if (code === 'SESSION_INVALIDATED') {
    return 'session';
  }
  if (code === 'PARCEL_RETRY_INTENT_CHANGED') {
    return 'retry_intent_changed';
  }
  if (
    code === 'PARCEL_QUOTE_EXPIRED'
    || code === 'PARCEL_QUOTE_STALE'
  ) {
    return 'quote_expired';
  }
  if (
    code === 'PARCEL_QUOTE_INVALID'
    || code === 'PARCEL_QUOTE_MISMATCH'
    || isParcelQuoteErrorCode(code)
  ) {
    return 'quote_invalid';
  }
  if (code === 'IDEMPOTENCY_REQUEST_PENDING') {
    return 'idempotency_pending';
  }
  if (code === 'PARCEL_CODE_COLLISION') {
    return 'code_collision';
  }
  if (
    (PARCEL_TRIP_FRESHNESS_ERROR_CODES as readonly string[]).includes(code)
  ) {
    return 'trip_freshness';
  }
  if (isAmbiguousIdempotentRequestError(error, {
    retainOnRateLimit: true,
    retainOnUnknownStatus: true,
  })) {
    return 'ambiguous';
  }
  return 'generic';
};

export const isParcelAmbiguousPaymentError = (error: unknown): boolean =>
  isAmbiguousIdempotentRequestError(error, {
    retainOnRateLimit: true,
    retainOnUnknownStatus: true,
  })
  && toApiError(error).code !== 'SESSION_INVALIDATED';

export const isPaymentAlreadyStartedError = (error: unknown): boolean =>
  toApiError(error).code === 'PAYMENT_ALREADY_STARTED';
