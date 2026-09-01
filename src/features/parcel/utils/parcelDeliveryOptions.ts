import type { AvailableParcelTrip, ParcelDropoffPoint } from '../types';

export interface ParcelDeliveryOption {
  key: string;
  trip: AvailableParcelTrip;
  dropoffPoint: ParcelDropoffPoint;
}

/**
 * Builds a deterministic, collision-free key for a trip + receiving point pair.
 */
export const getParcelDeliveryOptionKey = (
  tripId: string,
  point: ParcelDropoffPoint,
): string => (
  point.type === 'STOP'
    ? `${tripId}:STOP:${point.stopId}`
    : `${tripId}:STATION:${point.stationId}`
);

/**
 * Flattens loaded trips into exact delivery options.
 * Preserves Backend trip order and each point's orderIndex.
 */
export const flattenTripDeliveryOptions = (
  trips: readonly AvailableParcelTrip[],
): ParcelDeliveryOption[] => {
  const options: ParcelDeliveryOption[] = [];
  const seenKeys = new Set<string>();

  for (const trip of trips) {
    if (!trip || !Array.isArray(trip.dropoffPoints)) {
      continue;
    }

    const sortedPoints = [...trip.dropoffPoints].sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );

    for (const point of sortedPoints) {
      const key = getParcelDeliveryOptionKey(trip.tripId, point);
      if (seenKeys.has(key)) {
        continue;
      }
      seenKeys.add(key);
      options.push({
        key,
        trip,
        dropoffPoint: point,
      });
    }
  }

  return options;
};

/**
 * Checks if the dropoff point is the trip's final destination station.
 */
export const isDropoffPointAtDestination = (
  trip: AvailableParcelTrip,
  point: ParcelDropoffPoint,
): boolean => (
  point.type === 'STATION' && point.stationId === trip.destinationStation.id
);
