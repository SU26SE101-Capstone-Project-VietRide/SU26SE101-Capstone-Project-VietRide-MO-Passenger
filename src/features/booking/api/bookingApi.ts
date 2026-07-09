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
  history: () => [...bookingKeys.all, 'history'] as const,
  detail: (id: string) => [...bookingKeys.all, id] as const,
  availableVouchers: (params: GetAvailableVouchersParams) =>
    [...bookingKeys.all, 'vouchers', 'available', params] as const,
  promotions: (service: string) => [...bookingKeys.all, 'promotions', service] as const,
};

const createIdempotencyKey = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `mobile-${timestamp}-${random}`;
};

export async function createBooking(payload: CreateBookingPayload) {
  const response = await apiClient.post<ApiEnvelope<BookingResult>>('/bookings', payload, {
    headers: {
      'Idempotency-Key': createIdempotencyKey(),
    },
  });
  return unwrapApiResponse(response.data);
}

export async function createRoundTripBooking(payload: CreateRoundTripPayload) {
  const response = await apiClient.post<ApiEnvelope<RoundTripResult>>('/bookings/round-trip', payload, {
    headers: {
      'Idempotency-Key': createIdempotencyKey(),
    },
  });
  return unwrapApiResponse(response.data);
}

export async function getBookingHistory(): Promise<BookingHistoryItem[]> {
  const response = await apiClient.get<ApiEnvelope<BookingHistoryItem[]>>('/bookings/history');
  return unwrapApiResponse(response.data);
}

export async function getAvailableVouchers(
  params: GetAvailableVouchersParams,
): Promise<AvailableVoucherItem[]> {
  const response = await apiClient.get<ApiEnvelope<AvailableVoucherItem[]>>('/vouchers/available', {
    params,
  });
  return unwrapApiResponse(response.data);
}

export async function getPromotions(service = 'BOOKING'): Promise<PromotionItem[]> {
  const response = await apiClient.get<ApiEnvelope<PromotionItem[]>>('/promotions', {
    params: { service },
  });
  return unwrapApiResponse(response.data);
}
