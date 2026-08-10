import type { TripStop } from '@features/trip/types';
import { isValidGeoCoordinate } from '@shared/utils/geo';
import type {
  TrackingEta,
  TrackingTarget,
  TripRouteContext,
} from '../api/trackingApi';
import type {
  TrackingMapMarker,
  TrackingMapMarkerKind,
} from './trackingMapModel';

type PlannedStop = Pick<
  TripStop,
  'estimatedArrivalTime' | 'id' | 'orderIndex' | 'status'
>;

export interface TripRouteStopPresentation {
  eta: TrackingEta | null;
  id: string;
  isNext: boolean;
  isTarget: boolean;
  key: string;
  name: string;
  plannedArrivalTime: string | null;
  sequence: number;
  targetKind: 'STATION' | 'STOP';
}

export interface TripRoutePresentation {
  featuredStops: TripRouteStopPresentation[];
  hasEtaRouteMismatch: boolean;
  markers: TrackingMapMarker[];
  nextTargetId?: string;
  targetId?: string;
  upcomingStops: TripRouteStopPresentation[];
}

export interface BuildTripRoutePresentationInput {
  allowPlannedFallback?: boolean;
  context: TripRouteContext | null;
  destinationPlannedArrivalTime?: string | null;
  destinationPlannedStationId?: string | null;
  /**
   * When route-geometry stations omit coordinates, use trip-detail names/ids
   * plus geometry endpoints so origin/destination pins still render.
   */
  originPlannedStationId?: string | null;
  originStationName?: string | null;
  destinationStationName?: string | null;
  etas: readonly TrackingEta[];
  plannedStops: readonly PlannedStop[];
  target?: TrackingTarget;
}

/**
 * Map pin roles for non-shuttle tracking (4 colors):
 * origin | destination | intermediate | passenger target.
 * Operational "next stop" is sheet/ETA chrome only — it must not steal a
 * fifth map color or replace destination/target colors.
 */
const markerKindForStop = (
  isNext: boolean,
  isTarget: boolean,
): TrackingMapMarkerKind => {
  if (isTarget && isNext) return 'targetNext';
  if (isTarget) return 'target';
  return 'intermediate';
};

const markerKindForDestination = (
  isNext: boolean,
  isTarget: boolean,
): TrackingMapMarkerKind => {
  // Passenger alights at the terminal station → same color as "điểm dừng".
  if (isTarget && isNext) return 'targetNext';
  if (isTarget) return 'target';
  return 'destination';
};

const isPlannedStopUpcoming = (stop: PlannedStop): boolean => (
  stop.status === undefined || stop.status === 'PENDING'
);

/**
 * Builds one ID-based presentation model for both the native map and the
 * Upcoming Stops sheet. ETA values outside the effective route context are
 * intentionally ignored; Mobile must never reconcile routes by name or geo.
 */
export const buildTripRoutePresentation = ({
  context,
  allowPlannedFallback = true,
  destinationPlannedArrivalTime,
  destinationPlannedStationId,
  originPlannedStationId,
  originStationName,
  destinationStationName,
  etas,
  plannedStops,
  target,
}: BuildTripRoutePresentationInput): TripRoutePresentation => {
  if (!context) {
    return {
      featuredStops: [],
      hasEtaRouteMismatch: etas.length > 0,
      markers: [],
      upcomingStops: [],
    };
  }

  const seenRouteStopIds = new Set<string>();
  const orderedRouteStops = [...context.intermediateStops]
    .sort((left, right) => left.sequence - right.sequence)
    .filter((stop) => {
      if (
        !stop.stopId
        || !stop.name.trim()
        || seenRouteStopIds.has(stop.stopId)
        || !isValidGeoCoordinate(stop)
      ) {
        return false;
      }
      seenRouteStopIds.add(stop.stopId);
      return true;
    });
  const geometryPoints = context.geometry?.points ?? [];
  const geometryStart = geometryPoints[0];
  const geometryEnd = geometryPoints.length >= 2
    ? geometryPoints[geometryPoints.length - 1]
    : undefined;

  // Primary: station POIs from route-geometry (authoritative when coords valid).
  // Fallback: polyline endpoints — same BE payload, no invented route.
  const originStation = context.originStation
    && context.originStation.stationId
    && context.originStation.name.trim()
    && isValidGeoCoordinate(context.originStation)
    ? context.originStation
    : geometryStart && isValidGeoCoordinate(geometryStart)
      ? {
          stationId: originPlannedStationId?.trim() || 'geometry-origin',
          name: (originStationName?.trim()
            || context.originStation?.name.trim()
            || 'Origin'),
          latitude: geometryStart.latitude,
          longitude: geometryStart.longitude,
        }
      : null;

  const destinationStation = context.destinationStation
    && context.destinationStation.stationId
    && context.destinationStation.name.trim()
    && isValidGeoCoordinate(context.destinationStation)
    ? context.destinationStation
    : geometryEnd && isValidGeoCoordinate(geometryEnd)
      ? {
          stationId: destinationPlannedStationId?.trim() || 'geometry-destination',
          name: (destinationStationName?.trim()
            || context.destinationStation?.name.trim()
            || 'Destination'),
          latitude: geometryEnd.latitude,
          longitude: geometryEnd.longitude,
        }
      : null;
  const plannedStopsById = new Map(plannedStops.map((stop) => [stop.id, stop]));
  const routeStopIds = new Set(orderedRouteStops.map((stop) => stop.stopId));
  // Prefer live POI id; fall back to trip-detail destination id for STATION targets.
  const destinationStationId = destinationStation?.stationId
    ?? destinationPlannedStationId
    ?? undefined;
  const etaByStopId = new Map<string, TrackingEta>();
  let destinationEta: TrackingEta | null = null;
  let hasEtaRouteMismatch = false;

  for (const eta of etas) {
    if (eta.targetKind === 'STOP' && eta.stopId) {
      if (routeStopIds.has(eta.stopId)) etaByStopId.set(eta.stopId, eta);
      else hasEtaRouteMismatch = true;
      continue;
    }

    if (eta.targetKind === 'STATION' && eta.stationId) {
      if (eta.stationId === destinationStationId) destinationEta = eta;
      else hasEtaRouteMismatch = true;
    }
  }

  // The batch schema does not promise wire order. Route sequence is the only
  // authoritative ordering for STOP targets; destination follows all stops.
  const firstLiveStopId = orderedRouteStops.find(
    (stop) => etaByStopId.has(stop.stopId),
  )?.stopId;
  const firstPlannedStopId = allowPlannedFallback
    ? orderedRouteStops.find((stop) => {
        const plannedStop = plannedStopsById.get(stop.stopId);
        return plannedStop ? isPlannedStopUpcoming(plannedStop) : false;
      })?.stopId
    : undefined;
  const allRouteStopsKnownComplete = allowPlannedFallback
    && orderedRouteStops.every((stop) => {
      const plannedStop = plannedStopsById.get(stop.stopId);
      return Boolean(plannedStop && !isPlannedStopUpcoming(plannedStop));
    });
  const liveNextTargetId = firstLiveStopId
    ?? (destinationEta ? destinationStationId : undefined);
  const nextTargetId = liveNextTargetId
    ?? firstPlannedStopId
    ?? (allRouteStopsKnownComplete
      && destinationPlannedStationId === destinationStationId
      ? destinationStationId
      : undefined);
  const targetId = target?.kind === 'STOP'
    ? (routeStopIds.has(target.stopId) ? target.stopId : undefined)
    : target?.kind === 'STATION' && target.stationId === destinationStationId
      ? target.stationId
      : undefined;

  const stopPresentations: TripRouteStopPresentation[] = orderedRouteStops.map((stop) => {
    const plannedStop = plannedStopsById.get(stop.stopId);
    return {
      eta: etaByStopId.get(stop.stopId) ?? null,
      id: stop.stopId,
      isNext: stop.stopId === nextTargetId,
      isTarget: stop.stopId === targetId,
      key: `stop:${stop.stopId}`,
      name: stop.name,
      plannedArrivalTime: allowPlannedFallback
        ? (plannedStop?.estimatedArrivalTime ?? null)
        : null,
      sequence: stop.sequence,
      targetKind: 'STOP',
    };
  });

  const destinationPresentation: TripRouteStopPresentation | null = destinationStation
    ? {
        eta: destinationEta,
        id: destinationStation.stationId,
        isNext: destinationStation.stationId === nextTargetId,
        isTarget: destinationStation.stationId === targetId,
        key: `station:${destinationStation.stationId}`,
        name: destinationStation.name,
        plannedArrivalTime: allowPlannedFallback
          && destinationPlannedStationId === destinationStation.stationId
            ? (destinationPlannedArrivalTime ?? null)
            : null,
        sequence: Number.MAX_SAFE_INTEGER,
        targetKind: 'STATION',
      }
    : null;
  const upcomingStops = destinationPresentation
    ? [...stopPresentations, destinationPresentation]
    : stopPresentations;

  const nextStop = upcomingStops.find((stop) => stop.isNext);
  const targetStop = upcomingStops.find((stop) => stop.isTarget);
  const featuredStops = [
    ...(nextStop ? [nextStop] : []),
    ...(targetStop && targetStop.id !== nextStop?.id ? [targetStop] : []),
  ];

  const markers: TrackingMapMarker[] = [];
  if (originStation) {
    markers.push({
      id: `origin:${originStation.stationId}`,
      kind: 'origin',
      latitude: originStation.latitude,
      longitude: originStation.longitude,
      name: originStation.name,
    });
  }
  for (const stop of orderedRouteStops) {
    const isNext = stop.stopId === nextTargetId;
    const isTarget = stop.stopId === targetId;
    markers.push({
      id: `stop:${stop.stopId}`,
      kind: markerKindForStop(isNext, isTarget),
      latitude: stop.latitude,
      longitude: stop.longitude,
      name: stop.name,
      sequence: stop.sequence,
    });
  }
  if (destinationStation) {
    const isNext = destinationStation.stationId === nextTargetId;
    const isTarget = destinationStation.stationId === targetId
      || (
        target?.kind === 'STATION'
        && destinationPlannedStationId != null
        && target.stationId === destinationPlannedStationId
      );
    markers.push({
      id: `destination:${destinationStation.stationId}`,
      kind: markerKindForDestination(isNext, isTarget),
      latitude: destinationStation.latitude,
      longitude: destinationStation.longitude,
      name: destinationStation.name,
    });
  }

  return {
    featuredStops,
    hasEtaRouteMismatch,
    markers,
    ...(nextTargetId ? { nextTargetId } : {}),
    ...(targetId ? { targetId } : {}),
    upcomingStops,
  };
};
