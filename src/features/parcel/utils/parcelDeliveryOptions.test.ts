import {
  flattenTripDeliveryOptions,
  getParcelDeliveryOptionKey,
  isDropoffPointAtDestination,
} from './parcelDeliveryOptions';
import type { AvailableParcelTrip, ParcelDropoffPoint } from '../types';

const createMockTrip = (
  tripId: string,
  dropoffPoints: ParcelDropoffPoint[],
  destinationStationId = 'dest-station-1',
): AvailableParcelTrip => ({
  tripId,
  routeId: 'route-1',
  status: 'SCHEDULED',
  operatorId: 'op-1',
  operatorName: 'VietRide Express',
  originStation: {
    id: 'origin-1',
    name: 'Bến xe Miền Tây',
  },
  destinationStation: {
    id: destinationStationId,
    name: 'Bến xe Cần Thơ',
  },
  departureDateTime: '2026-09-02T08:00:00.000Z',
  estimatedArrivalTime: '2026-09-02T11:00:00.000Z',
  quoteToken: 'token-123',
  quoteExpiresAt: '2026-09-02T08:30:00.000Z',
  estimatedSizeCategory: 'MEDIUM',
  estimatedGrossPriceVnd: 100_000,
  estimatedDiscountVnd: 0,
  estimatedPriceVnd: 100_000,
  estimatedDepositVnd: 50_000,
  depositPercent: 50,
  dropoffPoints,
});

describe('parcelDeliveryOptions', () => {
  const stationPoint: ParcelDropoffPoint = {
    type: 'STATION',
    stationId: 'dest-station-1',
    stopId: null,
    name: 'Bến xe Cần Thơ',
    orderIndex: 2,
    estimatedArrivalTime: '2026-09-02T11:00:00.000Z',
  };

  const stopPoint: ParcelDropoffPoint = {
    type: 'STOP',
    stationId: null,
    stopId: 'stop-tan-an',
    name: 'Điểm dừng Tân An',
    orderIndex: 1,
    estimatedArrivalTime: '2026-09-02T09:35:00.000Z',
  };

  describe('getParcelDeliveryOptionKey', () => {
    it('builds distinct keys for stations and stops and prevents collisions', () => {
      const stationKey = getParcelDeliveryOptionKey('trip-1', stationPoint);
      const stopKey = getParcelDeliveryOptionKey('trip-1', stopPoint);

      expect(stationKey).toBe('trip-1:STATION:dest-station-1');
      expect(stopKey).toBe('trip-1:STOP:stop-tan-an');
      expect(stationKey).not.toBe(stopKey);
    });

    it('does not collide if a stop and station have the same ID string', () => {
      const stopWithSameId: ParcelDropoffPoint = {
        type: 'STOP',
        stationId: null,
        stopId: 'dest-station-1',
        name: 'Trạm dừng cùng tên',
        orderIndex: 1,
        estimatedArrivalTime: '2026-09-02T09:30:00.000Z',
      };
      const stationKey = getParcelDeliveryOptionKey('trip-1', stationPoint);
      const stopKey = getParcelDeliveryOptionKey('trip-1', stopWithSameId);

      expect(stationKey).toBe('trip-1:STATION:dest-station-1');
      expect(stopKey).toBe('trip-1:STOP:dest-station-1');
      expect(stationKey).not.toBe(stopKey);
    });
  });

  describe('flattenTripDeliveryOptions', () => {
    it('produces 1 option for 1 trip with 1 station', () => {
      const trip = createMockTrip('trip-1', [stationPoint]);
      const options = flattenTripDeliveryOptions([trip]);

      expect(options).toHaveLength(1);
      expect(options[0].key).toBe('trip-1:STATION:dest-station-1');
      expect(options[0].trip.tripId).toBe('trip-1');
      expect(options[0].dropoffPoint.name).toBe('Bến xe Cần Thơ');
    });

    it('produces 2 options for 1 trip with a station and an intermediate stop, ordered by orderIndex', () => {
      // Pass in reverse orderIndex to verify sorting
      const trip = createMockTrip('trip-1', [stationPoint, stopPoint]);
      const options = flattenTripDeliveryOptions([trip]);

      expect(options).toHaveLength(2);
      expect(options[0].dropoffPoint.name).toBe('Điểm dừng Tân An');
      expect(options[0].dropoffPoint.orderIndex).toBe(1);
      expect(options[1].dropoffPoint.name).toBe('Bến xe Cần Thơ');
      expect(options[1].dropoffPoint.orderIndex).toBe(2);
    });

    it('preserves Backend trip order across multiple trips', () => {
      const tripA = createMockTrip('trip-A', [stationPoint]);
      const tripB = createMockTrip('trip-B', [stationPoint]);
      const options = flattenTripDeliveryOptions([tripA, tripB]);

      expect(options).toHaveLength(2);
      expect(options[0].trip.tripId).toBe('trip-A');
      expect(options[1].trip.tripId).toBe('trip-B');
    });

    it('deduplicates options if identical trips/keys appear in pagination merge', () => {
      const trip1 = createMockTrip('trip-1', [stationPoint]);
      const trip1Duplicate = createMockTrip('trip-1', [stationPoint]);
      const options = flattenTripDeliveryOptions([trip1, trip1Duplicate]);

      expect(options).toHaveLength(1);
    });
  });

  describe('isDropoffPointAtDestination', () => {
    it('returns true when dropoff point is the destination station', () => {
      const trip = createMockTrip('trip-1', [stationPoint], 'dest-station-1');
      expect(isDropoffPointAtDestination(trip, stationPoint)).toBe(true);
    });

    it('returns false when dropoff point is an intermediate stop', () => {
      const trip = createMockTrip('trip-1', [stopPoint], 'dest-station-1');
      expect(isDropoffPointAtDestination(trip, stopPoint)).toBe(false);
    });
  });
});
