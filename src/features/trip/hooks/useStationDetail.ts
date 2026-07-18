import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { isUuid } from '@shared/utils/pathSegment';
import { getStation, stationKeys } from '../api/stationApi';
import type { StationDetail } from '../types';

const STATION_DETAIL_STALE_TIME_MS = 10 * 60 * 1000;
const STATION_DETAIL_GC_TIME_MS = 30 * 60 * 1000;
const UNAVAILABLE_STATION_ID = 'unavailable';

export function useStationDetail(
  stationId: string | undefined,
  enabled = true,
): UseQueryResult<StationDetail, Error> {
  const canFetch = enabled && isUuid(stationId);

  return useQuery({
    queryKey: stationKeys.detail(
      canFetch ? stationId : UNAVAILABLE_STATION_ID,
    ),
    queryFn: ({ signal }) => getStation(stationId!, signal),
    enabled: canFetch,
    staleTime: STATION_DETAIL_STALE_TIME_MS,
    gcTime: STATION_DETAIL_GC_TIME_MS,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
