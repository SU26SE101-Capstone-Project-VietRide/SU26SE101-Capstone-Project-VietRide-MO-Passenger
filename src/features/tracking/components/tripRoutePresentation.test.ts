import type { TrackingEta, TripRouteContext } from '../api/trackingApi';
import { buildTripRoutePresentation } from './tripRoutePresentation';

const stopA = '22222222-2222-4222-8222-222222222222';
const stopB = '33333333-3333-4333-8333-333333333333';
const stationId = '44444444-4444-4444-8444-444444444444';
const tripId = '11111111-1111-4111-8111-111111111111';

const originStationId = '66666666-6666-4666-8666-666666666666';

const context: TripRouteContext = {
  tripId,
  geometry: {
    source: 'ROUTE_POLYLINE',
    points: [
      { latitude: 10.7, longitude: 106.6 },
      { latitude: 10.8, longitude: 106.7 },
    ],
  },
  originStation: {
    stationId: originStationId,
    name: 'Origin',
    latitude: 10.7,
    longitude: 106.6,
  },
  intermediateStops: [
    { stopId: stopA, name: 'Stop A', sequence: 1, latitude: 10.71, longitude: 106.61 },
    { stopId: stopB, name: 'Stop B', sequence: 2, latitude: 10.72, longitude: 106.62 },
  ],
  destinationStation: {
    stationId,
    name: 'Destination',
    latitude: 10.8,
    longitude: 106.7,
  },
};

const eta = (stopId: string, sequence: number): TrackingEta => ({
  tripId,
  targetKind: 'STOP',
  stopId,
  sequence,
  stopName: null,
  etaMinutes: sequence * 10,
  estimatedArrivalTime: `2026-08-10T1${sequence}:00:00+07:00`,
  distanceMeters: sequence * 1_000,
  updatedAt: '2026-08-10T10:00:00+07:00',
  delayed: null,
  delayStatus: 'UNKNOWN',
  delayMinutes: null,
  estimateQuality: 'TRAFFIC_AWARE',
});

describe('buildTripRoutePresentation', () => {
  it('uses one combined targetNext marker when the next stop is the passenger target', () => {
    const result = buildTripRoutePresentation({
      context,
      etas: [eta(stopA, 1), eta(stopB, 2)],
      plannedStops: [],
      target: { kind: 'STOP', stopId: stopA },
    });

    expect(result.featuredStops).toHaveLength(1);
    expect(result.featuredStops[0]).toMatchObject({ id: stopA, isNext: true, isTarget: true });
    expect(result.markers.find((marker) => marker.id === `stop:${stopA}`)?.kind)
      .toBe('targetNext');
  });

  it('retains route order and keeps next and target as distinct featured stops', () => {
    const result = buildTripRoutePresentation({
      context,
      etas: [eta(stopA, 1), eta(stopB, 2)],
      plannedStops: [],
      target: { kind: 'STOP', stopId: stopB },
    });

    expect(result.upcomingStops.map((stop) => stop.id)).toEqual([stopA, stopB, stationId]);
    expect(result.featuredStops.map((stop) => stop.id)).toEqual([stopA, stopB]);
  });

  it('uses 4 map pin roles: origin, destination, intermediate, passenger stop', () => {
    const result = buildTripRoutePresentation({
      context,
      etas: [eta(stopA, 1), eta(stopB, 2)],
      plannedStops: [],
      target: { kind: 'STOP', stopId: stopB },
    });

    expect(result.markers.find((marker) => marker.id === `origin:${originStationId}`)?.kind)
      .toBe('origin');
    // Next operational stop is not a fifth map color — stays intermediate.
    expect(result.markers.find((marker) => marker.id === `stop:${stopA}`)?.kind)
      .toBe('intermediate');
    expect(result.markers.find((marker) => marker.id === `stop:${stopB}`)?.kind)
      .toBe('target');
    expect(result.markers.find((marker) => marker.id === `destination:${stationId}`)?.kind)
      .toBe('destination');
  });

  it('colors destination as passenger stop when the passenger target is the terminal station', () => {
    const result = buildTripRoutePresentation({
      context,
      etas: [],
      plannedStops: [],
      target: { kind: 'STATION', stationId },
    });

    expect(result.markers.find((marker) => marker.id === `destination:${stationId}`)?.kind)
      .toBe('target');
    expect(result.markers.find((marker) => marker.id === `origin:${originStationId}`)?.kind)
      .toBe('origin');
  });

  it('falls back to geometry endpoints when station POIs have no coordinates', () => {
    const result = buildTripRoutePresentation({
      context: {
        ...context,
        originStation: null,
        destinationStation: null,
      },
      destinationPlannedStationId: stationId,
      originPlannedStationId: originStationId,
      originStationName: 'Ben xe di',
      destinationStationName: 'Ben xe den',
      etas: [],
      plannedStops: [],
    });

    expect(result.markers.find((marker) => marker.id === `origin:${originStationId}`))
      .toMatchObject({
        kind: 'origin',
        name: 'Ben xe di',
        latitude: 10.7,
        longitude: 106.6,
      });
    expect(result.markers.find((marker) => marker.id === `destination:${stationId}`))
      .toMatchObject({
        kind: 'destination',
        name: 'Ben xe den',
        latitude: 10.8,
        longitude: 106.7,
      });
  });

  it('drops ETA targets outside the effective route instead of guessing a match', () => {
    const foreignStopId = '55555555-5555-4555-8555-555555555555';
    const result = buildTripRoutePresentation({
      context,
      etas: [eta(foreignStopId, 1)],
      plannedStops: [],
      target: { kind: 'STOP', stopId: foreignStopId },
    });

    expect(result.hasEtaRouteMismatch).toBe(true);
    expect(result.targetId).toBeUndefined();
    expect(result.upcomingStops.every((stop) => stop.eta === null)).toBe(true);
  });

  it('uses planned time only for the exact matching route stop or destination station', () => {
    const result = buildTripRoutePresentation({
      context,
      destinationPlannedArrivalTime: '2026-08-10T18:00:00+07:00',
      destinationPlannedStationId: stationId,
      etas: [],
      plannedStops: [{
        id: stopA,
        orderIndex: 1,
        status: 'PENDING',
        estimatedArrivalTime: '2026-08-10T12:00:00+07:00',
      }],
    });

    expect(result.upcomingStops.find((stop) => stop.id === stopA)?.plannedArrivalTime)
      .toBe('2026-08-10T12:00:00+07:00');
    expect(result.upcomingStops.find((stop) => stop.id === stopB)?.plannedArrivalTime)
      .toBeNull();
    expect(result.upcomingStops.find((stop) => stop.id === stationId)?.plannedArrivalTime)
      .toBe('2026-08-10T18:00:00+07:00');
  });

  it('treats the destination as targetNext when it is the first valid live ETA', () => {
    const destinationEta: TrackingEta = {
      ...eta(stopA, 1),
      targetKind: 'STATION',
      stopId: undefined,
      stationId,
      sequence: undefined,
    };
    const result = buildTripRoutePresentation({
      context,
      etas: [destinationEta],
      plannedStops: [],
      target: { kind: 'STATION', stationId },
    });

    expect(result.featuredStops).toHaveLength(1);
    expect(result.featuredStops[0]).toMatchObject({
      id: stationId,
      isNext: true,
      isTarget: true,
    });
    expect(result.markers.find((marker) => marker.id === `destination:${stationId}`)?.kind)
      .toBe('targetNext');
  });

  it('retains all 50 valid route stops in both the list and marker model', () => {
    const intermediateStops = Array.from({ length: 50 }, (_, index) => ({
      stopId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      name: `Stop ${index + 1}`,
      sequence: index + 1,
      latitude: 10.7 + (index * 0.001),
      longitude: 106.6 + (index * 0.001),
    }));
    const result = buildTripRoutePresentation({
      context: { ...context, intermediateStops },
      etas: [],
      plannedStops: [],
    });

    expect(result.upcomingStops).toHaveLength(51);
    expect(result.markers.filter((marker) => marker.id.startsWith('stop:')))
      .toHaveLength(50);
  });

  it('selects the first route-sequence ETA instead of trusting batch wire order', () => {
    const destinationEta: TrackingEta = {
      ...eta(stopA, 1),
      targetKind: 'STATION',
      stopId: undefined,
      stationId,
      sequence: undefined,
    };
    const result = buildTripRoutePresentation({
      context,
      etas: [destinationEta, eta(stopB, 2), eta(stopA, 1)],
      plannedStops: [],
    });

    expect(result.nextTargetId).toBe(stopA);
    expect(result.upcomingStops.find((stop) => stop.id === stopA)?.isNext).toBe(true);
    expect(result.upcomingStops.find((stop) => stop.id === stationId)?.isNext).toBe(false);
  });

  it('deduplicates stop IDs and removes invalid coordinates once for rows and markers', () => {
    const result = buildTripRoutePresentation({
      context: {
        ...context,
        intermediateStops: [
          { ...context.intermediateStops[0], sequence: 2 },
          { ...context.intermediateStops[0], name: 'Duplicate A', sequence: 1 },
          { ...context.intermediateStops[1], latitude: 91 },
        ],
      },
      etas: [],
      plannedStops: [],
    });

    expect(result.upcomingStops.map((stop) => stop.id)).toEqual([stopA, stationId]);
    expect(result.markers.filter((marker) => marker.id === `stop:${stopA}`)).toHaveLength(1);
    expect(result.markers.some((marker) => marker.id === `stop:${stopB}`)).toBe(false);
  });

  it('does not promote planned destination when effective route stops lack exact planning data', () => {
    const foreignStopId = '55555555-5555-4555-8555-555555555555';
    const result = buildTripRoutePresentation({
      context,
      destinationPlannedArrivalTime: '2026-08-10T18:00:00+07:00',
      destinationPlannedStationId: stationId,
      etas: [eta(foreignStopId, 1)],
      plannedStops: [{
        id: foreignStopId,
        orderIndex: 1,
        status: 'PENDING',
        estimatedArrivalTime: '2026-08-10T12:00:00+07:00',
      }],
    });

    expect(result.hasEtaRouteMismatch).toBe(true);
    expect(result.nextTargetId).toBeUndefined();
    expect(result.featuredStops).toHaveLength(0);
    expect(result.upcomingStops.find((stop) => stop.id === stationId)?.isNext).toBe(false);
  });

  it('replaces invalid destination POI with geometry end when polyline exists', () => {
    const result = buildTripRoutePresentation({
      context: {
        ...context,
        destinationStation: context.destinationStation
          ? { ...context.destinationStation, longitude: 181 }
          : null,
      },
      destinationStationName: 'Geometry destination',
      etas: [],
      plannedStops: [],
    });

    expect(result.markers.find((marker) => marker.id.startsWith('destination:')))
      .toMatchObject({
        kind: 'destination',
        latitude: 10.8,
        longitude: 106.7,
        name: 'Geometry destination',
      });
    expect(result.upcomingStops.some((stop) => stop.targetKind === 'STATION')).toBe(true);
  });

  it('omits destination when both station POI and geometry end are unavailable', () => {
    const result = buildTripRoutePresentation({
      context: {
        ...context,
        geometry: null,
        destinationStation: context.destinationStation
          ? { ...context.destinationStation, longitude: 181 }
          : null,
      },
      etas: [],
      plannedStops: [],
    });

    expect(result.upcomingStops.some((stop) => stop.targetKind === 'STATION')).toBe(false);
    expect(result.markers.some((marker) => marker.id.startsWith('destination:'))).toBe(false);
  });

  it('does not expose planned next/time when current GPS requires live ETA', () => {
    const result = buildTripRoutePresentation({
      allowPlannedFallback: false,
      context,
      destinationPlannedArrivalTime: '2026-08-10T18:00:00+07:00',
      destinationPlannedStationId: stationId,
      etas: [],
      plannedStops: [{
        id: stopA,
        orderIndex: 1,
        status: 'PENDING',
        estimatedArrivalTime: '2026-08-10T12:00:00+07:00',
      }],
    });

    expect(result.nextTargetId).toBeUndefined();
    expect(result.featuredStops).toHaveLength(0);
    expect(result.upcomingStops.find((stop) => stop.id === stopA)?.plannedArrivalTime)
      .toBeNull();
    expect(result.upcomingStops.find((stop) => stop.id === stationId)?.plannedArrivalTime)
      .toBeNull();
  });
});
