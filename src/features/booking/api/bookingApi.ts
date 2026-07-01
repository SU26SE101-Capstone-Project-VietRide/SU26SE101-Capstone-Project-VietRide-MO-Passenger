import { apiClient } from '@shared/api/axiosInstance';
import { unwrapApiResponse, type ApiEnvelope } from '@shared/api/errors';
import type { 
  CreateBookingPayload, 
  CreateRoundTripPayload, 
  BookingHistoryItem,
  BookingResult,
  RoundTripResult
} from '../types';

export const bookingKeys = {
  all: ['bookings'] as const,
  history: () => [...bookingKeys.all, 'history'] as const,
  detail: (id: string) => [...bookingKeys.all, id] as const,
};

export async function createBooking(payload: CreateBookingPayload) {
  // Use crypto.randomUUID() for Idempotency-Key
  const idempotencyKey = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const response = await apiClient.post<ApiEnvelope<BookingResult>>('/bookings', payload, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    skipAuthRefresh: true,
  });
  return unwrapApiResponse(response.data);
}

export async function createRoundTripBooking(payload: CreateRoundTripPayload) {
  const idempotencyKey = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const response = await apiClient.post<ApiEnvelope<RoundTripResult>>('/bookings/round-trip', payload, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    skipAuthRefresh: true,
  });
  return unwrapApiResponse(response.data);
}

export async function getBookingHistory(): Promise<BookingHistoryItem[]> {
  const response = await apiClient.get<ApiEnvelope<BookingHistoryItem[]>>('/bookings/history');
  return unwrapApiResponse(response.data);
}
