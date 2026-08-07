/**
 * Single pricing utility for passenger ticket booking display/previews.
 *
 * BE remains authority for fare, surcharge rounding, voucher, and charge.
 * This module only selects the correct unit fare already returned by BE.
 */

import type { BusTrip } from '../../trip/types/trip';
import { normalizeMoneyAmount } from '../../trip/types/trip';
import type { PickUpPoint, Seat } from '../types';

export type PricedTrip = Pick<BusTrip, 'baseFare' | 'effectiveFare'>;

export type PricedPickUp = Pick<PickUpPoint, 'stopId' | 'stationId' | 'effectiveFare'>;

/**
 * Unit fare for a trip card / filter (no pickup selected yet).
 * Always use BE effectiveFare (already normalized in mappers).
 */
export function getTripDisplayFare(trip: PricedTrip | null | undefined): number {
  if (!trip) return 0;
  return normalizeMoneyAmount(trip.effectiveFare)
    ?? normalizeMoneyAmount(trip.baseFare)
    ?? 0;
}

/**
 * Unit fare for the selected boarding point on a leg.
 * - Intermediate stop pickup: selectedPickUp.effectiveFare (copied from TripStop)
 * - Origin station pickup (or missing pickup): trip.effectiveFare
 */
export function getPickupUnitFare(
  trip: PricedTrip | null | undefined,
  pickUp?: PricedPickUp | null,
): number {
  if (!trip) return 0;

  const isIntermediateStop = Boolean(pickUp?.stopId) && !pickUp?.stationId;
  if (isIntermediateStop) {
    const stopFare = normalizeMoneyAmount(pickUp?.effectiveFare);
    if (stopFare != null) {
      return stopFare;
    }
  }

  return getTripDisplayFare(trip);
}

/** Leg subtotal = unit fare × seat count. */
export function getLegFareTotal(
  trip: PricedTrip | null | undefined,
  seats: readonly Seat[] | number,
  pickUp?: PricedPickUp | null,
): number {
  const seatCount = typeof seats === 'number' ? seats : seats.length;
  if (!trip || seatCount <= 0) return 0;
  return getPickupUnitFare(trip, pickUp) * seatCount;
}
