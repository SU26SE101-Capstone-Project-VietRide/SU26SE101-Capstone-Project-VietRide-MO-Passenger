import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { 
  CreateBookingPayload, 
  CreateRoundTripPayload, 
  BookingHistoryItem,
  BookingResult,
  RoundTripResult,
  AvailableVoucherItem,
  GetAvailableVouchersParams,
  PromotionItem
} from '../types';

export const bookingKeys = {
  all: ['bookings'] as const,
  history: (userId: string) => [...bookingKeys.all, userId, 'history'] as const,
  detail: (id: string) => [...bookingKeys.all, id] as const,
  availableVouchers: (userId: string, params: GetAvailableVouchersParams) =>
    [...bookingKeys.all, userId, 'vouchers', 'available', params] as const,
  promotions: (service: string) => [...bookingKeys.all, 'promotions', service] as const,
};

export async function createBooking(
  payload: CreateBookingPayload,
  idempotencyKey: string,
) {
  const response = await apiClient.post<ApiEnvelope<BookingResult>>('/bookings', payload, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });
  return unwrapApiResponse(response.data);
}

export async function createRoundTripBooking(
  payload: CreateRoundTripPayload,
  idempotencyKey: string,
) {
  const response = await apiClient.post<ApiEnvelope<RoundTripResult>>('/bookings/round-trip', payload, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });
  return unwrapApiResponse(response.data);
}

export async function getBookingHistory(signal?: AbortSignal): Promise<BookingHistoryItem[]> {
  const response = signal
    ? await apiClient.get<ApiEnvelope<BookingHistoryItem[]>>('/bookings/history', { signal })
    : await apiClient.get<ApiEnvelope<BookingHistoryItem[]>>('/bookings/history');
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
