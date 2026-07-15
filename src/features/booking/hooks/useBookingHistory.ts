/**
 * Passenger booking history provider boundary.
 *
 * The current backend baseline has no passenger history/detail endpoint. Demo
 * builds may use the explicitly labelled fixture provider; every other build
 * fails closed with a typed unavailable result. Keeping the source as a
 * discriminant prevents a real empty history from being confused with a
 * missing backend capability when the remote provider is introduced.
 */
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../auth/store/useAuthStore';
import { isDemoMode } from '@shared/constants/demoMode';
import { isUuid } from '@shared/utils/pathSegment';
import {
  BOOKING_HISTORY_FIXTURE,
  getBookingHistoryTicketFixture,
  type BookingHistoryTicketDetail,
} from '../data/bookingHistoryFixture';
import type { BookingHistoryItem } from '../types/booking';

export type BookingHistoryUnavailableReason =
  | 'authentication_required'
  | 'backend_not_supported'
  | 'invalid_booking_id'
  | 'ticket_not_found';

export type BookingHistoryResult =
  | { source: 'remote'; items: BookingHistoryItem[] }
  | { source: 'demo'; items: BookingHistoryItem[] }
  | { source: 'unavailable'; reason: BookingHistoryUnavailableReason };

export type BookingHistoryTicketResult =
  | { source: 'remote'; detail: BookingHistoryTicketDetail }
  | { source: 'demo'; detail: BookingHistoryTicketDetail }
  | { source: 'unavailable'; reason: BookingHistoryUnavailableReason };

interface BookingHistoryProviderContext {
  userId?: string;
  demoMode: boolean;
}

export function resolveBookingHistorySnapshot({
  userId,
  demoMode,
}: BookingHistoryProviderContext): BookingHistoryResult {
  if (!userId) {
    return { source: 'unavailable', reason: 'authentication_required' };
  }

  if (demoMode) {
    return { source: 'demo', items: BOOKING_HISTORY_FIXTURE };
  }

  return { source: 'unavailable', reason: 'backend_not_supported' };
}

export function resolveBookingHistoryTicketSnapshot(
  bookingId: string,
  { userId, demoMode }: BookingHistoryProviderContext,
): BookingHistoryTicketResult {
  if (!userId) {
    return { source: 'unavailable', reason: 'authentication_required' };
  }

  if (!isUuid(bookingId)) {
    return { source: 'unavailable', reason: 'invalid_booking_id' };
  }

  if (!demoMode) {
    return { source: 'unavailable', reason: 'backend_not_supported' };
  }

  const detail = getBookingHistoryTicketFixture(bookingId);
  return detail
    ? { source: 'demo', detail }
    : { source: 'unavailable', reason: 'ticket_not_found' };
}

export function useBookingHistory() {
  const userId = useAuthStore((state) => state.user?.id);
  const provider = isDemoMode ? 'demo' : 'unavailable';

  return useQuery<BookingHistoryResult>({
    queryKey: ['bookings', userId ?? 'guest', 'history', provider],
    queryFn: () => resolveBookingHistorySnapshot({ userId, demoMode: isDemoMode }),
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useBookingHistoryTicket(bookingId: string) {
  const userId = useAuthStore((state) => state.user?.id);
  const provider = isDemoMode ? 'demo' : 'unavailable';

  return useQuery<BookingHistoryTicketResult>({
    queryKey: ['bookings', userId ?? 'guest', 'history', provider, bookingId, 'ticket'],
    queryFn: () => resolveBookingHistoryTicketSnapshot(
      bookingId,
      { userId, demoMode: isDemoMode },
    ),
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });
}
