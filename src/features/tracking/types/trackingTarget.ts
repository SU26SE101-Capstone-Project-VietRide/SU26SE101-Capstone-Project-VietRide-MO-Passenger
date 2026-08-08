import { isUuid } from '@shared/utils/pathSegment';

/**
 * Canonical passenger tracking target (BE v1.63+).
 * Discriminated on `kind` — never invent IDs from names/coords.
 */
export type TrackingTarget =
  | { kind: 'STOP'; stopId: string }
  | { kind: 'STATION'; stationId: string };

export const isTrackingTarget = (value: unknown): value is TrackingTarget => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.kind === 'STOP' && typeof record.stopId === 'string') {
    return isUuid(record.stopId);
  }
  if (record.kind === 'STATION' && typeof record.stationId === 'string') {
    return isUuid(record.stationId);
  }
  return false;
};

/** Stable key segment for React Query (kind + id only). */
export const trackingTargetCacheKey = (target: TrackingTarget): string => (
  target.kind === 'STOP'
    ? `STOP:${target.stopId}`
    : `STATION:${target.stationId}`
);

export const trackingTargetsEqual = (
  left: TrackingTarget | null | undefined,
  right: TrackingTarget | null | undefined,
): boolean => {
  if (!left || !right) return left === right;
  if (left.kind !== right.kind) return false;
  if (left.kind === 'STOP' && right.kind === 'STOP') {
    return left.stopId === right.stopId;
  }
  if (left.kind === 'STATION' && right.kind === 'STATION') {
    return left.stationId === right.stationId;
  }
  return false;
};

/** Prefer intermediate stop; else destination station. No name/geo inference. */
export const buildTrackingTargetFromPoints = (point?: {
  stopId?: string | null;
  stationId?: string | null;
} | null): TrackingTarget | undefined => {
  if (!point) return undefined;
  if (point.stopId && isUuid(point.stopId)) {
    return { kind: 'STOP', stopId: point.stopId };
  }
  if (point.stationId && isUuid(point.stationId)) {
    return { kind: 'STATION', stationId: point.stationId };
  }
  return undefined;
};

export const trackingTargetId = (target: TrackingTarget): string => (
  target.kind === 'STOP' ? target.stopId : target.stationId
);
