import type { GeoCoordinate } from '@shared/types/common';
import { getGeoDistanceKm, isValidGeoCoordinate } from '@shared/utils/geo';
import type { TrackingPoint } from '../api/trackingApi';

const MAX_NATIVE_TRAIL_POINTS = 300;
const MAX_NATIVE_ROUTE_POINTS = 1_000;
const MAX_MARKER_NAME_LENGTH = 120;
const EARTH_RADIUS_METERS = 6_371_000;
const ROUTE_HEADING_LOOKAHEAD_METERS = 45;
const MAX_ROUTE_MATCH_DISTANCE_METERS = 120;
const MIN_TRAIL_HEADING_DISTANCE_METERS = 5;

export type TrackingMapMarkerKind =
  | 'origin'
  | 'intermediate'
  | 'next'
  | 'target'
  | 'targetNext'
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

interface RouteHeadingSegment {
  start: GeoCoordinate;
  end: GeoCoordinate;
  lengthMeters: number;
}

export interface PreparedRouteHeadingPath {
  segments: readonly RouteHeadingSegment[];
}

export interface RouteHeadingMatch {
  headingDeg: number;
  segmentIndex: number;
  distanceFromRouteMeters: number;
}

const normalizeHeading = (heading: number | undefined): number | undefined => {
  if (heading == null || !Number.isFinite(heading)) return undefined;
  return ((heading % 360) + 360) % 360;
};

const sanitizePoint = (point: TrackingPoint | null): TrackingPoint | null => {
  if (
    !point ||
    !isValidGeoCoordinate(point) ||
    !Number.isFinite(Date.parse(point.recordedAt))
  ) {
    return null;
  }

  const speedKmh =
    point.speedKmh != null &&
    Number.isFinite(point.speedKmh) &&
    point.speedKmh >= 0
      ? point.speedKmh
      : undefined;

  return {
    ...point,
    speedKmh,
    headingDeg: normalizeHeading(point.headingDeg),
  };
};

const pointKey = (point: TrackingPoint): string =>
  `${point.recordedAt}:${point.latitude}:${point.longitude}`;

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
  if (last && Date.parse(point.recordedAt) <= Date.parse(last.recordedAt))
    return;

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
      previous &&
      previous.latitude === point.latitude &&
      previous.longitude === point.longitude
    ) {
      continue;
    }

    safeRoute.push({ latitude: point.latitude, longitude: point.longitude });
    if (safeRoute.length >= MAX_NATIVE_ROUTE_POINTS) break;
  }

  return safeRoute;
};

const toRadians = (degrees: number): number => degrees * (Math.PI / 180);
const toDegrees = (radians: number): number => radians * (180 / Math.PI);
const normalizeBearingDegrees = (heading: number): number =>
  ((heading % 360) + 360) % 360;

const bearingBetween = (
  from: GeoCoordinate,
  to: GeoCoordinate,
): number | undefined => {
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const y = Math.sin(longitudeDelta) * Math.cos(toLatitude);
  const x =
    Math.cos(fromLatitude) * Math.sin(toLatitude) -
    Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(longitudeDelta);

  if (Math.abs(x) < Number.EPSILON && Math.abs(y) < Number.EPSILON) {
    return undefined;
  }

  return normalizeBearingDegrees(toDegrees(Math.atan2(y, x)));
};

const interpolateCoordinate = (
  start: GeoCoordinate,
  end: GeoCoordinate,
  ratio: number,
): GeoCoordinate => ({
  latitude: start.latitude + (end.latitude - start.latitude) * ratio,
  longitude: start.longitude + (end.longitude - start.longitude) * ratio,
});

const projectOntoSegment = (
  point: GeoCoordinate,
  segment: RouteHeadingSegment,
): { coordinate: GeoCoordinate; distanceMeters: number; ratio: number } => {
  const referenceLatitude = toRadians(
    (point.latitude + segment.start.latitude + segment.end.latitude) / 3,
  );
  const longitudeScale = Math.max(0.01, Math.cos(referenceLatitude));
  const startX =
    toRadians(segment.start.longitude - point.longitude) *
    EARTH_RADIUS_METERS *
    longitudeScale;
  const startY =
    toRadians(segment.start.latitude - point.latitude) * EARTH_RADIUS_METERS;
  const endX =
    toRadians(segment.end.longitude - point.longitude) *
    EARTH_RADIUS_METERS *
    longitudeScale;
  const endY =
    toRadians(segment.end.latitude - point.latitude) * EARTH_RADIUS_METERS;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const squaredLength = deltaX * deltaX + deltaY * deltaY;
  const ratio =
    squaredLength > 0
      ? Math.max(
          0,
          Math.min(1, -(startX * deltaX + startY * deltaY) / squaredLength),
        )
      : 0;
  const projectedX = startX + deltaX * ratio;
  const projectedY = startY + deltaY * ratio;

  return {
    coordinate: interpolateCoordinate(segment.start, segment.end, ratio),
    distanceMeters: Math.hypot(projectedX, projectedY),
    ratio,
  };
};

const findLookAheadCoordinate = (
  path: PreparedRouteHeadingPath,
  segmentIndex: number,
  ratio: number,
): GeoCoordinate => {
  const currentSegment = path.segments[segmentIndex]!;
  let remainingMeters = ROUTE_HEADING_LOOKAHEAD_METERS;
  const currentSegmentRemaining = currentSegment.lengthMeters * (1 - ratio);

  if (currentSegmentRemaining >= remainingMeters) {
    return interpolateCoordinate(
      currentSegment.start,
      currentSegment.end,
      ratio + remainingMeters / currentSegment.lengthMeters,
    );
  }

  remainingMeters -= currentSegmentRemaining;
  for (let index = segmentIndex + 1; index < path.segments.length; index += 1) {
    const segment = path.segments[index]!;
    if (segment.lengthMeters >= remainingMeters) {
      return interpolateCoordinate(
        segment.start,
        segment.end,
        remainingMeters / segment.lengthMeters,
      );
    }
    remainingMeters -= segment.lengthMeters;
  }

  return path.segments[path.segments.length - 1]!.end;
};

/**
 * Precomputes immutable route segments once per route-context update. GPS ticks
 * then only scan lightweight segment data and never trigger routing/network IO.
 */
export const prepareRouteHeadingPath = (
  route: readonly GeoCoordinate[],
): PreparedRouteHeadingPath => {
  const points = prepareRoute(route);
  const segments: RouteHeadingSegment[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]!;
    const end = points[index + 1]!;
    const lengthKm = getGeoDistanceKm(start, end);
    if (lengthKm == null || lengthKm <= 0) continue;
    segments.push({ start, end, lengthMeters: lengthKm * 1_000 });
  }

  return { segments };
};

/**
 * Matches the vehicle to the ordered route and points it toward a short
 * look-ahead position. Restricting the search to forward progress avoids
 * choosing the wrong branch where a route crosses itself.
 */
export const matchVehicleHeadingToRoute = (
  path: PreparedRouteHeadingPath,
  position: GeoCoordinate,
  previousSegmentIndex?: number,
): RouteHeadingMatch | null => {
  if (!isValidGeoCoordinate(position) || path.segments.length === 0)
    return null;

  const firstCandidateIndex =
    previousSegmentIndex !== undefined && Number.isFinite(previousSegmentIndex)
      ? Math.max(
          0,
          Math.min(path.segments.length - 1, Math.trunc(previousSegmentIndex)) -
            2,
        )
      : 0;
  let nearest:
    | {
        coordinate: GeoCoordinate;
        distanceMeters: number;
        ratio: number;
        segmentIndex: number;
      }
    | undefined;

  for (
    let segmentIndex = firstCandidateIndex;
    segmentIndex < path.segments.length;
    segmentIndex += 1
  ) {
    const projection = projectOntoSegment(
      position,
      path.segments[segmentIndex]!,
    );
    if (!nearest || projection.distanceMeters < nearest.distanceMeters) {
      nearest = { ...projection, segmentIndex };
    }
  }

  if (!nearest || nearest.distanceMeters > MAX_ROUTE_MATCH_DISTANCE_METERS) {
    return null;
  }

  const lookAhead = findLookAheadCoordinate(
    path,
    nearest.segmentIndex,
    nearest.ratio,
  );
  const currentSegment = path.segments[nearest.segmentIndex]!;
  const headingDeg =
    bearingBetween(nearest.coordinate, lookAhead) ??
    bearingBetween(currentSegment.start, currentSegment.end);

  return headingDeg === undefined
    ? null
    : {
        headingDeg,
        segmentIndex: nearest.segmentIndex,
        distanceFromRouteMeters: nearest.distanceMeters,
      };
};

/** Uses actual movement only when GPS points are far enough apart to be stable. */
export const deriveTrailHeading = (
  points: readonly Pick<TrackingPoint, 'latitude' | 'longitude'>[],
): number | undefined => {
  const latest = points[points.length - 1];
  if (!latest || !isValidGeoCoordinate(latest)) return undefined;

  for (let index = points.length - 2; index >= 0; index -= 1) {
    const previous = points[index]!;
    const distanceKm = getGeoDistanceKm(previous, latest);
    if (
      distanceKm != null &&
      distanceKm * 1_000 >= MIN_TRAIL_HEADING_DISTANCE_METERS
    ) {
      return bearingBetween(previous, latest);
    }
  }

  return undefined;
};

const sanitizeMarker = (
  marker: TrackingMapMarker,
): TrackingMapMarker | null => {
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

const combinesTargetAndNext = (
  left: TrackingMapMarkerKind,
  right: TrackingMapMarkerKind,
): boolean =>
  (left === 'next' && right === 'target') ||
  (left === 'target' && right === 'next') ||
  (left === 'targetNext' && (right === 'next' || right === 'target')) ||
  (right === 'targetNext' && (left === 'next' || left === 'target'));

const prepareMarkers = (
  markers: readonly TrackingMapMarker[],
): TrackingMapMarker[] => {
  const preparedById = new Map<string, TrackingMapMarker>();

  for (const marker of markers) {
    const safeMarker = sanitizeMarker(marker);
    if (!safeMarker) continue;

    const existing = preparedById.get(safeMarker.id);
    if (!existing) {
      preparedById.set(safeMarker.id, safeMarker);
      continue;
    }

    if (combinesTargetAndNext(existing.kind, safeMarker.kind)) {
      preparedById.set(safeMarker.id, {
        ...safeMarker,
        kind: 'targetNext',
        sequence: safeMarker.sequence ?? existing.sequence,
      });
      continue;
    }

    // A semantic marker always wins over its duplicate ordinary stop. For
    // duplicates with equal semantic weight, keep the latest valid payload.
    if (
      safeMarker.kind !== 'intermediate' ||
      existing.kind === 'intermediate'
    ) {
      preparedById.set(safeMarker.id, safeMarker);
    }
  }

  return [...preparedById.values()];
};

const legacyStopsToMarkers = (
  stops: readonly TrackingMapStop[],
): TrackingMapMarker[] =>
  stops.map(stop => ({
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
/** Sanitizes untrusted API/socket data before it reaches the map renderer. */
export function prepareTrackingMapData(
  inputOrLatest: TrackingMapInput | TrackingPoint | null,
  legacyPoints: readonly TrackingPoint[] = [],
  legacyStops: readonly TrackingMapStop[] = [],
): PreparedTrackingMapData {
  const input: TrackingMapInput =
    inputOrLatest && 'trail' in inputOrLatest
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
  const latest =
    safeLatest &&
    (!trailLatest ||
      Date.parse(safeLatest.recordedAt) >= Date.parse(trailLatest.recordedAt))
      ? safeLatest
      : trailLatest;
  const preparedMarkers = prepareMarkers(input.markers ?? []);

  return {
    latest,
    trail,
    plannedRoute: prepareRoute(input.plannedRoute ?? []),
    markers: preparedMarkers,
    points: trail,
    stops: preparedMarkers.map(
      ({ kind: _kind, sequence: _sequence, ...marker }) => marker,
    ),
  };
}
