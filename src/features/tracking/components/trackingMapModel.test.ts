import type { TrackingPoint } from '../api/trackingApi';
import { prepareTrackingMapData } from './trackingMapModel';

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
});
