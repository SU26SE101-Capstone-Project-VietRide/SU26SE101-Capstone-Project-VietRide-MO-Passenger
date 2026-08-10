import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import type { PaymentSessionStatus, PaymentSessionStatusResult } from './types';

const SESSION_STATUSES = new Set<PaymentSessionStatus>([
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
]);

interface PaymentSessionStatusDto {
  sessionId: string;
  status: string;
}

export function mapPaymentSessionStatus(
  dto: PaymentSessionStatusDto,
): PaymentSessionStatusResult {
  const status = dto.status.trim().toUpperCase() as PaymentSessionStatus;
  if (!SESSION_STATUSES.has(status)) {
    throw new Error(`Unknown payment session status: ${dto.status}`);
  }

  return {
    sessionId: dto.sessionId,
    status,
  };
}

/** GET /v1/payments/sessions/{sessionId} — JWT passenger, read-only. */
export async function getPaymentSessionStatus(
  sessionId: string,
  signal?: AbortSignal,
): Promise<PaymentSessionStatusResult> {
  const segment = encodeUuidPathSegment(sessionId, 'sessionId');
  const response = await apiClient.get<ApiEnvelope<PaymentSessionStatusDto>>(
    `/payments/sessions/${segment}`,
    signal ? { signal } : undefined,
  );

  return mapPaymentSessionStatus(unwrapApiResponse(response.data));
}
