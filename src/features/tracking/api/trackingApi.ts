import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { isValidGeoCoordinate } from '@shared/utils/geo';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import { z } from 'zod';

export const trackingDateTimeSchema = z.string().datetime();

const trackingPointShape = {
  tripId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  speedKmh: z.number().finite().nonnegative().optional(),
  headingDeg: z.number().finite().min(0).max(360).optional(),
  recordedAt: trackingDateTimeSchema,
} as const;

const trackingPointSchema = z.object(trackingPointShape)
  .refine(isValidGeoCoordinate, 'Invalid GPS coordinate.');

const trackingTrailPointSchema = z.object({
  ...trackingPointShape,
  id: z.string().uuid(),
}).refine(isValidGeoCoordinate, 'Invalid GPS coordinate.');

export const trackingEtaSchema = z.object({
  tripId: z.string().uuid(),
  stopId: z.string().uuid(),
  etaMinutes: z.number().int().positive(),
  estimatedArrivalTime: trackingDateTimeSchema,
  distanceMeters: z.number().int().nonnegative(),
  updatedAt: trackingDateTimeSchema,
});

const trackingLatestResponseSchema = z.object({
  latest: trackingPointSchema.nullable(),
});

const trackingTrailResponseSchema = z.object({
  items: z.array(trackingTrailPointSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

const trackingEtaResponseSchema = z.object({
  eta: trackingEtaSchema.nullable(),
});

export type TrackingPoint = z.infer<typeof trackingPointSchema>;

export type TrackingTrailPoint = z.infer<typeof trackingTrailPointSchema>;

export type TrackingLatestResponse = z.infer<typeof trackingLatestResponseSchema>;

export type TrackingTrailResponse = z.infer<typeof trackingTrailResponseSchema>;

export type TrackingEta = z.infer<typeof trackingEtaSchema>;

export type TrackingEtaResponse = z.infer<typeof trackingEtaResponseSchema>;

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
  expectedStopId: string,
): TrackingEtaResponse => {
  const parsed = trackingEtaResponseSchema.parse(value);
  assertExpectedTrip(expectedTripId, parsed.eta ? [parsed.eta.tripId] : []);
  if (parsed.eta && parsed.eta.stopId !== expectedStopId) {
    throw new Error('Tracking ETA response does not match the requested stop.');
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
  eta: (userId: string, tripId: string, stopId: string) =>
    [...trackingKeys.trip(userId, tripId), 'eta', stopId] as const,
};

const trackingTripPath = (tripId: string): string => {
  const tripIdSegment = encodeUuidPathSegment(tripId, 'tripId');
  return `/tracking/trips/${tripIdSegment}`;
};

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

export async function getTrackingEta(
  tripId: string,
  stopId: string,
  signal?: AbortSignal,
): Promise<TrackingEtaResponse> {
  const stopIdParam = encodeUuidPathSegment(stopId, 'stopId');
  const response = await apiClient.get<ApiEnvelope<TrackingEtaResponse>>(
    `${trackingTripPath(tripId)}/eta`,
    {
      params: { stopId: stopIdParam },
      ...(signal ? { signal } : {}),
    },
  );
  return parseTrackingEtaResponse(
    unwrapApiResponse(response.data),
    tripId,
    stopId,
  );
}
