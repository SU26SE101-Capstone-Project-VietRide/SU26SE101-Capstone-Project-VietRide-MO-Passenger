import { useIsFocused } from '@react-navigation/native';
import { queryOptions, useQuery } from '@tanstack/react-query';

import {
  bookingKeys,
  getPromotions,
} from '@features/booking/api/bookingApi';
import { useIsAppActive } from '@shared/hooks';

export type HomePromotionService = 'BOOKING' | 'PARCEL';

const HOME_PROMOTIONS_GC_TIME_MS = 15 * 60 * 1000;

export const HOME_PROMOTIONS_REFRESH_INTERVAL_MS = 60 * 1000;

export const homePromotionsQueryOptions = (
  service: HomePromotionService = 'BOOKING',
  canFetch = true,
) => queryOptions({
  queryKey: bookingKeys.promotions(service),
  queryFn: ({ signal }) => getPromotions(service, signal),
  enabled: canFetch,
  staleTime: 0,
  gcTime: HOME_PROMOTIONS_GC_TIME_MS,
  retry: 1,
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  refetchOnReconnect: 'always',
  refetchInterval: canFetch ? HOME_PROMOTIONS_REFRESH_INTERVAL_MS : false,
  refetchIntervalInBackground: false,
});

export function useHomePromotions(
  service: HomePromotionService = 'BOOKING',
) {
  const isFocused = useIsFocused();
  const isAppActive = useIsAppActive();
  const canFetch = isFocused && isAppActive;

  return useQuery(homePromotionsQueryOptions(service, canFetch));
}
