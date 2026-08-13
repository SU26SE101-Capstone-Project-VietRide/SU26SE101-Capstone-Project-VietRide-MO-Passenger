import { useCallback, useMemo } from 'react';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { useLocations } from '@features/location/hooks/useLocations';
import { resolvePopularRoutes } from '../data/popularRoutes';
import { useBookingStore } from '../store/useBookingStore';
import type { BookingSearchPrefill } from '../types';
import {
  recentSearchToPrefill,
  toRecentSearchInput,
} from '../utils/bookingDiscovery';
import { useRecentSearches } from './useRecentSearches';

export type DiscoveryActionResult =
  | 'applied'
  | 'not_found'
  | 'past_date'
  | 'invalid_date';

export function useBookingDiscovery() {
  const userId = useAuthStore((state) => state.user?.id);
  const applySearchPrefill = useBookingStore((state) => state.applySearchPrefill);
  const locationsQuery = useLocations();
  const popularRoutes = useMemo(
    () => resolvePopularRoutes(locationsQuery.data ?? []),
    [locationsQuery.data],
  );
  const recent = useRecentSearches(userId);
  const recentItems = recent.items;
  const saveRecentSearch = recent.saveSearch;

  const applyPrefill = useCallback((prefill: BookingSearchPrefill): void => {
    applySearchPrefill(prefill);
  }, [applySearchPrefill]);

  const applyPopularRoute = useCallback((
    originCode: string,
    destinationCode: string,
  ): DiscoveryActionResult => {
    const route = popularRoutes.find((item) => (
      item.originCode === originCode && item.destinationCode === destinationCode
    ));
    if (!route) return 'not_found';

    const current = useBookingStore.getState().searchParams;
    applyPrefill({
      ...current,
      from: route.originName,
      to: route.destinationName,
      originLocationCode: route.originCode,
      destinationLocationCode: route.destinationCode,
      originStationId: '',
      destinationStationId: '',
      originStationName: '',
      destinationStationName: '',
    });
    return 'applied';
  }, [applyPrefill, popularRoutes]);

  const applyRecentSearch = useCallback((searchId: string): DiscoveryActionResult => {
    const search = recentItems.find((item) => item.id === searchId);
    if (!search) return 'not_found';

    const result = recentSearchToPrefill(search);
    applyPrefill(result.prefill);
    return result.status;
  }, [applyPrefill, recentItems]);

  const saveCurrentSearch = useCallback(async (): Promise<DiscoveryActionResult> => {
    const input = toRecentSearchInput(useBookingStore.getState().searchParams);
    if (!input) return 'invalid_date';

    await saveRecentSearch(input);
    return 'applied';
  }, [saveRecentSearch]);

  return {
    popularRoutes,
    recentSearches: recent.items,
    recentSearchError: recent.error,
    recentSearchesLoading: recent.isLoading,
    popularRoutesLoading: locationsQuery.isLoading,
    popularRoutesError: locationsQuery.isError,
    applyPrefill,
    applyPopularRoute,
    applyRecentSearch,
    saveCurrentSearch,
    clearRecentSearches: recent.clearSearches,
  } as const;
}
