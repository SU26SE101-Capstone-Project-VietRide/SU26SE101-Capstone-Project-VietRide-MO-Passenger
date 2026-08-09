import {
  compareLocalDates,
  parseLocalDate,
  startOfLocalDay,
  toLocalDisplayDate,
} from '@shared/utils/localDate';
import { normalizePromoCode } from '@shared/utils/promo';
import type {
  BookingEntryIntent,
  BookingSearchPrefill,
  SearchParams,
} from '../types';
import type { RecentSearch, RecentSearchInput } from '../hooks/useRecentSearches';
import { normalizeBookingSeatCount } from '../constants/bookingLimits';
import { toTripSearchDate } from './searchParams';

export type SearchDateResolution =
  | { status: 'valid'; date: string }
  | { status: 'past_date' | 'invalid_date' };

type BookingSearchSnapshot = SearchParams & {
  isRoundTrip?: boolean;
  returnDate?: string;
};

interface BookingEntryActions {
  resetFlowPreservingSearch: () => void;
  setVoucherCode: (code: string, discountPreview?: number) => void;
}

export const DEFAULT_BOOKING_ENTRY_INTENT: BookingEntryIntent = Object.freeze({
  type: 'search',
});

export const createBookingEntryKey = (
  searchParams: BookingSearchSnapshot,
  intent: BookingEntryIntent | undefined,
): string => JSON.stringify([
  searchParams.from,
  searchParams.to,
  searchParams.originLocationCode,
  searchParams.destinationLocationCode,
  searchParams.date,
  searchParams.passengers,
  Boolean(searchParams.isRoundTrip),
  searchParams.returnDate ?? '',
  intent?.type ?? 'search',
  intent?.type === 'promotion' ? intent.pendingVoucher.voucherId.trim() : '',
  intent?.type === 'promotion' ? normalizePromoCode(intent.pendingVoucher.code) : '',
]);

const relativeDateKeyword = (value: string): 'Today' | 'Tomorrow' | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'today') return 'Today';
  if (normalized === 'tomorrow') return 'Tomorrow';
  return null;
};

const resolveSearchDate = (
  value: string,
  referenceDate: Date,
  now: Date,
): SearchDateResolution => {
  try {
    const relativeKeyword = relativeDateKeyword(value);
    const isoDate = toTripSearchDate(relativeKeyword ?? value, relativeKeyword ? referenceDate : now);
    const parsedDate = parseLocalDate(isoDate);

    if (!parsedDate) return { status: 'invalid_date' };
    if (compareLocalDates(parsedDate, startOfLocalDay(now)) < 0) {
      return { status: 'past_date' };
    }

    return { status: 'valid', date: toLocalDisplayDate(parsedDate) };
  } catch {
    return { status: 'invalid_date' };
  }
};

export const resolveRecentSearchDate = (
  search: Pick<RecentSearch, 'date' | 'savedAt'>,
  now = new Date(),
): SearchDateResolution => {
  const relativeKeyword = relativeDateKeyword(search.date);
  if (relativeKeyword && (!Number.isFinite(search.savedAt) || search.savedAt <= 0)) {
    return { status: 'invalid_date' };
  }

  const savedAt = relativeKeyword ? new Date(search.savedAt) : now;
  if (Number.isNaN(savedAt.getTime())) return { status: 'invalid_date' };

  return resolveSearchDate(search.date, savedAt, now);
};

export const toRecentSearchInput = (
  searchParams: BookingSearchSnapshot,
  now = new Date(),
): RecentSearchInput | null => {
  const date = resolveSearchDate(searchParams.date, now, now);
  if (date.status !== 'valid') return null;

  const fromCode = searchParams.originLocationCode.trim();
  const toCode = searchParams.destinationLocationCode.trim();
  const fromName = (searchParams.originStationName || searchParams.from).trim();
  const toName = (searchParams.destinationStationName || searchParams.to).trim();

  if (!fromCode || !toCode || !fromName || !toName) return null;

  return {
    fromCode,
    fromName,
    toCode,
    toName,
    date: toTripSearchDate(date.date, now),
    passengers: normalizeBookingSeatCount(searchParams.passengers),
  };
};

export const recentSearchToPrefill = (
  search: RecentSearch,
  now = new Date(),
): { status: 'applied'; prefill: BookingSearchPrefill } | {
  status: 'past_date' | 'invalid_date';
} => {
  const date = resolveRecentSearchDate(search, now);
  if (date.status !== 'valid') return date;

  return {
    status: 'applied',
    prefill: {
      from: search.fromName,
      to: search.toName,
      originLocationCode: search.fromCode,
      destinationLocationCode: search.toCode,
      originStationId: '',
      destinationStationId: '',
      originStationName: '',
      destinationStationName: '',
      date: toTripSearchDate(date.date, now),
      passengers: search.passengers,
      isRoundTrip: false,
      returnDate: '',
    },
  };
};

/** Reset the transient flow first, then carry a pending promotion into the
 * existing Payment-screen voucher validation. No promotion is trusted here. */
export const initializeBookingEntry = (
  intent: BookingEntryIntent | undefined,
  actions: BookingEntryActions,
): void => {
  actions.resetFlowPreservingSearch();

  if (intent?.type !== 'promotion' || !intent.pendingVoucher.voucherId.trim()) return;

  const code = normalizePromoCode(intent.pendingVoucher.code);
  if (code) actions.setVoucherCode(code);
};
