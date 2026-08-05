import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { StationDetail } from '../types';

const mockGetStation = jest.fn<
  Promise<StationDetail>,
  [string, AbortSignal?]
>();

jest.mock('../api/stationApi', () => ({
  stationKeys: {
    detail: (stationId: string) => ['stations', 'detail', stationId] as const,
  },
  getStation: (stationId: string, signal?: AbortSignal) =>
    mockGetStation(stationId, signal),
}));

import { useStationDetail } from './useStationDetail';

const STATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const stationDetail: StationDetail = {
  id: STATION_ID,
  name: 'Bến xe Miền Tây',
  slug: 'ben-xe-mien-tay',
  addressStreet: '395 Kinh Dương Vương',
  locationId: null,
  city: 'Hồ Chí Minh',
  ward: 'Phường An Lạc',
  latitude: 10.741,
  longitude: 106.619,
  contactPhone: null,
  contactEmail: null,
  operatingHours: null,
  facilities: null,
  supportsShuttle: true,
  isActive: true,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-15T00:00:00Z',
};

const flushAsyncWork = async (): Promise<void> => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

describe('useStationDetail', () => {
  let queryClient: QueryClient;
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  function Harness({
    stationId = STATION_ID,
    enabled = true,
  }: {
    stationId?: string;
    enabled?: boolean;
  }): null {
    useStationDetail(stationId, enabled);
    return null;
  }

  const tree = (
    stationId = STATION_ID,
    enabled = true,
    duplicate = false,
  ): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>
      <Harness stationId={stationId} enabled={enabled} />
      {duplicate ? (
        <Harness stationId={stationId} enabled={enabled} />
      ) : null}
    </QueryClientProvider>
  );

  beforeEach(() => {
    renderer = undefined;
    mockGetStation.mockReset();
    mockGetStation.mockResolvedValue(stationDetail);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => renderer?.unmount());
    }
    queryClient.clear();
  });

  it('deduplicates concurrent consumers and reuses fresh cached metadata', async () => {
    await act(async () => {
      renderer = ReactTestRenderer.create(tree(STATION_ID, true, true));
      await flushAsyncWork();
    });

    expect(mockGetStation).toHaveBeenCalledTimes(1);
    expect(mockGetStation).toHaveBeenCalledWith(
      STATION_ID,
      expect.any(AbortSignal),
    );

    await act(async () => renderer?.unmount());
    renderer = undefined;

    await act(async () => {
      renderer = ReactTestRenderer.create(tree());
      await flushAsyncWork();
    });

    expect(mockGetStation).toHaveBeenCalledTimes(1);
  });

  it('does not request invalid or explicitly disabled station ids', async () => {
    await act(async () => {
      renderer = ReactTestRenderer.create(tree('not-a-uuid'));
      await flushAsyncWork();
    });

    expect(mockGetStation).not.toHaveBeenCalled();

    await act(async () => {
      renderer?.update(tree(STATION_ID, false));
      await flushAsyncWork();
    });

    expect(mockGetStation).not.toHaveBeenCalled();
  });

  it('cancels a pending request after the final consumer unmounts', async () => {
    let requestSignal: AbortSignal | undefined;
    mockGetStation.mockImplementation((_stationId, signal) => {
      requestSignal = signal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        });
      });
    });

    await act(async () => {
      renderer = ReactTestRenderer.create(tree());
      await Promise.resolve();
    });

    expect(requestSignal?.aborted).toBe(false);

    await act(async () => renderer?.unmount());
    renderer = undefined;

    expect(requestSignal?.aborted).toBe(true);
  });
});
