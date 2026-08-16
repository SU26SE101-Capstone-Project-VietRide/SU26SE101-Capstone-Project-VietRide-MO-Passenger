import type { AvailableParcelTrip } from '../types';
import {
  calculateParcelQuotePricing,
  getParcelQuoteRefreshDelayMs,
  getParcelQuoteSemanticFingerprint,
  hasParcelQuoteContract,
  isParcelQuoteErrorCode,
  isParcelQuoteUsable,
  pickLowestFareParcelTrip,
} from './parcelQuote';

const trip = (overrides: Partial<AvailableParcelTrip> = {}): AvailableParcelTrip => ({
  tripId: '11111111-1111-4111-8111-111111111111',
  routeId: '22222222-2222-4222-8222-222222222222',
  status: 'SCHEDULED',
  operatorId: '33333333-3333-4333-8333-333333333333',
  operatorName: 'VietRide',
  originStation: {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Origin',
  },
  destinationStation: {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Destination',
  },
  departureDateTime: '2026-08-12T08:00:00+07:00',
  estimatedArrivalTime: '2026-08-12T12:00:00+07:00',
  quoteToken: 'opaque.signed-quote',
  quoteExpiresAt: '2026-08-12T07:10:00+07:00',
  estimatedSizeCategory: 'MEDIUM',
  estimatedGrossPriceVnd: 160_000,
  estimatedDiscountVnd: 0,
  estimatedPriceVnd: 160_000,
  estimatedDepositVnd: 32_000,
  depositPercent: 20,
  ...overrides,
});

describe('parcel quote lifecycle', () => {
  const nowMs = Date.parse('2026-08-12T07:00:00+07:00');

  it('defaults to the cheapest usable trip and keeps a stable tie-break', () => {
    const expensive = trip({
      tripId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      estimatedPriceVnd: 180_000,
      estimatedGrossPriceVnd: 180_000,
    });
    const cheapLater = trip({
      tripId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      estimatedPriceVnd: 120_000,
      estimatedGrossPriceVnd: 120_000,
      departureDateTime: '2026-08-12T10:00:00+07:00',
    });
    const cheapEarlier = trip({
      tripId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      estimatedPriceVnd: 120_000,
      estimatedGrossPriceVnd: 120_000,
      departureDateTime: '2026-08-12T08:30:00+07:00',
    });
    const unusable = trip({
      tripId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      estimatedPriceVnd: 10_000,
      estimatedGrossPriceVnd: 10_000,
      quoteToken: null,
    });

    expect(pickLowestFareParcelTrip(
      [expensive, unusable, cheapLater, cheapEarlier],
      nowMs,
    )?.tripId).toBe(cheapEarlier.tripId);
    expect(pickLowestFareParcelTrip([unusable], nowMs)).toBeNull();
  });

  it('fails closed when authoritative quote fields are missing', () => {
    expect(hasParcelQuoteContract(trip({ quoteToken: null }))).toBe(false);
    expect(hasParcelQuoteContract(trip({ quoteExpiresAt: null }))).toBe(false);
    expect(hasParcelQuoteContract(trip({ estimatedSizeCategory: null }))).toBe(false);
    expect(hasParcelQuoteContract(trip({ estimatedGrossPriceVnd: null }))).toBe(false);
    expect(hasParcelQuoteContract(trip({ estimatedDiscountVnd: null }))).toBe(false);
  });

  it('refreshes once the quote enters the 30-second safety window', () => {
    expect(getParcelQuoteRefreshDelayMs(
      '2026-08-12T07:00:45+07:00',
      nowMs,
    )).toBe(15_000);
    expect(getParcelQuoteRefreshDelayMs(
      '2026-08-12T07:00:15+07:00',
      nowMs,
    )).toBe(0);
  });

  it('requires sufficient validity before submit', () => {
    expect(isParcelQuoteUsable(
      trip({ quoteExpiresAt: '2026-08-12T07:00:45+07:00' }),
      nowMs,
      30_000,
    )).toBe(true);
    expect(isParcelQuoteUsable(
      trip({ quoteExpiresAt: '2026-08-12T07:00:15+07:00' }),
      nowMs,
      30_000,
    )).toBe(false);
  });

  it('keeps opaque token and expiry out of the semantic fingerprint', () => {
    const original = trip();
    const refreshed = trip({
      quoteToken: 'different-token',
      quoteExpiresAt: '2026-08-12T07:20:00+07:00',
    });
    const repriced = trip({ estimatedGrossPriceVnd: 170_000 });

    expect(getParcelQuoteSemanticFingerprint(refreshed)).toBe(
      getParcelQuoteSemanticFingerprint(original),
    );
    expect(getParcelQuoteSemanticFingerprint(repriced)).not.toBe(
      getParcelQuoteSemanticFingerprint(original),
    );
    expect(getParcelQuoteSemanticFingerprint(original)).not.toContain(
      original.quoteToken,
    );
  });

  it.each([
    'PARCEL_QUOTE_INVALID',
    'PARCEL_QUOTE_EXPIRED',
    'PARCEL_QUOTE_STALE',
    'PARCEL_QUOTE_MISMATCH',
  ])('recognizes deterministic quote error %s', (code) => {
    expect(isParcelQuoteErrorCode(code)).toBe(true);
  });
});

describe('calculateParcelQuotePricing', () => {
  it('uses the server quote before a voucher is selected', () => {
    expect(calculateParcelQuotePricing(trip({
      estimatedDiscountVnd: 10_000,
    }))).toEqual({
      grossPriceVnd: 160_000,
      discountAmountVnd: 10_000,
      totalAfterDiscountVnd: 150_000,
      depositPercent: 20,
      depositDueVnd: 30_000,
    });
  });

  it('applies fixed and percentage voucher amounts before the deposit', () => {
    expect(calculateParcelQuotePricing(trip(), 40_000).depositDueVnd).toBe(24_000);
    expect(calculateParcelQuotePricing(trip(), 16_000).depositDueVnd).toBe(28_800);
  });

  it('clamps discount to gross and rounds positive VND deposits', () => {
    expect(calculateParcelQuotePricing(trip(), 999_999).depositDueVnd).toBe(0);
    expect(calculateParcelQuotePricing(trip({
      estimatedGrossPriceVnd: 10_003,
      depositPercent: 20,
    }), 0).depositDueVnd).toBe(2_001);
  });
});
