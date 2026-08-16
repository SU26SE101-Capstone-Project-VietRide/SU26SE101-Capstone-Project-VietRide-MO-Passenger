import type { AvailableParcelTrip } from '../types';

export const PARCEL_QUOTE_REFRESH_SAFETY_WINDOW_MS = 30_000;

export const PARCEL_QUOTE_ERROR_CODES = [
  'PARCEL_QUOTE_INVALID',
  'PARCEL_QUOTE_EXPIRED',
  'PARCEL_QUOTE_STALE',
  'PARCEL_QUOTE_MISMATCH',
] as const;

export type ParcelQuoteErrorCode = (typeof PARCEL_QUOTE_ERROR_CODES)[number];

const parcelQuoteErrorCodes = new Set<string>(PARCEL_QUOTE_ERROR_CODES);

export interface ParcelQuotePricing {
  grossPriceVnd: number;
  discountAmountVnd: number;
  totalAfterDiscountVnd: number;
  depositPercent: number;
  depositDueVnd: number;
}

export const isParcelQuoteErrorCode = (
  code: string | null | undefined,
): code is ParcelQuoteErrorCode => Boolean(code && parcelQuoteErrorCodes.has(code));

export const hasParcelQuoteContract = (
  trip: AvailableParcelTrip | null | undefined,
): trip is AvailableParcelTrip & {
  quoteToken: string;
  quoteExpiresAt: string;
  estimatedSizeCategory: NonNullable<AvailableParcelTrip['estimatedSizeCategory']>;
  estimatedGrossPriceVnd: number;
  estimatedDiscountVnd: number;
} => {
  if (!trip) return false;

  const hasMoney =
    typeof trip.estimatedGrossPriceVnd === 'number'
    && Number.isFinite(trip.estimatedGrossPriceVnd)
    && trip.estimatedGrossPriceVnd >= 0
    && typeof trip.estimatedDiscountVnd === 'number'
    && Number.isFinite(trip.estimatedDiscountVnd)
    && trip.estimatedDiscountVnd >= 0;

  return Boolean(
    trip.quoteToken?.trim()
      && trip.quoteExpiresAt
      && trip.estimatedSizeCategory
      && hasMoney,
  );
};

export const getParcelQuoteRemainingMs = (
  quoteExpiresAt: string | null | undefined,
  nowMs = Date.now(),
): number => {
  if (!quoteExpiresAt) return Number.NEGATIVE_INFINITY;
  const expiresAtMs = Date.parse(quoteExpiresAt);
  return Number.isFinite(expiresAtMs)
    ? expiresAtMs - nowMs
    : Number.NEGATIVE_INFINITY;
};

export const isParcelQuoteUsable = (
  trip: AvailableParcelTrip | null | undefined,
  nowMs = Date.now(),
  minimumRemainingMs = 0,
): boolean =>
  hasParcelQuoteContract(trip)
  && getParcelQuoteRemainingMs(trip.quoteExpiresAt, nowMs) > minimumRemainingMs;

/**
 * Default checkout trip: lowest quoted fare among usable trips.
 * Ties break on earlier departure, then stable tripId.
 */
export const pickLowestFareParcelTrip = (
  trips: readonly AvailableParcelTrip[],
  nowMs = Date.now(),
): AvailableParcelTrip | null => {
  let winner: AvailableParcelTrip | null = null;

  for (const trip of trips) {
    if (!isParcelQuoteUsable(trip, nowMs)) continue;
    if (!winner) {
      winner = trip;
      continue;
    }
    if (trip.estimatedPriceVnd < winner.estimatedPriceVnd) {
      winner = trip;
      continue;
    }
    if (trip.estimatedPriceVnd !== winner.estimatedPriceVnd) continue;

    const tripDeparture = Date.parse(trip.departureDateTime);
    const winnerDeparture = Date.parse(winner.departureDateTime);
    if (tripDeparture < winnerDeparture) {
      winner = trip;
      continue;
    }
    if (
      tripDeparture === winnerDeparture
      && trip.tripId < winner.tripId
    ) {
      winner = trip;
    }
  }

  return winner;
};

export const getParcelQuoteRefreshDelayMs = (
  quoteExpiresAt: string | null | undefined,
  nowMs = Date.now(),
  safetyWindowMs = PARCEL_QUOTE_REFRESH_SAFETY_WINDOW_MS,
): number => Math.max(
  0,
  getParcelQuoteRemainingMs(quoteExpiresAt, nowMs) - safetyWindowMs,
);

/**
 * Represents the user-confirmed price/category semantics without retaining the
 * opaque, user-bound token. A refreshed token can be adopted only when this
 * fingerprint is unchanged.
 */
export const getParcelQuoteSemanticFingerprint = (
  trip: AvailableParcelTrip | null | undefined,
): string | null => {
  if (!trip?.estimatedSizeCategory) return null;

  return JSON.stringify([
    trip.estimatedSizeCategory,
    trip.estimatedGrossPriceVnd,
    trip.estimatedDiscountVnd,
    trip.estimatedPriceVnd,
    trip.depositPercent,
    trip.estimatedDepositVnd,
  ]);
};

export const calculateParcelQuotePricing = (
  trip: AvailableParcelTrip | null | undefined,
  voucherDiscountVnd?: number | null,
): ParcelQuotePricing => {
  const grossPriceVnd = Math.max(0, trip?.estimatedGrossPriceVnd ?? 0);
  const requestedDiscount = voucherDiscountVnd
    ?? trip?.estimatedDiscountVnd
    ?? 0;
  const discountAmountVnd = Math.min(
    Math.max(0, Number.isFinite(requestedDiscount) ? requestedDiscount : 0),
    grossPriceVnd,
  );
  const totalAfterDiscountVnd = grossPriceVnd - discountAmountVnd;
  const depositPercent = Math.min(
    Math.max(0, trip?.depositPercent ?? 0),
    100,
  );

  return {
    grossPriceVnd,
    discountAmountVnd,
    totalAfterDiscountVnd,
    depositPercent,
    depositDueVnd: Math.round(
      totalAfterDiscountVnd * depositPercent / 100,
    ),
  };
};
