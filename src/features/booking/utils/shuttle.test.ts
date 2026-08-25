import type {
  BusTrip,
  PickUpPoint,
  ShuttlePickupDraft,
} from '../types';
import type { StationDetail } from '@features/trip/types';
import {
  checkShuttleAddressAgainstStation,
  composeShuttleServiceAddress,
  getShuttleEligibility,
  getUserFacingShuttleErrorMessage,
  isOriginStationPickup,
  isShuttleRequestCutoffPassed,
  SHUTTLE_ADDRESS_MAX_LENGTH,
  SHUTTLE_MAX_ROAD_DISTANCE_KM,
  SHUTTLE_MAX_ROAD_DISTANCE_METERS,
  toShuttlePickupPayload,
  validateShuttlePickup,
} from './shuttle';

const trip = {
  originStationId: '11111111-1111-4111-8111-111111111111',
  status: 'SCHEDULED',
  departureDateTime: '2099-01-01T08:00:00+07:00',
} as BusTrip;

const originPickup: PickUpPoint = {
  id: `station-${trip.originStationId}`,
  stationId: trip.originStationId,
  name: 'Origin station',
  address: 'Station address',
  time: '08:00',
  status: 'current',
};

const draft: ShuttlePickupDraft = {
  stationId: trip.originStationId,
  address: '  12 Nguyen Hue, District 1  ',
  latitude: 10.7769,
  longitude: 106.7009,
};

const station = {
  id: trip.originStationId,
  isActive: true,
  supportsShuttle: true,
  latitude: 10.7769,
  longitude: 106.7009,
} as StationDetail;

describe('composeShuttleServiceAddress', () => {
  it('keeps the POI display name with the formatted street line', () => {
    expect(composeShuttleServiceAddress(
      'S802 Origami',
      'Long Bình, Quận 9, Hồ Chí Minh, Vietnam',
    )).toBe('S802 Origami, Long Bình, Quận 9, Hồ Chí Minh, Vietnam');
  });

  it('does not duplicate when formatted address already starts with the name', () => {
    expect(composeShuttleServiceAddress(
      'S802 Origami',
      'S802 Origami, Long Bình, Quận 9, Hồ Chí Minh',
    )).toBe('S802 Origami, Long Bình, Quận 9, Hồ Chí Minh');
  });

  it('falls back to a single non-empty field', () => {
    expect(composeShuttleServiceAddress('S802 Origami', '')).toBe('S802 Origami');
    expect(composeShuttleServiceAddress('', 'Long Bình, Quận 9')).toBe(
      'Long Bình, Quận 9',
    );
  });
});

describe('Shuttle booking rules', () => {
  it('normalizes an address and keeps finite coordinates', () => {
    expect(validateShuttlePickup(draft)).toEqual({
      value: {
        address: '12 Nguyen Hue, District 1',
        latitude: 10.7769,
        longitude: 106.7009,
      },
      error: null,
    });
  });

  it.each([
    [{ ...draft, address: ' ' }, 'Enter a Shuttle service address.'],
    [{ ...draft, address: 'a'.repeat(SHUTTLE_ADDRESS_MAX_LENGTH + 1) }, '500 characters'],
    [{ ...draft, latitude: Number.NaN }, 'latitude'],
    [{ ...draft, latitude: 91 }, 'latitude'],
    [{ ...draft, longitude: -181 }, 'longitude'],
  ])('rejects invalid Shuttle data without a network fallback', (input, message) => {
    const result = validateShuttlePickup(input);

    expect(result.value).toBeNull();
    expect(result.error).toContain(message);
  });

  it('allows Shuttle only when bus boarding is the exact origin station', () => {
    expect(isOriginStationPickup(trip, originPickup)).toBe(true);
    expect(isOriginStationPickup(trip, {
      ...originPickup,
      stationId: undefined,
      stopId: '22222222-2222-4222-8222-222222222222',
    })).toBe(false);
  });

  it('strips the local station binding from the network payload', () => {
    expect(toShuttlePickupPayload(draft, trip, originPickup)).toEqual({
      address: '12 Nguyen Hue, District 1',
      latitude: 10.7769,
      longitude: 106.7009,
    });
  });

  it('rejects a stale Shuttle draft after the boarding point changes', () => {
    expect(() => toShuttlePickupPayload(draft, trip, {
      ...originPickup,
      stationId: undefined,
      stopId: '22222222-2222-4222-8222-222222222222',
    })).toThrow('only available for boarding at the origin station');
  });

  it('never surfaces HTTP 422 to the passenger', () => {
    const translate = (key: string, options?: { limitKm?: number }) =>
      key === 'booking.shuttle.apiErrors.distanceExceeded'
        ? `over ${options?.limitKm} km`
        : key;

    expect(getUserFacingShuttleErrorMessage({
      code: 'SHUTTLE_DISTANCE_EXCEEDED',
      message: 'Request failed with status code 422',
      statusCode: 422,
    }, translate)).toBe('over 10 km');

    expect(getUserFacingShuttleErrorMessage({
      code: 'API_ERROR',
      message: 'Request failed with status code 422',
      statusCode: 422,
    }, translate)).toBe('booking.shuttle.apiErrors.unprocessable');
  });

  it('matches the BE 10 km inclusive shuttle cap', () => {
    expect(SHUTTLE_MAX_ROAD_DISTANCE_KM).toBe(10);
    expect(SHUTTLE_MAX_ROAD_DISTANCE_METERS).toBe(10_000);

    const earthRadiusKm = 6_371;
    const latitudeDeltaForMeters = (meters: number): number =>
      ((meters / 1_000) / earthRadiusKm) * (180 / Math.PI);
    const origin = { latitude: 0, longitude: 0 };
    const exactlyTenKmNorth = {
      latitude: latitudeDeltaForMeters(10_000),
      longitude: 0,
    };
    const tenKmAndOneMeterNorth = {
      latitude: latitudeDeltaForMeters(10_001),
      longitude: 0,
    };

    expect(checkShuttleAddressAgainstStation(origin, origin)).toEqual(
      expect.objectContaining({ ok: true }),
    );
    expect(checkShuttleAddressAgainstStation(exactlyTenKmNorth, origin)).toEqual(
      expect.objectContaining({ ok: true }),
    );
    expect(checkShuttleAddressAgainstStation(tenKmAndOneMeterNorth, origin)).toEqual(
      expect.objectContaining({ ok: false, reason: 'TOO_FAR' }),
    );
    expect(checkShuttleAddressAgainstStation(
      { latitude: Number.NaN, longitude: 106.7 },
      origin,
    )).toEqual({ ok: false, reason: 'COORDINATES' });
  });

  it('uses the strict T-30 cutoff', () => {
    const departure = '2026-07-16T10:00:00+07:00';

    expect(isShuttleRequestCutoffPassed(
      departure,
      Date.parse('2026-07-16T09:29:59+07:00'),
    )).toBe(false);
    expect(isShuttleRequestCutoffPassed(
      departure,
      Date.parse('2026-07-16T09:30:00+07:00'),
    )).toBe(true);
  });

  it('keeps the server authoritative when the device clock is ahead', () => {
    const deviceClock = jest.spyOn(Date, 'now').mockReturnValue(
      Date.parse('2100-01-01T00:00:00+07:00'),
    );

    try {
      expect(getShuttleEligibility(trip, originPickup, station)).toEqual({
        eligible: true,
        reason: null,
      });
      expect(toShuttlePickupPayload(draft, trip, originPickup)).toEqual({
        address: '12 Nguyen Hue, District 1',
        latitude: 10.7769,
        longitude: 106.7009,
      });
    } finally {
      deviceClock.mockRestore();
    }
  });

  it.each([
    [{ ...trip, status: undefined }, 'TRIP_STATUS'],
    [{ ...trip, departureDateTime: undefined }, 'TRIP_SCHEDULE'],
    [{ ...trip, departureDateTime: 'not-an-iso-timestamp' }, 'TRIP_SCHEDULE'],
  ])('fails closed when live trip eligibility is incomplete', (candidate, reason) => {
    expect(getShuttleEligibility(
      candidate as BusTrip,
      originPickup,
      station,
    )).toEqual({ eligible: false, reason });
    expect(() => toShuttlePickupPayload(
      draft,
      candidate as BusTrip,
      originPickup,
    )).toThrow();
  });
});
