import { toVietnamBusinessDate } from '@shared/utils/apiTime';

import { toTripSearchDate } from './searchParams';

export type HomeTicketSearchContinuation =
  | 'select_departure'
  | 'select_return'
  | 'search';

interface ResolveHomeTicketSearchContinuationInput {
  departureDate: string;
  returnDate?: string;
  isRoundTrip: boolean;
  now?: Date;
}

export const resolveHomeTicketSearchContinuation = ({
  departureDate,
  returnDate,
  isRoundTrip,
  now = new Date(),
}: ResolveHomeTicketSearchContinuationInput): HomeTicketSearchContinuation => {
  const today = toVietnamBusinessDate(now);
  let normalizedDepartureDate: string;

  try {
    normalizedDepartureDate = toTripSearchDate(departureDate, now);
  } catch {
    return 'select_departure';
  }

  if (normalizedDepartureDate < today) return 'select_departure';
  if (!isRoundTrip) return 'search';

  let normalizedReturnDate: string;
  try {
    normalizedReturnDate = toTripSearchDate(returnDate ?? '', now);
  } catch {
    return 'select_return';
  }

  return normalizedReturnDate < normalizedDepartureDate
    ? 'select_return'
    : 'search';
};
