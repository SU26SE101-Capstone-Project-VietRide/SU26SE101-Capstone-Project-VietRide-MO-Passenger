import type { GeoCoordinate } from '@shared/types/common';
import { isValidGeoCoordinate } from '@shared/utils/geo';
import type { TrackingPoint } from '../api/trackingApi';

const MAX_NATIVE_TRAIL_POINTS = 300;
const MAX_NATIVE_ROUTE_POINTS = 1_000;
const MAX_INTERMEDIATE_MARKERS = 8;
const MAX_MARKER_NAME_LENGTH = 120;

export type TrackingMapMarkerKind =
  | 'origin'
  | 'intermediate'
  | 'next'
  | 'target'
  | 'destination'
  | 'shuttlePickup'
  | 'shuttleDropoff'
  | 'shuttleStation';

export interface TrackingMapMarker extends GeoCoordinate {
  id: string;
  name: string;
  kind: TrackingMapMarkerKind;
  sequence?: number;
}

/** @deprecated Prefer TrackingMapMarker so map semantics are explicit. */
export interface TrackingMapStop extends GeoCoordinate {
  id: string;
  name: string;
}

export interface TrackingMapInput {
  latest: TrackingPoint | null;
  trail: readonly TrackingPoint[];
  plannedRoute?: readonly GeoCoordinate[];
  markers?: readonly TrackingMapMarker[];
}

export interface PreparedTrackingMapData {
  latest: TrackingPoint | null;
  trail: TrackingPoint[];
  plannedRoute: GeoCoordinate[];
  markers: TrackingMapMarker[];
  /** @deprecated Compatibility aliases for existing callers/tests. */
  points: TrackingPoint[];
  /** @deprecated Compatibility aliases for existing callers/tests. */
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

const appendChronologicalPoint = (
  points: TrackingPoint[],
  seen: Set<string>,
  candidate: TrackingPoint | null,
): void => {
  const point = sanitizePoint(candidate);
  if (!point) return;

  const key = pointKey(point);
  if (seen.has(key)) return;

  const last = points[points.length - 1];
  if (last && Date.parse(point.recordedAt) <= Date.parse(last.recordedAt)) return;

  seen.add(key);
  points.push(point);
};

const prepareTrail = (
  latest: TrackingPoint | null,
  points: readonly TrackingPoint[],
): TrackingPoint[] => {
  const safePoints: TrackingPoint[] = [];
  const seen = new Set<string>();

  for (const point of points) appendChronologicalPoint(safePoints, seen, point);
  appendChronologicalPoint(safePoints, seen, latest);

  return safePoints.length > MAX_NATIVE_TRAIL_POINTS
    ? safePoints.slice(-MAX_NATIVE_TRAIL_POINTS)
    : safePoints;
};

const prepareRoute = (route: readonly GeoCoordinate[]): GeoCoordinate[] => {
  const safeRoute: GeoCoordinate[] = [];

  for (const point of route) {
    if (!isValidGeoCoordinate(point)) continue;

    const previous = safeRoute[safeRoute.length - 1];
    if (
      previous
      && previous.latitude === point.latitude
      && previous.longitude === point.longitude
    ) {
      continue;
    }

    safeRoute.push({ latitude: point.latitude, longitude: point.longitude });
    if (safeRoute.length >= MAX_NATIVE_ROUTE_POINTS) break;
  }

  return safeRoute;
};

const sanitizeMarker = (marker: TrackingMapMarker): TrackingMapMarker | null => {
  const id = marker.id.trim();
  const name = marker.name.trim().slice(0, MAX_MARKER_NAME_LENGTH);
  if (!id || !name || !isValidGeoCoordinate(marker)) return null;

  return {
    ...marker,
    id,
    name,
    ...(marker.sequence !== undefined && Number.isFinite(marker.sequence)
      ? { sequence: marker.sequence }
      : {}),
  };
};

const prepareMarkers = (
  markers: readonly TrackingMapMarker[],
): TrackingMapMarker[] => {
  const essentials: TrackingMapMarker[] = [];
  const intermediates: TrackingMapMarker[] = [];
  const seenIds = new Set<string>();

  const append = (marker: TrackingMapMarker): void => {
    const safeMarker = sanitizeMarker(marker);
    if (!safeMarker || seenIds.has(safeMarker.id)) return;
    seenIds.add(safeMarker.id);
    if (safeMarker.kind === 'intermediate') intermediates.push(safeMarker);
    else essentials.push(safeMarker);
  };

  // Essential markers win when a stop appears twice with different semantics.
  markers.filter((marker) => marker.kind !== 'intermediate').forEach(append);
  markers.filter((marker) => marker.kind === 'intermediate').forEach(append);

  return [...essentials, ...intermediates.slice(0, MAX_INTERMEDIATE_MARKERS)];
};

const legacyStopsToMarkers = (
  stops: readonly TrackingMapStop[],
): TrackingMapMarker[] => stops.map((stop) => ({
  ...stop,
  kind: 'intermediate',
}));

export function prepareTrackingMapData(
  input: TrackingMapInput,
): PreparedTrackingMapData;
/** @deprecated Positional overload retained while callers migrate to TrackingMapInput. */
export function prepareTrackingMapData(
  latest: TrackingPoint | null,
  points: readonly TrackingPoint[],
  stops?: readonly TrackingMapStop[],
): PreparedTrackingMapData;
/** Sanitizes untrusted API/socket data before it reaches react-native-maps. */
export function prepareTrackingMapData(
  inputOrLatest: TrackingMapInput | TrackingPoint | null,
  legacyPoints: readonly TrackingPoint[] = [],
  legacyStops: readonly TrackingMapStop[] = [],
): PreparedTrackingMapData {
  const input: TrackingMapInput = inputOrLatest && 'trail' in inputOrLatest
    ? inputOrLatest
    : {
        latest: inputOrLatest as TrackingPoint | null,
        trail: inputOrLatest
          ? [inputOrLatest as TrackingPoint, ...legacyPoints]
          : legacyPoints,
        markers: legacyStopsToMarkers(legacyStops),
      };
  const trail = prepareTrail(input.latest, input.trail);
  const safeLatest = sanitizePoint(input.latest);
  const trailLatest = trail[trail.length - 1] ?? null;
  const latest = safeLatest && (
    !trailLatest
    || Date.parse(safeLatest.recordedAt) >= Date.parse(trailLatest.recordedAt)
  )
    ? safeLatest
    : trailLatest;
  const markers = prepareMarkers(input.markers ?? []);

  return {
    latest,
    trail,
    plannedRoute: prepareRoute(input.plannedRoute ?? []),
    markers,
    points: trail,
    stops: markers.map(({ kind: _kind, sequence: _sequence, ...marker }) => marker),
  };
}
