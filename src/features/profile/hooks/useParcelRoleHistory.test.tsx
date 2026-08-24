import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  useParcelRoleHistory,
  type ParcelHistoryRole,
} from './useParcelRoleHistory';

const mockUseInfiniteQuery = jest.fn();
const mockGetReceivedParcels = jest.fn();
const mockGetSentParcels = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (options: unknown) => {
    mockUseInfiniteQuery(options);
    return {};
  },
}));

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'user-1' } }),
}));

jest.mock('@features/parcel/api/parcelApi', () => ({
  getReceivedParcels: (page: number, pageSize: number, signal: AbortSignal) =>
    mockGetReceivedParcels(page, pageSize, signal),
}));

jest.mock('@features/parcel/api/parcelReliabilityApi', () => ({
  getSentParcels: (
    query: { page: number; pageSize: number },
    signal: AbortSignal,
  ) => mockGetSentParcels(query, signal),
}));

interface CapturedInfiniteQueryOptions {
  queryKey: readonly unknown[];
  queryFn: (context: { pageParam: number; signal: AbortSignal }) => Promise<{
    items: unknown[];
  }>;
}

const QueryHarness = ({ role }: { role: ParcelHistoryRole }): null => {
  useParcelRoleHistory(role, 20);
  return null;
};

const emptyPage = {
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

describe('useParcelRoleHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSentParcels.mockResolvedValue(emptyPage);
    mockGetReceivedParcels.mockResolvedValue(emptyPage);
  });

  it('loads one unfiltered BE page for parcels sent by the passenger', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = ReactTestRenderer.create(<QueryHarness role="SENT" />);
    });

    const options = mockUseInfiniteQuery.mock
      .calls[0][0] as CapturedInfiniteQueryOptions;
    const signal = new AbortController().signal;
    const page = await options.queryFn({ pageParam: 1, signal });

    expect(options.queryKey).toEqual([
      'parcel-role-history',
      'user-1',
      'SENT',
      20,
    ]);
    expect(mockGetSentParcels).toHaveBeenCalledTimes(1);
    expect(mockGetSentParcels).toHaveBeenCalledWith(
      { page: 1, pageSize: 20 },
      signal,
    );
    expect(page.items).toEqual([]);

    await act(async () => renderer!.unmount());
  });

  it('loads the dedicated received endpoint without a status filter', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = ReactTestRenderer.create(<QueryHarness role="RECEIVED" />);
    });

    const options = mockUseInfiniteQuery.mock
      .calls[0][0] as CapturedInfiniteQueryOptions;
    const signal = new AbortController().signal;
    const page = await options.queryFn({ pageParam: 1, signal });

    expect(options.queryKey).toEqual([
      'parcel-role-history',
      'user-1',
      'RECEIVED',
      20,
    ]);
    expect(mockGetReceivedParcels).toHaveBeenCalledTimes(1);
    expect(mockGetReceivedParcels).toHaveBeenCalledWith(1, 20, signal);
    expect(mockGetSentParcels).not.toHaveBeenCalled();
    expect(page.items).toEqual([]);

    await act(async () => renderer!.unmount());
  });
});
