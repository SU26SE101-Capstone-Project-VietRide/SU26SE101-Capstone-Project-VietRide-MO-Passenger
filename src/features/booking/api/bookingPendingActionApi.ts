import { apiClient } from '@shared/api/axiosInstance';
import { normalizeIdempotencyKey } from '@shared/api/idempotency';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import { z } from 'zod';

export type ResolvePendingActionDecision = 'ACCEPTED' | 'REJECTED';

export interface ResolvePendingActionPayload {
  action: ResolvePendingActionDecision;
  selectedStopId?: string | null;
  selectedStationId?: string | null;
  note?: string;
}

export interface ResolvePendingActionResult {
  bookingId: string;
  actionId: string;
  resolvedAction: ResolvePendingActionDecision;
  resolvedAt: string;
}

const resolveResultSchema = z.object({
  bookingId: z.string().uuid(),
  actionId: z.string().uuid(),
  resolvedAction: z.enum(['ACCEPTED', 'REJECTED']),
  resolvedAt: z.string().datetime({ offset: true }),
}).strict();

export async function resolveBookingPendingAction(
  bookingId: string,
  actionId: string,
  payload: ResolvePendingActionPayload,
  idempotencyKey: string,
): Promise<ResolvePendingActionResult> {
  const safeBookingId = encodeUuidPathSegment(bookingId, 'booking ID');
  const safeActionId = encodeUuidPathSegment(actionId, 'pending action ID');
  const response = await apiClient.post<ApiEnvelope<ResolvePendingActionResult>>(
    `/bookings/${safeBookingId}/pending-actions/${safeActionId}/resolve`,
    payload,
    {
      headers: {
        'Idempotency-Key': normalizeIdempotencyKey(idempotencyKey),
      },
    },
  );

  return resolveResultSchema.parse(unwrapApiResponse(response.data));
}
