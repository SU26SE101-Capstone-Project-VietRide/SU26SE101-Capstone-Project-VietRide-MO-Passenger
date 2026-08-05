import { z } from 'zod';

import { apiClient } from '@shared/api/axiosInstance';
import {
  ApiRequestError,
  unwrapApiResponse,
  type ApiEnvelope,
} from '@shared/api/errors';
import { normalizeIdempotencyKey } from '@shared/api/idempotency';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';

const SHARE_TOKEN_FRAGMENT_PATTERN =
  /^#token=v1\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[A-Za-z0-9_-]{43}$/i;

const secureShareUrlSchema = z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:'
      && !url.username
      && !url.password
      && !url.search
      && SHARE_TOKEN_FRAGMENT_PATTERN.test(url.hash)
    );
  } catch {
    return false;
  }
}, 'Trip share URL must use HTTPS and a fragment-only v1 token.');

const tripShareLinkResponseSchema = z.object({
  shareUrl: secureShareUrlSchema,
  expiresAt: z.string().datetime(),
}).strict();

const tripShareRevokedResponseSchema = z.object({
  revoked: z.literal(true),
}).strict();

export type TripShareLinkResponse = z.infer<typeof tripShareLinkResponseSchema>;
export type TripShareRevokedResponse = z.infer<
  typeof tripShareRevokedResponseSchema
>;

const shareLinkPath = (tripId: string): string => {
  const tripIdSegment = encodeUuidPathSegment(tripId, 'tripId');
  // apiClient already targets the gateway's /v1 base path.
  return `/tracking/trips/${tripIdSegment}/share-link`;
};

const parseResponse = <T>(
  value: unknown,
  schema: z.ZodType<T>,
): T => {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;

  throw new ApiRequestError({
    message: 'Trip sharing returned an invalid response.',
    code: 'INVALID_API_RESPONSE',
  });
};

const idempotencyHeaders = (idempotencyKey: string) => ({
  'Idempotency-Key': normalizeIdempotencyKey(idempotencyKey),
});

/** Creates or returns the passenger-owned active link for this trip. */
export async function createTripShareLink(
  tripId: string,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<TripShareLinkResponse> {
  const response = await apiClient.put<ApiEnvelope<unknown>>(
    shareLinkPath(tripId),
    null,
    {
      headers: idempotencyHeaders(idempotencyKey),
      ...(signal ? { signal } : {}),
    },
  );

  return parseResponse(
    unwrapApiResponse(response.data),
    tripShareLinkResponseSchema,
  );
}

/** Revokes the passenger-owned active link for this trip. */
export async function revokeTripShareLink(
  tripId: string,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<TripShareRevokedResponse> {
  const response = await apiClient.delete<ApiEnvelope<unknown>>(
    shareLinkPath(tripId),
    {
      headers: idempotencyHeaders(idempotencyKey),
      ...(signal ? { signal } : {}),
    },
  );

  return parseResponse(
    unwrapApiResponse(response.data),
    tripShareRevokedResponseSchema,
  );
}
