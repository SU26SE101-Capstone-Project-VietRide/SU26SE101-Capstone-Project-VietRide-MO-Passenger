jest.mock('../api/trackingApi', () => ({
  getShuttlePassengerContext: jest.fn(),
  getTripRouteContext: jest.fn(),
  trackingKeys: {
    shuttlePassengerContext: jest.fn(() => ['shuttle', 'context']),
    routeContext: jest.fn(() => ['trip', 'context']),
  },
}));

import {
  selectShuttlePassengerPickup,
} from './useTrackingMapContext';
import type { ShuttlePassengerContext } from '../api/trackingApi';

const BOOKING_A = '11111111-1111-4111-8111-111111111111';
const BOOKING_B = '22222222-2222-4222-8222-222222222222';

const contextWithTwoPickups = {
  shuttleTripId: '33333333-3333-4333-8333-333333333333',
  mainTripId: '44444444-4444-4444-8444-444444444444',
  direction: 'INBOUND_TO_STATION',
  ownPickups: [
    {
      bookingId: BOOKING_A,
      pickupOrder: 1,
      serviceAddress: '12 Nguyen Hue',
      latitude: 10.775,
      longitude: 106.7,
      status: 'PENDING',
      stopsBeforePickup: 0,
    },
    {
      bookingId: BOOKING_B,
      pickupOrder: 3,
      serviceAddress: '99 Le Loi',
      latitude: 10.78,
      longitude: 106.69,
      status: 'PENDING',
      stopsBeforePickup: 2,
    },
  ],
  station: {
    stationId: '55555555-5555-4555-8555-555555555555',
    name: 'Ben Thanh',
    latitude: 10.772,
    longitude: 106.698,
    pickupOrder: 8,
  },
} as ShuttlePassengerContext;

describe('selectShuttlePassengerPickup', () => {
  it('selects the pickup for the notified bookingId (multi-booking passenger)', () => {
    expect(selectShuttlePassengerPickup(contextWithTwoPickups, BOOKING_B)).toEqual(
      expect.objectContaining({
        bookingId: BOOKING_B,
        serviceAddress: '99 Le Loi',
      }),
    );
    expect(selectShuttlePassengerPickup(contextWithTwoPickups, BOOKING_A)).toEqual(
      expect.objectContaining({
        bookingId: BOOKING_A,
        serviceAddress: '12 Nguyen Hue',
      }),
    );
  });

  it('prioritizes an exact bookingId over pickupOrder', () => {
    expect(selectShuttlePassengerPickup(contextWithTwoPickups, BOOKING_B, 1)).toEqual(
      expect.objectContaining({ bookingId: BOOKING_B }),
    );
  });

  it('uses pickupOrder only when bookingId is absent', () => {
    expect(selectShuttlePassengerPickup(contextWithTwoPickups, undefined, 3)).toEqual(
      expect.objectContaining({ bookingId: BOOKING_B, pickupOrder: 3 }),
    );
  });

  it('does not select another pickup when a supplied bookingId is unmatched', () => {
    expect(selectShuttlePassengerPickup(
      contextWithTwoPickups,
      '77777777-7777-4777-8777-777777777777',
      1,
    )).toBeNull();
  });

  it('falls back to earliest PENDING when bookingId is missing', () => {
    expect(selectShuttlePassengerPickup(contextWithTwoPickups)).toEqual(
      expect.objectContaining({ bookingId: BOOKING_A }),
    );
  });
});
