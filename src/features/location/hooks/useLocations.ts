import { useQuery } from '@tanstack/react-query';

import {
  getLocations,
  locationKeys,
  type ListLocationsParams,
} from '../api/locationApi';

export const LOCATION_STALE_MS = 24 * 60 * 60 * 1000;
export const LOCATION_GC_MS = 7 * 24 * 60 * 60 * 1000;

/** Roots: GET /v1/locations (no parentCode). */
export function useLocations(params: ListLocationsParams = {}) {
  const parentCode = params.parentCode?.trim() || undefined;
  const search = params.search?.trim() || undefined;
  const type = params.type;
  const queryParams: ListLocationsParams = {
    ...(parentCode ? { parentCode } : {}),
    ...(search ? { search } : {}),
    ...(type ? { type } : {}),
  };

  return useQuery({
    queryKey: locationKeys.list(queryParams),
    queryFn: ({ signal }) => getLocations(queryParams, signal),
    staleTime: LOCATION_STALE_MS,
    gcTime: LOCATION_GC_MS,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/** Children: GET /v1/locations?parentCode= */
export function useLocationChildren(parentCode: string | undefined) {
  const code = parentCode?.trim() ?? '';
  return useQuery({
    queryKey: locationKeys.list({ parentCode: code }),
    queryFn: ({ signal }) => getLocations({ parentCode: code }, signal),
    enabled: code.length > 0,
    staleTime: LOCATION_STALE_MS,
    gcTime: LOCATION_GC_MS,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
