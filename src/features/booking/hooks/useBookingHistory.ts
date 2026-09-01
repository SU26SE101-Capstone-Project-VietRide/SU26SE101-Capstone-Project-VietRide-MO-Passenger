/**
 * Direct Booking History query plus legacy demo-ticket detail boundary.
 *
 * Live ticket list data comes from `/bookings/history` and is user-scoped.
 * These guarded fixture helpers remain only for explicit demo callers and for
 * backward-compatible Digital Ticket routes that do not carry a live history
 * snapshot. BE still has no individual passenger ticket-detail endpoint.
 */
import { useEffect, useMemo } from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuthStore } from '../../auth/store/useAuthStore';
import { isDemoMode } from '@shared/constants/demoMode';
import { isUuid } from '@shared/utils/pathSegment';
import {
  bookingHistoryKeys,
  getBookingHistory,
  getRecentBookingHistoryItemsByIds,
  type BookingHistoryQuery,
} from '../api/bookingHistoryApi';
import {
  BOOKING_HISTORY_FIXTURE,
  getBookingHistoryTicketFixture,
  type BookingHistoryTicketDetail,
} from '../data/bookingHistoryFixture';
import type { BookingHistoryItem } from '../types/booking';
import {
  selectFresherBookingHistoryTicketSnapshot,
  upsertBookingHistoryTicketSnapshot,
} from '../utils/bookingHistoryCache';
import type { PassengerTicketHistoryItem } from '@features/profile/types';

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

export function useBookingHistory(
  query: Omit<BookingHistoryQuery, 'page'> = {},
  enabled = true,
) {
  const userId = useAuthStore((state) => state.user?.id);
  return useInfiniteQuery({
    queryKey: bookingHistoryKeys.list(userId ?? 'guest', query),
    queryFn: ({ pageParam, signal }) => getBookingHistory(
      { ...query, page: pageParam },
      signal,
    ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasNextPage
      ? lastPage.page + 1
      : undefined,
    enabled: enabled && Boolean(userId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
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

export function useBookingHistoryTicketSnapshot(
  bookingId: string,
  initialItem?: PassengerTicketHistoryItem,
): PassengerTicketHistoryItem | null {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => bookingHistoryKeys.ticketSnapshot(userId ?? 'guest', bookingId),
    [bookingId, userId],
  );
  const snapshotQuery = useQuery<PassengerTicketHistoryItem | null>({
    queryKey,
    queryFn: async () => initialItem ?? null,
    initialData: initialItem ?? null,
    enabled: false,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!userId || initialItem?.id !== bookingId) return;
    upsertBookingHistoryTicketSnapshot(queryClient, userId, initialItem);
  }, [bookingId, initialItem, queryClient, userId]);

  return selectFresherBookingHistoryTicketSnapshot(
    snapshotQuery.data,
    initialItem,
  );
}

const REPLACEMENT_TRIP_REFRESH_MS = 15_000;

/**
 * After a vehicle substitution, Booking History is the Passenger-owned source
 * for the booking's current trip. Poll only while the old disrupted trip still
 * appears, then stop as soon as BE projects the replacement trip.
 */
export function useBookingReplacementTrip(
  bookingId: string,
  sourceTripId: string,
  enabled = true,
) {
  const userId = useAuthStore((state) => state.user?.id);
  const hasValidIds = isUuid(bookingId) && isUuid(sourceTripId);

  return useQuery<PassengerTicketHistoryItem | null>({
    queryKey: bookingHistoryKeys.replacementTrip(
      userId ?? 'guest',
      bookingId,
      sourceTripId,
    ),
    queryFn: async ({ signal }) => {
      const items = await getRecentBookingHistoryItemsByIds([bookingId], signal);
      return items.find(item => item.id === bookingId) ?? null;
    },
    enabled: enabled && Boolean(userId) && hasValidIds,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchInterval: (query) => {
      const item = query.state.data;
      return item && item.tripId !== sourceTripId
        ? false
        : REPLACEMENT_TRIP_REFRESH_MS;
    },
  });
}
