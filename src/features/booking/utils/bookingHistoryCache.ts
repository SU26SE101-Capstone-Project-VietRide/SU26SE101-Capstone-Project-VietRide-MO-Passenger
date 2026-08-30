import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { bookingHistoryKeys } from '../api/bookingHistoryKeys';
import type {
  PassengerHistoryPage,
  PassengerTicketHistoryItem,
} from '@features/profile/types';

type BookingHistoryInfiniteData = InfiniteData<
  PassengerHistoryPage<PassengerTicketHistoryItem>,
  number
>;

const isPendingPayment = (
  item: PassengerTicketHistoryItem | null | undefined,
): boolean => item?.status.trim().toUpperCase() === 'PENDING_PAYMENT';

/**
 * Payment status is monotonic: a stale pending snapshot must never replace a
 * snapshot that has already moved to a terminal/active state.
 */
export const selectFresherBookingHistoryTicketSnapshot = (
  current: PassengerTicketHistoryItem | null | undefined,
  incoming: PassengerTicketHistoryItem | null | undefined,
): PassengerTicketHistoryItem | null => {
  if (!current) return incoming ?? null;
  if (!incoming) return current;
  if (current.id !== incoming.id) return incoming;

  if (!isPendingPayment(current) && isPendingPayment(incoming)) {
    return current;
  }

  return incoming;
};

export const upsertBookingHistoryTicketSnapshot = (
  queryClient: QueryClient,
  userId: string,
  item: PassengerTicketHistoryItem,
): void => {
  queryClient.setQueryData<PassengerTicketHistoryItem | null>(
    bookingHistoryKeys.ticketSnapshot(userId, item.id),
    current => selectFresherBookingHistoryTicketSnapshot(current, item),
  );
};

export const updateBookingHistoryTicketCaches = (
  queryClient: QueryClient,
  userId: string,
  bookingId: string,
  update: (
    item: PassengerTicketHistoryItem,
  ) => PassengerTicketHistoryItem,
): void => {
  queryClient.setQueryData<PassengerTicketHistoryItem | null>(
    bookingHistoryKeys.ticketSnapshot(userId, bookingId),
    current => current ? update(current) : current,
  );

  queryClient.setQueriesData<BookingHistoryInfiniteData>(
    {
      queryKey: bookingHistoryKeys.user(userId),
      predicate: query => query.queryKey[3] !== 'ticket-snapshot',
    },
    current => {
      if (!current || !Array.isArray(current.pages)) return current;
      let changed = false;
      const pages = current.pages.map(page => {
        let pageChanged = false;
        const items = page.items.map(item => {
          if (item.id !== bookingId) return item;
          const next = update(item);
          if (next !== item) {
            changed = true;
            pageChanged = true;
          }
          return next;
        });
        return pageChanged ? { ...page, items } : page;
      });
      return changed ? { ...current, pages } : current;
    },
  );
};

/** Replaces both detail and list snapshots with a fresh BE history item. */
export const upsertBookingHistoryTicketEverywhere = (
  queryClient: QueryClient,
  userId: string,
  item: PassengerTicketHistoryItem,
): void => {
  upsertBookingHistoryTicketSnapshot(queryClient, userId, item);
  updateBookingHistoryTicketCaches(
    queryClient,
    userId,
    item.id,
    current => selectFresherBookingHistoryTicketSnapshot(current, item) ?? current,
  );
};
