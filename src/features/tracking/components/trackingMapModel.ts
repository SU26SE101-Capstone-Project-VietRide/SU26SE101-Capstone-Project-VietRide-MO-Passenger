import type { GeoCoordinate } from '@shared/types/common';
import { isValidGeoCoordinate } from '@shared/utils/geo';
import type { TrackingPoint } from '../api/trackingApi';

const MAX_NATIVE_TRAIL_POINTS = 500;
const MAX_NATIVE_STOP_MARKERS = 100;
const MAX_STOP_NAME_LENGTH = 120;

export interface TrackingMapStop extends GeoCoordinate {
  id: string;
  name: string;
}

export interface PreparedTrackingMapData {
  latest: TrackingPoint | null;
  points: TrackingPoint[];
  stops: TrackingMapStop[];
}

const normalizeHeading = (heading: number | undefined): number | undefined => {
  if (heading == null || !Number.isFinite(heading)) return undefined;
  return ((heading % 360) + 360) % 360;
};

const sanitizePoint = (point: TrackingPoint | null): TrackingPoint | null => {
  if (
    !point
    || !isValidGeoCoordinate(point)
    || !Number.isFinite(Date.parse(point.recordedAt))
  ) {
    return null;
  }

  const speedKmh = point.speedKmh != null
    && Number.isFinite(point.speedKmh)
    && point.speedKmh >= 0
    ? point.speedKmh
    : undefined;

  return {
    ...point,
    speedKmh,
    headingDeg: normalizeHeading(point.headingDeg),
  };
};

const pointKey = (point: TrackingPoint): string => (
  `${point.recordedAt}:${point.latitude}:${point.longitude}`
);

const compareRecordedAt = (left: TrackingPoint, right: TrackingPoint): number => (
  Date.parse(left.recordedAt) - Date.parse(right.recordedAt)
);

const prepareTrail = (
  latest: TrackingPoint | null,
  points: readonly TrackingPoint[],
): TrackingPoint[] => {
  const uniquePoints = new Map<string, TrackingPoint>();

  for (const rawPoint of points) {
    const point = sanitizePoint(rawPoint);
    if (point) uniquePoints.set(pointKey(point), point);
  }

  if (latest) uniquePoints.set(pointKey(latest), latest);

  return [...uniquePoints.values()]
    .sort(compareRecordedAt)
    .slice(-MAX_NATIVE_TRAIL_POINTS);
};

const prepareStops = (stops: readonly TrackingMapStop[]): TrackingMapStop[] => {
  const uniqueStops = new Map<string, TrackingMapStop>();

  for (const stop of stops) {
    const id = stop.id.trim();
    const name = stop.name.trim().slice(0, MAX_STOP_NAME_LENGTH);
    if (!id || !name || !isValidGeoCoordinate(stop)) continue;

    uniqueStops.set(id, { ...stop, id, name });
    if (uniqueStops.size >= MAX_NATIVE_STOP_MARKERS) break;
  }

  return [...uniqueStops.values()];
};

/** Sanitizes untrusted API/socket data before it reaches react-native-maps. */
export const prepareTrackingMapData = (
  latest: TrackingPoint | null,
  points: readonly TrackingPoint[],
  stops: readonly TrackingMapStop[] = [],
): PreparedTrackingMapData => {
  const safeLatest = sanitizePoint(latest);
  const safePoints = prepareTrail(safeLatest, points);
  const trailLatest = safePoints[safePoints.length - 1] ?? null;

  return {
    latest: trailLatest,
    points: safePoints,
    stops: prepareStops(stops),
  };
};
