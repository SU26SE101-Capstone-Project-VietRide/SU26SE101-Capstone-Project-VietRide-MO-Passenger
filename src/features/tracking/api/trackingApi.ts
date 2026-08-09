import { apiClient } from '@shared/api/axiosInstance';
import {
  ApiRequestError,
  unwrapApiResponse,
  type ApiEnvelope,
} from '@shared/api/errors';
import { isValidGeoCoordinate } from '@shared/utils/geo';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import { z } from 'zod';

import type { TrackingTarget } from '../types/trackingTarget';
import { trackingTargetCacheKey } from '../types/trackingTarget';

export const trackingDateTimeSchema = z.string().datetime();
export const trackingEtaQualitySchema = z.enum(['TRAFFIC_AWARE', 'FALLBACK']);

const trackingPointShape = {
  tripId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  speedKmh: z.number().finite().nonnegative().optional(),
  headingDeg: z.number().finite().min(0).max(360).optional(),
  recordedAt: trackingDateTimeSchema,
} as const;

const trackingPointSchema = z.object(trackingPointShape).strict()
  .refine(isValidGeoCoordinate, 'Invalid GPS coordinate.');

const trackingTrailPointSchema = z.object({
  ...trackingPointShape,
  id: z.string().uuid(),
}).strict().refine(isValidGeoCoordinate, 'Invalid GPS coordinate.');

/**
 * REST ETA (BE v1.63+): discriminated target STOP|STATION.
 * Rolling compat:
 * - missing targetKind + stopId only → STOP
 * - inactive id may arrive as null (strip before XOR), not only omitted
 * Socket payloads re-use a STOP-normalized variant in trackingRealtime.
 */
export const trackingEtaSchema = z.object({
  tripId: z.string().uuid(),
  targetKind: z.enum(['STOP', 'STATION']).optional(),
  // nullish: BE/Redis may emit inactive side as null rather than omitting.
  stopId: z.string().uuid().nullish(),
  stationId: z.string().uuid().nullish(),
  sequence: z.number().int().positive().optional(),
  stopName: z.string().nullable().optional(),
  etaMinutes: z.number().int().positive(),
  estimatedArrivalTime: trackingDateTimeSchema,
  distanceMeters: z.number().int().nonnegative(),
  updatedAt: trackingDateTimeSchema,
  delayed: z.boolean().nullable().optional().default(null),
  delayStatus: z.enum(['DELAYED', 'ON_TIME', 'UNKNOWN']).optional().default('UNKNOWN'),
  delayMinutes: z.number().int().nonnegative().nullable().optional().default(null),
  estimateQuality: trackingEtaQualitySchema,
}).strict().superRefine((value, ctx) => {
  const stopId = value.stopId ?? null;
  const stationId = value.stationId ?? null;
  const inferredKind = value.targetKind
    ?? (stopId && !stationId
      ? 'STOP' as const
      : stationId && !stopId
        ? 'STATION' as const
        : undefined);

  if (!inferredKind) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetKind'],
      message: 'ETA must declare targetKind STOP|STATION with a matching id.',
    });
    return;
  }

  if (inferredKind === 'STOP') {
    if (!stopId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stopId'],
        message: 'STOP ETA requires stopId.',
      });
    }
    if (stationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stationId'],
        message: 'STOP ETA must not include stationId.',
      });
    }
    return;
  }

  if (!stationId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stationId'],
      message: 'STATION ETA requires stationId.',
    });
  }
  if (stopId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stopId'],
      message: 'STATION ETA must not include stopId.',
    });
  }
}).transform((value) => {
  const stopId = value.stopId ?? undefined;
  const stationId = value.stationId ?? undefined;
  const targetKind = value.targetKind
    ?? (stopId ? 'STOP' as const : 'STATION' as const);
  return {
    tripId: value.tripId,
    targetKind,
    ...(stopId ? { stopId } : {}),
    ...(stationId ? { stationId } : {}),
    ...(value.sequence !== undefined ? { sequence: value.sequence } : {}),
    stopName: value.stopName,
    etaMinutes: value.etaMinutes,
    estimatedArrivalTime: value.estimatedArrivalTime,
    distanceMeters: value.distanceMeters,
    updatedAt: value.updatedAt,
    delayed: value.delayed ?? null,
    delayStatus: value.delayStatus ?? 'UNKNOWN',
    delayMinutes: value.delayMinutes ?? null,
    estimateQuality: value.estimateQuality,
  };
});

const trackingLatestResponseSchema = z.object({
  latest: trackingPointSchema.nullable(),
}).strict();

const trackingTrailResponseSchema = z.object({
  items: z.array(trackingTrailPointSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
}).strict();

const trackingEtaResponseSchema = z.object({
  eta: trackingEtaSchema.nullable(),
}).strict();

export const trackingEtaBatchResponseSchema = z.object({
  etas: z.array(trackingEtaSchema),
}).strict().superRefine((value, ctx) => {
  value.etas.forEach((eta, index) => {
    if (eta.targetKind === 'STOP' && eta.sequence === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['etas', index, 'sequence'],
        message: 'Batch STOP ETA requires sequence.',
      });
    }
  });
});

const trackingGeoCoordinateShape = {
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
} as const;

const trackingRoutePointSchema = z.object(trackingGeoCoordinateShape).strict();

const trackingRouteStationSchema = z.object({
  stationId: z.string().uuid(),
  name: z.string(),
  ...trackingGeoCoordinateShape,
}).strict();

const trackingRouteIntermediateStopSchema = z.object({
  stopId: z.string().uuid(),
  name: z.string(),
  sequence: z.number().int(),
  ...trackingGeoCoordinateShape,
}).strict();

const tripRouteContextSchema = z.object({
  tripId: z.string().uuid(),
  geometry: z.object({
    source: z.literal('ROUTE_POLYLINE'),
    points: z.array(trackingRoutePointSchema).min(2).max(1_000),
  }).strict().nullable(),
  originStation: trackingRouteStationSchema.nullable(),
  intermediateStops: z.array(trackingRouteIntermediateStopSchema),
  destinationStation: trackingRouteStationSchema.nullable(),
}).strict();

export const shuttleDirectionSchema = z.enum([
  'INBOUND_TO_STATION',
  'OUTBOUND_FROM_STATION',
]);

const shuttlePassengerPickupSchema = z.object({
  bookingId: z.string().uuid(),
  pickupOrder: z.number().int().positive(),
  serviceAddress: z.string().trim().min(1).optional(),
  serviceOrder: z.number().int().positive().optional(),
  roadDistanceMeters: z.number().int().nonnegative().optional(),
  ...trackingGeoCoordinateShape,
  status: z.enum(['PENDING', 'PICKED_UP']),
  stopsBeforePickup: z.number().int().nonnegative(),
}).strict();

const shuttlePassengerStationSchema = z.object({
  stationId: z.string().uuid(),
  name: z.string(),
  ...trackingGeoCoordinateShape,
  pickupOrder: z.number().int().positive(),
}).strict();

const shuttlePassengerContextSchema = z.object({
  shuttleTripId: z.string().uuid(),
  mainTripId: z.string().uuid(),
  direction: shuttleDirectionSchema,
  ownPickups: z.array(shuttlePassengerPickupSchema),
  station: shuttlePassengerStationSchema.nullable(),
}).strict();

const shuttleTrackingPointSchema = z.object({
  shuttleTripId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  speedKmh: z.number().finite().nonnegative().optional(),
  heading: z.number().finite().min(0).max(360).optional(),
  recordedAt: trackingDateTimeSchema,
}).strict().refine(isValidGeoCoordinate, 'Invalid shuttle GPS coordinate.');

export const shuttleTrackingEtaSchema = z.object({
  shuttleTripId: z.string().uuid(),
  nextPickupOrder: z.number().int().positive(),
  etaMinutes: z.number().int().positive(),
  estimatedArrivalTime: trackingDateTimeSchema,
  distanceMeters: z.number().int().nonnegative(),
  updatedAt: trackingDateTimeSchema,
}).strict();

export type TrackingPoint = z.infer<typeof trackingPointSchema>;

export type TrackingTrailPoint = z.infer<typeof trackingTrailPointSchema>;

export type TrackingLatestResponse = z.infer<typeof trackingLatestResponseSchema>;

export type TrackingTrailResponse = z.infer<typeof trackingTrailResponseSchema>;

export type TrackingEta = z.infer<typeof trackingEtaSchema>;

export type TrackingEtaResponse = z.infer<typeof trackingEtaResponseSchema>;

export type TrackingEtaBatchResponse = z.infer<
  typeof trackingEtaBatchResponseSchema
>;

export type TrackingEtaQuality = z.infer<typeof trackingEtaQualitySchema>;

export type { TrackingTarget } from '../types/trackingTarget';
export {
  buildTrackingTargetFromPoints,
  isTrackingTarget,
  trackingTargetCacheKey,
  trackingTargetId,
  trackingTargetsEqual,
} from '../types/trackingTarget';

export type ShuttleTrackingEta = z.infer<typeof shuttleTrackingEtaSchema>;

export type ShuttleDirection = z.infer<typeof shuttleDirectionSchema>;

export type TrackingGeoCoordinate = z.infer<typeof trackingRoutePointSchema>;

export type TrackingRouteStation = z.infer<typeof trackingRouteStationSchema>;

export type TrackingRouteIntermediateStop = z.infer<
  typeof trackingRouteIntermediateStopSchema
>;

export type TripRouteContext = z.infer<typeof tripRouteContextSchema>;

export interface TripRouteContextCache {
  data: TripRouteContext;
  etag: string | null;
}

export type ShuttlePassengerPickup = z.infer<typeof shuttlePassengerPickupSchema>;

export type ShuttlePassengerStation = z.infer<typeof shuttlePassengerStationSchema>;

export type ShuttlePassengerContext = z.infer<typeof shuttlePassengerContextSchema>;

export interface ShuttleTrackingLatestResponse {
  latest: TrackingPoint | null;
}

export interface ShuttleTrackingEtaResponse {
  eta: ShuttleTrackingEta | null;
}

export interface TrackingTrailParams {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'recordedAt';
  sortDir?: 'asc' | 'desc';
}

const assertExpectedTrip = (
  expectedTripId: string,
  actualTripIds: readonly string[],
): void => {
  if (actualTripIds.some((tripId) => tripId !== expectedTripId)) {
    throw new Error('Tracking response does not match the requested trip.');
  }
};

export const parseTrackingPoint = (value: unknown): TrackingPoint | null => {
  const result = trackingPointSchema.safeParse(value);
  return result.success ? result.data : null;
};

export const parseShuttleTrackingPoint = (
  value: unknown,
  expectedShuttleTripId?: string,
): TrackingPoint | null => {
  const result = shuttleTrackingPointSchema.safeParse(value);
  if (
    !result.success
    || (
      expectedShuttleTripId !== undefined
      && result.data.shuttleTripId !== expectedShuttleTripId
    )
  ) {
    return null;
  }

  const { shuttleTripId, heading, ...point } = result.data;
  return {
    ...point,
    tripId: shuttleTripId,
    ...(heading !== undefined ? { headingDeg: heading } : {}),
  };
};

export const parseShuttleTrackingEta = (
  value: unknown,
  expectedShuttleTripId?: string,
): ShuttleTrackingEta | null => {
  const result = shuttleTrackingEtaSchema.safeParse(value);
  if (
    !result.success
    || (
      expectedShuttleTripId !== undefined
      && result.data.shuttleTripId !== expectedShuttleTripId
    )
  ) {
    return null;
  }
  return result.data;
};

export const parseTrackingLatestResponse = (
  value: unknown,
  expectedTripId: string,
): TrackingLatestResponse => {
  const parsed = trackingLatestResponseSchema.parse(value);
  assertExpectedTrip(expectedTripId, parsed.latest ? [parsed.latest.tripId] : []);
  return parsed;
};

export const parseTrackingTrailResponse = (
  value: unknown,
  expectedTripId: string,
): TrackingTrailResponse => {
  const parsed = trackingTrailResponseSchema.parse(value);
  assertExpectedTrip(expectedTripId, parsed.items.map((point) => point.tripId));
  return parsed;
};

export const parseTrackingEtaResponse = (
  value: unknown,
  expectedTripId: string,
  expectedTarget?: TrackingTarget,
): TrackingEtaResponse => {
  const parsed = trackingEtaResponseSchema.parse(value);
  assertExpectedTrip(expectedTripId, parsed.eta ? [parsed.eta.tripId] : []);
  // Enforce target match only when the caller requested a specific target.
  if (expectedTarget && parsed.eta) {
    const eta = parsed.eta;
    const matches = expectedTarget.kind === 'STOP'
      ? eta.targetKind === 'STOP' && eta.stopId === expectedTarget.stopId
      : eta.targetKind === 'STATION' && eta.stationId === expectedTarget.stationId;
    if (!matches) {
      throw new Error('Tracking ETA response does not match the requested target.');
    }
  }
  return parsed;
};

export const parseTrackingEtaBatchResponse = (
  value: unknown,
  expectedTripId: string,
): TrackingEtaBatchResponse => {
  const parsed = trackingEtaBatchResponseSchema.parse(value);
  assertExpectedTrip(expectedTripId, parsed.etas.map((eta) => eta.tripId));
  return parsed;
};

export const parseTripRouteContext = (
  value: unknown,
  expectedTripId: string,
): TripRouteContext => {
  const parsed = tripRouteContextSchema.parse(value);
  assertExpectedTrip(expectedTripId, [parsed.tripId]);
  return parsed;
};

export const parseShuttlePassengerContext = (
  value: unknown,
  expectedShuttleTripId: string,
): ShuttlePassengerContext => {
  const parsed = shuttlePassengerContextSchema.parse(value);
  if (parsed.shuttleTripId !== expectedShuttleTripId) {
    throw new Error('Shuttle passenger context does not match the requested trip.');
  }
  return parsed;
};

export const trackingKeys = {
  all: ['tracking'] as const,
  trip: (userId: string, tripId: string) =>
    [...trackingKeys.all, userId, 'trip', tripId] as const,
  latest: (userId: string, tripId: string) =>
    [...trackingKeys.trip(userId, tripId), 'latest'] as const,
  trail: (userId: string, tripId: string) =>
    [...trackingKeys.trip(userId, tripId), 'trail'] as const,
  /** Root for all ETA query keys under a trip (next + target). */
  etaRoot: (userId: string, tripId: string) =>
    [...trackingKeys.trip(userId, tripId), 'eta'] as const,
  /** Operational next-stop ETA (no stopId on the wire). */
  nextEta: (userId: string, tripId: string) =>
    [...trackingKeys.etaRoot(userId, tripId), 'next'] as const,
  /** Passenger target ETA for STOP|STATION (kind + id in the key). */
  targetEta: (
    userId: string,
    tripId: string,
    target: TrackingTarget | 'none',
  ) => [
    ...trackingKeys.etaRoot(userId, tripId),
    'target',
    target === 'none' ? 'none' : trackingTargetCacheKey(target),
  ] as const,
  etaBatch: (userId: string, tripId: string) =>
    [...trackingKeys.etaRoot(userId, tripId), 'batch'] as const,
  routeContext: (userId: string, tripId: string) =>
    [...trackingKeys.trip(userId, tripId), 'route-context'] as const,
  shuttle: (userId: string, shuttleTripId: string) =>
    [...trackingKeys.all, userId, 'shuttle', shuttleTripId] as const,
  shuttleLatest: (userId: string, shuttleTripId: string) =>
    [...trackingKeys.shuttle(userId, shuttleTripId), 'latest'] as const,
  shuttleEta: (userId: string, shuttleTripId: string) =>
    [...trackingKeys.shuttle(userId, shuttleTripId), 'eta'] as const,
  shuttlePassengerContext: (userId: string, shuttleTripId: string) =>
    [...trackingKeys.shuttle(userId, shuttleTripId), 'passenger-context'] as const,
};

const trackingTripPath = (tripId: string): string => {
  const tripIdSegment = encodeUuidPathSegment(tripId, 'tripId');
  return `/tracking/trips/${tripIdSegment}`;
};

const readEtagHeader = (headers: Record<string, unknown>): string | null => {
  const value = headers.etag ?? headers.ETag;
  return typeof value === 'string' && value.length > 0 ? value : null;
};

export async function getTripRouteContext(
  tripId: string,
  previous?: TripRouteContextCache,
  signal?: AbortSignal,
): Promise<TripRouteContextCache> {
  const response = await apiClient.get<ApiEnvelope<unknown>>(
    `${trackingTripPath(tripId)}/route-geometry`,
    {
      ...(previous?.etag
        ? { headers: { 'If-None-Match': previous.etag } }
        : {}),
      ...(signal ? { signal } : {}),
      validateStatus: (status) => status === 200 || status === 304,
    },
  );

  if (response.status === 304) {
    if (previous?.data.tripId === tripId) return previous;
    throw new ApiRequestError({
      code: 'TRACKING_ROUTE_CONTEXT_CACHE_MISS',
      message: 'The tracking route cache could not satisfy a not-modified response.',
      statusCode: 304,
    });
  }

  return {
    data: parseTripRouteContext(unwrapApiResponse(response.data), tripId),
    etag: readEtagHeader(response.headers as Record<string, unknown>),
  };
}

export async function getTrackingLatest(
  tripId: string,
  signal?: AbortSignal,
): Promise<TrackingLatestResponse> {
  const path = `${trackingTripPath(tripId)}/latest`;
  const response = signal
    ? await apiClient.get<ApiEnvelope<TrackingLatestResponse>>(path, { signal })
    : await apiClient.get<ApiEnvelope<TrackingLatestResponse>>(path);
  return parseTrackingLatestResponse(unwrapApiResponse(response.data), tripId);
}

export async function getTrackingTrail(
  tripId: string,
  params: TrackingTrailParams = {},
  signal?: AbortSignal,
): Promise<TrackingTrailResponse> {
  const response = await apiClient.get<ApiEnvelope<TrackingTrailResponse>>(
    `${trackingTripPath(tripId)}/trail`,
    {
      params: {
        page: 1,
        pageSize: 100,
        sortBy: 'recordedAt',
        sortDir: 'desc',
        ...params,
      },
      ...(signal ? { signal } : {}),
    },
  );
  return parseTrackingTrailResponse(unwrapApiResponse(response.data), tripId);
}

export interface GetTrackingEtaOptions {
  /** Omit for operational next-stop; pass STOP|STATION for target ETA. */
  target?: TrackingTarget;
  signal?: AbortSignal;
}

/**
 * Single ETA helper. Omit target for operational next-stop; pass TrackingTarget
 * for passenger destination ETA (STOP or STATION).
 */
export async function getTrackingEta(
  tripId: string,
  options: GetTrackingEtaOptions = {},
): Promise<TrackingEtaResponse> {
  const { target, signal } = options;
  const params: Record<string, string> = {};
  if (target?.kind === 'STOP') {
    params.targetKind = 'STOP';
    params.stopId = encodeUuidPathSegment(target.stopId, 'stopId');
  } else if (target?.kind === 'STATION') {
    params.targetKind = 'STATION';
    params.stationId = encodeUuidPathSegment(target.stationId, 'stationId');
  }
  const response = await apiClient.get<ApiEnvelope<TrackingEtaResponse>>(
    `${trackingTripPath(tripId)}/eta`,
    {
      ...(Object.keys(params).length > 0 ? { params } : {}),
      ...(signal ? { signal } : {}),
    },
  );
  return parseTrackingEtaResponse(
    unwrapApiResponse(response.data),
    tripId,
    target,
  );
}

/** Preferred v1.67 display read: all remaining STOP ETAs plus destination STATION. */
export async function getTrackingEtas(
  tripId: string,
  signal?: AbortSignal,
): Promise<TrackingEtaBatchResponse> {
  const response = await apiClient.get<ApiEnvelope<unknown>>(
    `${trackingTripPath(tripId)}/etas`,
    signal ? { signal } : undefined,
  );
  return parseTrackingEtaBatchResponse(
    unwrapApiResponse(response.data),
    tripId,
  );
}

const trackingShuttlePath = (shuttleTripId: string): string => {
  const shuttleTripIdSegment = encodeUuidPathSegment(
    shuttleTripId,
    'shuttleTripId',
  );
  return `/tracking/shuttle-trips/${shuttleTripIdSegment}`;
};

export async function getShuttlePassengerContext(
  shuttleTripId: string,
  signal?: AbortSignal,
): Promise<ShuttlePassengerContext> {
  const response = await apiClient.get<ApiEnvelope<unknown>>(
    `${trackingShuttlePath(shuttleTripId)}/passenger-context`,
    signal ? { signal } : undefined,
  );
  return parseShuttlePassengerContext(
    unwrapApiResponse(response.data),
    shuttleTripId,
  );
}

export async function getShuttleTrackingLatest(
  shuttleTripId: string,
  signal?: AbortSignal,
): Promise<ShuttleTrackingLatestResponse> {
  const response = await apiClient.get<ApiEnvelope<unknown>>(
    `${trackingShuttlePath(shuttleTripId)}/latest`,
    signal ? { signal } : undefined,
  );
  const value = unwrapApiResponse(response.data);
  if (value === null) return { latest: null };

  const latest = parseShuttleTrackingPoint(value, shuttleTripId);
  if (!latest) {
    throw new Error('Invalid shuttle tracking response.');
  }
  return { latest };
}

export async function getShuttleTrackingEta(
  shuttleTripId: string,
  signal?: AbortSignal,
): Promise<ShuttleTrackingEtaResponse> {
  const response = await apiClient.get<ApiEnvelope<unknown>>(
    `${trackingShuttlePath(shuttleTripId)}/eta`,
    signal ? { signal } : undefined,
  );
  const value = unwrapApiResponse(response.data);
  if (value === null) return { eta: null };

  const eta = parseShuttleTrackingEta(value, shuttleTripId);
  if (!eta) {
    throw new Error('Invalid shuttle tracking ETA response.');
  }
  return { eta };
}
