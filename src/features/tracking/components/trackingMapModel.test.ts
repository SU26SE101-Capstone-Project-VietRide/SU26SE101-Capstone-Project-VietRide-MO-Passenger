import type { TrackingPoint } from '../api/trackingApi';
import {
  deriveTrailHeading,
  matchVehicleHeadingToRoute,
  prepareRouteHeadingPath,
  prepareTrackingMapData,
} from './trackingMapModel';

const point = (
  recordedAt: string,
  overrides: Partial<TrackingPoint> = {},
): TrackingPoint => ({
  tripId: 'trip-1',
  latitude: 10.7769,
  longitude: 106.7009,
  recordedAt,
  ...overrides,
});

describe('prepareTrackingMapData', () => {
  it('selects the newest valid point rather than a stale latest response', () => {
    const staleLatest = point('2026-07-20T01:00:00.000Z');
    const newerTrailPoint = point('2026-07-20T01:01:00.000Z', {
      latitude: 10.78,
    });

    const result = prepareTrackingMapData(staleLatest, [newerTrailPoint]);

    expect(result.latest).toEqual(newerTrailPoint);
    expect(result.points).toHaveLength(2);
  });

  it('uses the newest trail point as the current position when latest is empty', () => {
    const olderTrailPoint = point('2026-07-20T01:00:00.000Z');
    const currentTrailPoint = point('2026-07-20T01:01:00.000Z', {
      latitude: 10.78,
      longitude: 106.71,
    });

    const result = prepareTrackingMapData({
      latest: null,
      trail: [olderTrailPoint, currentTrailPoint],
    });

    expect(result.latest).toEqual(currentTrailPoint);
  });

  it('rejects unsafe coordinates and telemetry before native rendering', () => {
    const invalid = point('not-a-date', { latitude: 1000 });
    const valid = point('2026-07-20T01:01:00.000Z', {
      headingDeg: 725,
      speedKmh: -10,
    });

    const result = prepareTrackingMapData(invalid, [invalid, valid]);

    expect(result.latest).toMatchObject({
      headingDeg: 5,
      speedKmh: undefined,
    });
    expect(result.points).toHaveLength(1);
  });

  it('filters invalid and duplicate stop markers', () => {
    const result = prepareTrackingMapData(
      point('2026-07-20T01:01:00.000Z'),
      [],
      [
        { id: ' stop-1 ', name: ' Terminal ', latitude: 10, longitude: 106 },
        { id: 'stop-1', name: 'Updated', latitude: 11, longitude: 107 },
        { id: 'stop-2', name: 'Invalid', latitude: Number.NaN, longitude: 107 },
      ],
    );

    expect(result.stops).toEqual([
      { id: 'stop-1', name: 'Updated', latitude: 11, longitude: 107 },
    ]);
  });

  it('retains every valid route stop without applying a marker cap', () => {
    const markers = Array.from({ length: 50 }, (_, index) => ({
      id: `stop-${index + 1}`,
      name: `Stop ${index + 1}`,
      latitude: 10 + index * 0.001,
      longitude: 106 + index * 0.001,
      kind: 'intermediate' as const,
      sequence: index + 1,
    }));

    const result = prepareTrackingMapData({
      latest: null,
      trail: [],
      markers,
    });

    expect(result.markers).toHaveLength(50);
    expect(result.markers.map(marker => marker.id)).toEqual(
      markers.map(marker => marker.id),
    );
    expect(result).not.toHaveProperty('hiddenIntermediateCount');
  });

  it('merges a shared next and target stop into one targetNext marker', () => {
    const sharedStop = {
      id: 'shared-stop',
      name: 'Shared stop',
      latitude: 10.77,
      longitude: 106.7,
      sequence: 7,
    };

    const result = prepareTrackingMapData({
      latest: null,
      trail: [],
      markers: [
        { ...sharedStop, kind: 'intermediate' },
        { ...sharedStop, kind: 'next' },
        { ...sharedStop, kind: 'target' },
        { ...sharedStop, kind: 'intermediate' },
      ],
    });

    expect(result.markers).toEqual([
      expect.objectContaining({
        id: 'shared-stop',
        kind: 'targetNext',
        sequence: 7,
      }),
    ]);
  });
});

describe('route-aware vehicle heading', () => {
  const route = [
    { latitude: 10, longitude: 106 },
    { latitude: 10, longitude: 106.002 },
    { latitude: 10.01, longitude: 106.002 },
  ];

  it('follows the road segment ahead instead of pointing straight at destination', () => {
    const path = prepareRouteHeadingPath(route);
    const match = matchVehicleHeadingToRoute(path, {
      latitude: 10,
      longitude: 106.0005,
    });

    expect(match).not.toBeNull();
    expect(match!.segmentIndex).toBe(0);
    expect(match!.headingDeg).toBeCloseTo(90, 0);
    expect(match!.distanceFromRouteMeters).toBeLessThan(1);
  });

  it('looks through the next segment near a turn', () => {
    const path = prepareRouteHeadingPath(route);
    const match = matchVehicleHeadingToRoute(path, {
      latitude: 10,
      longitude: 106.0019,
    });

    expect(match).not.toBeNull();
    expect(match!.headingDeg).toBeGreaterThan(0);
    expect(match!.headingDeg).toBeLessThan(45);
  });

  it('does not force route bearing when the vehicle is off-route', () => {
    const path = prepareRouteHeadingPath(route);
    const match = matchVehicleHeadingToRoute(path, {
      latitude: 10.005,
      longitude: 106,
    });

    expect(match).toBeNull();
  });

  it('derives a stable fallback only after meaningful GPS movement', () => {
    expect(
      deriveTrailHeading([
        { latitude: 10, longitude: 106 },
        { latitude: 10.001, longitude: 106 },
      ]),
    ).toBeCloseTo(0, 0);
    expect(
      deriveTrailHeading([
        { latitude: 10, longitude: 106 },
        { latitude: 10.00001, longitude: 106 },
      ]),
    ).toBeUndefined();
  });
});
