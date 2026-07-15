import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { 
  CreateBookingPayload, 
  CreateRoundTripPayload, 
  BookingResult,
  BookingStatusResult,
  RoundTripResult,
  AvailableVoucherItem,
  GetAvailableVouchersParams,
  PromotionItem
} from '../types';
import { encodeUuidPathSegment } from '@shared/utils/pathSegment';

const withIdempotencyKey = (idempotencyKey: string) => {
  const normalizedKey = idempotencyKey.trim();
  if (!normalizedKey) {
    throw new Error('Idempotency key is required.');
  }

  return {
    headers: {
      'Idempotency-Key': normalizedKey,
    },
  } as const;
};

export const bookingKeys = {
  all: ['bookings'] as const,
  user: (userId: string) => [...bookingKeys.all, userId] as const,
  paymentStatus: (userId: string, bookingIds: readonly string[]) =>
    [...bookingKeys.user(userId), 'payment-status', ...bookingIds] as const,
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

export async function createBooking(
  payload: CreateBookingPayload,
  idempotencyKey: string,
): Promise<BookingResult> {
  const response = await apiClient.post<ApiEnvelope<BookingResult>>(
    '/bookings',
    payload,
    withIdempotencyKey(idempotencyKey),
  );
  return unwrapApiResponse(response.data);
}

export async function createRoundTripBooking(
  payload: CreateRoundTripPayload,
  idempotencyKey: string,
): Promise<RoundTripResult> {
  const response = await apiClient.post<ApiEnvelope<RoundTripResult>>(
    '/bookings/round-trip',
    payload,
    withIdempotencyKey(idempotencyKey),
  );
  return unwrapApiResponse(response.data);
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
