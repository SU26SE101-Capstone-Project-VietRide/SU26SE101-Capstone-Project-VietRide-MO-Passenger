/**
 * Legacy demo-ticket provider boundary.
 *
 * Live list data now belongs to the unified passenger-history facade hook.
 * These guarded fixture helpers remain only for explicit demo callers and for
 * backward-compatible Digital Ticket routes that do not carry a live history
 * snapshot. BE still has no individual passenger ticket-detail endpoint.
 */
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../auth/store/useAuthStore';
import { usePassengerHistory } from '@features/profile/hooks/usePassengerHistory';
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
  return usePassengerHistory({ type: 'TICKET' });
}

export function useBookingHistoryTicket(bookingId: string, enabled = true) {
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
    enabled,
  });
}
