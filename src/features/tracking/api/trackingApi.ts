import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';

export interface TrackingPoint {
  tripId: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  headingDeg?: number;
  recordedAt: string;
}

export interface TrackingTrailPoint extends TrackingPoint {
  id: string;
}

export interface TrackingLatestResponse {
  latest: TrackingPoint | null;
}

export interface TrackingTrailResponse {
  items: TrackingTrailPoint[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TrackingEta {
  tripId: string;
  stopId: string;
  etaMinutes: number;
  estimatedArrivalTime: string;
  distanceMeters: number;
  updatedAt: string;
}

export interface TrackingEtaResponse {
  eta: TrackingEta | null;
}

export interface TrackingTrailParams {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'recordedAt';
  sortDir?: 'asc' | 'desc';
}

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
  return unwrapApiResponse(response.data);
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
  return unwrapApiResponse(response.data);
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
  return unwrapApiResponse(response.data);
}
