import type { BusTrip } from '../types';

const toValidTimestamp = (value?: string): number | null => {
  if (!value) return null;

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

/**
 * Mirrors the current BE round-trip invariants that can be checked from the
 * public trip contracts. Seat identity remains independent per trip.
 */
export const isEligibleReturnTrip = (
  candidate: BusTrip,
  outbound: BusTrip,
): boolean => {
  const expectedReturnRouteId = outbound.returnRouteId?.trim();
  if (!expectedReturnRouteId || candidate.routeId !== expectedReturnRouteId) {
    return false;
  }

  const outboundArrival = toValidTimestamp(outbound.estimatedArrivalDateTime);
  const returnDeparture = toValidTimestamp(candidate.departureDateTime);

  return outboundArrival !== null
    && returnDeparture !== null
    && returnDeparture > outboundArrival;
};
