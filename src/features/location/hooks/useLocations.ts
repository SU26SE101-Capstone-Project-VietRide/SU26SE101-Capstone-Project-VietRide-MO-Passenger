import { queryOptions, useQuery } from '@tanstack/react-query';
import { getLocations, locationKeys } from '../api/locationApi';

export const LOCATION_CATALOG_STALE_TIME_MS = 24 * 60 * 60 * 1000;
export const LOCATION_CATALOG_GC_TIME_MS = 7 * 24 * 60 * 60 * 1000;

export const locationCatalogQueryOptions = () =>
  queryOptions({
    queryKey: locationKeys.catalog(),
    queryFn: getLocations,
    staleTime: LOCATION_CATALOG_STALE_TIME_MS,
    gcTime: LOCATION_CATALOG_GC_TIME_MS,
    retry: 2,
    networkMode: 'offlineFirst',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

export function useLocations() {
  return useQuery(locationCatalogQueryOptions());
}
