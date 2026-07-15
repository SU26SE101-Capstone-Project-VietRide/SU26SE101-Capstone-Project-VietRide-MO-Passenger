import { queryOptions, useQuery } from '@tanstack/react-query';

import {
  bookingKeys,
  getPromotions,
} from '@features/booking/api/bookingApi';

export type HomePromotionService = 'BOOKING' | 'PARCEL';

const HOME_PROMOTIONS_STALE_TIME_MS = 5 * 60 * 1000;
const HOME_PROMOTIONS_GC_TIME_MS = 15 * 60 * 1000;

export const homePromotionsQueryOptions = (
  service: HomePromotionService = 'BOOKING',
) => queryOptions({
  queryKey: bookingKeys.promotions(service),
  queryFn: ({ signal }) => getPromotions(service, signal),
  staleTime: HOME_PROMOTIONS_STALE_TIME_MS,
  gcTime: HOME_PROMOTIONS_GC_TIME_MS,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
});

export function useHomePromotions(
  service: HomePromotionService = 'BOOKING',
) {
  return useQuery(homePromotionsQueryOptions(service));
}
