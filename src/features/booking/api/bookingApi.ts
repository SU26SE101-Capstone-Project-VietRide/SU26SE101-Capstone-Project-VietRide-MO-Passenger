import { apiClient } from '@shared/api/axiosInstance';
import { normalizeIdempotencyKey } from '@shared/api/idempotency';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import { withVnPayPaymentReturnMode } from '@shared/payments';
import type { 
  CreateBookingPayload, 
  CreateRoundTripPayload, 
  BookingResult,
  BookingStatusResult,
  CancelBookingPayload,
  CancelBookingResult,
  RoundTripResult,
  AvailableVoucherItem,
  GetAvailableVouchersParams,
  PromotionItem
} from '../types';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';
import { passengerHistoryVehicleSchema } from '@features/profile/api/passengerHistoryApi';
import type { BookingVehicle } from '../types';

export const parseBookingVehicle = (value: unknown): BookingVehicle | null => {
  const parsed = passengerHistoryVehicleSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const withIdempotencyKey = (idempotencyKey: string) => {
  return {
    headers: {
      'Idempotency-Key': normalizeIdempotencyKey(idempotencyKey),
    },
  } as const;
};

export const bookingKeys = {
  all: ['bookings'] as const,
  user: (userId: string) => [...bookingKeys.all, userId] as const,
  paymentStatusRoot: (userId: string) =>
    [...bookingKeys.user(userId), 'payment-status'] as const,
  paymentStatus: (userId: string, bookingIds: readonly string[]) =>
    [...bookingKeys.paymentStatusRoot(userId), ...bookingIds] as const,
  availableVouchers: (userId: string, params: GetAvailableVouchersParams) =>
    [...bookingKeys.all, userId, 'vouchers', 'available', params] as const,
  promotions: (service: string) => [...bookingKeys.all, 'promotions', service] as const,
};

export async function getBookingStatus(
  bookingId: string,
  signal?: AbortSignal,
): Promise<BookingStatusResult> {
  const safeBookingId = encodeUuidPathSegment(bookingId, 'booking ID');
  const response = await apiClient.get<ApiEnvelope<BookingStatusResult>>(
    `/bookings/${safeBookingId}`,
    signal ? { signal } : undefined,
  );
  return unwrapApiResponse(response.data);
}

export async function cancelBooking(
  bookingId: string,
  payload: CancelBookingPayload,
  idempotencyKey: string,
): Promise<CancelBookingResult> {
  const safeBookingId = encodeUuidPathSegment(bookingId, 'booking ID');
  const response = await apiClient.post<ApiEnvelope<CancelBookingResult>>(
    `/bookings/${safeBookingId}/cancel`,
    payload,
    withIdempotencyKey(idempotencyKey),
  );
  return unwrapApiResponse(response.data);
}

export async function createBooking(
  payload: CreateBookingPayload,
  idempotencyKey: string,
): Promise<BookingResult> {
  const body = withVnPayPaymentReturnMode(payload);
  const response = await apiClient.post<ApiEnvelope<BookingResult>>(
    '/bookings',
    body,
    withIdempotencyKey(idempotencyKey),
  );
  const result = unwrapApiResponse(response.data);
  return {
    ...result,
    vehicle: parseBookingVehicle(result.vehicle),
  };
}

export async function createRoundTripBooking(
  payload: CreateRoundTripPayload,
  idempotencyKey: string,
): Promise<RoundTripResult> {
  const body = withVnPayPaymentReturnMode(payload);
  const response = await apiClient.post<ApiEnvelope<RoundTripResult>>(
    '/bookings/round-trip',
    body,
    withIdempotencyKey(idempotencyKey),
  );
  const result = unwrapApiResponse(response.data);
  return {
    ...result,
    outbound: {
      ...result.outbound,
      vehicle: parseBookingVehicle(result.outbound.vehicle),
    },
    return: {
      ...result.return,
      vehicle: parseBookingVehicle(result.return.vehicle),
    },
  };
}

export async function getAvailableVouchers(
  params: GetAvailableVouchersParams,
  signal?: AbortSignal,
): Promise<AvailableVoucherItem[]> {
  const response = await apiClient.get<ApiEnvelope<AvailableVoucherItem[]>>('/vouchers/available', {
    params,
    ...(signal ? { signal } : {}),
  });
  return unwrapApiResponse(response.data);
}

export async function getPromotions(
  service = 'BOOKING',
  signal?: AbortSignal,
): Promise<PromotionItem[]> {
  const response = await apiClient.get<ApiEnvelope<PromotionItem[]>>('/promotions', {
    params: { service },
    ...(signal ? { signal } : {}),
  });
  return unwrapApiResponse(response.data);
}
