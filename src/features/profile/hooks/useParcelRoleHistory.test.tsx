import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { ParcelStatus } from '@features/parcel/types';
import type { ParcelHistoryFilter } from '../config/passengerHistoryFilters';
import {
  useParcelRoleHistory,
  type ParcelHistoryRole,
} from './useParcelRoleHistory';

const mockUseInfiniteQuery = jest.fn();
const mockGetReceivedParcels = jest.fn();
const mockGetSentParcels = jest.fn();

jest.mock('../api/passengerHistoryApi', () => ({
  passengerHistoryKeys: {
    all: ['passenger-history'] as const,
    user: (userId: string) => ['passenger-history', userId] as const,
  },
}));

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
    query: { status?: ParcelStatus; page: number; pageSize: number },
    signal: AbortSignal,
  ) => mockGetSentParcels(query, signal),
}));

jest.mock('../utils/parcelHistoryAdapter', () => ({
  mapSentParcelToHistoryItem: (item: {
    parcelId: string;
    createdAt: string;
  }) => ({
    ...item,
    id: item.parcelId,
    type: 'PARCEL',
  }),
  mapReceivedParcelToHistoryItem: (item: {
    parcelId: string;
    createdAt: string;
  }) => ({
    ...item,
    id: item.parcelId,
    type: 'PARCEL',
  }),
}));

interface CapturedInfiniteQueryOptions {
  queryKey: readonly unknown[];
  queryFn: (context: { pageParam: number; signal: AbortSignal }) => Promise<{
    items: Array<{ id: string; createdAt: string }>;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>;
}

const QueryHarness = ({
  role,
  filter,
}: {
  role: ParcelHistoryRole;
  filter: ParcelHistoryFilter;
}): null => {
  useParcelRoleHistory(role, filter, 20);
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

const sentPage = (
  items: Array<{ parcelId: string; createdAt: string }>,
  overrides: Partial<typeof emptyPage> = {},
) => ({
  ...emptyPage,
  ...overrides,
  items,
  totalItems: overrides.totalItems ?? items.length,
});

describe('useParcelRoleHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSentParcels.mockResolvedValue(emptyPage);
    mockGetReceivedParcels.mockResolvedValue(emptyPage);
  });

  it('loads one unfiltered BE page when the sent group is All', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryHarness role="SENT" filter="ALL" />,
      );
    });

    const options = mockUseInfiniteQuery.mock
      .calls[0][0] as CapturedInfiniteQueryOptions;
    const signal = new AbortController().signal;
    await options.queryFn({ pageParam: 1, signal });

    expect(options.queryKey).toEqual([
      'passenger-history',
      'user-1',
      'PARCEL_ROLE',
      'SENT',
      'ALL',
      20,
    ]);
    expect(mockGetSentParcels).toHaveBeenCalledTimes(1);
    expect(mockGetSentParcels).toHaveBeenCalledWith(
      { page: 1, pageSize: 20 },
      signal,
    );

    await act(async () => renderer!.unmount());
  });

  it('fans Needs action out to three current statuses and merges deterministically', async () => {
    mockGetSentParcels.mockImplementation(
      ({ status }: { status?: ParcelStatus }) => {
        switch (status) {
          case 'PENDING_PAYMENT':
            return Promise.resolve(
              sentPage(
                [
                  { parcelId: 'a', createdAt: '2026-08-24T10:00:00Z' },
                  { parcelId: 'shared', createdAt: '2026-08-24T09:00:00Z' },
                ],
                { totalPages: 2, hasNextPage: true },
              ),
            );
          case 'PENDING_FINAL_PAYMENT':
            return Promise.resolve(
              sentPage([
                { parcelId: 'b', createdAt: '2026-08-24T11:00:00Z' },
                { parcelId: 'shared', createdAt: '2026-08-24T09:00:00Z' },
              ]),
            );
          case 'PENDING_OPERATOR_ACTION':
            return Promise.resolve(
              sentPage([{ parcelId: 'c', createdAt: '2026-08-24T08:00:00Z' }]),
            );
          default:
            throw new Error(`Unexpected status: ${String(status)}`);
        }
      },
    );

    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryHarness role="SENT" filter="NEEDS_ACTION" />,
      );
    });

    const options = mockUseInfiniteQuery.mock
      .calls[0][0] as CapturedInfiniteQueryOptions;
    const signal = new AbortController().signal;
    const page = await options.queryFn({ pageParam: 1, signal });
    const requestedStatuses = mockGetSentParcels.mock.calls.map(
      ([query]) => query.status,
    );

    expect(options.queryKey).toEqual([
      'passenger-history',
      'user-1',
      'PARCEL_ROLE',
      'SENT',
      'NEEDS_ACTION',
      20,
    ]);
    expect(requestedStatuses).toEqual([
      'PENDING_PAYMENT',
      'PENDING_FINAL_PAYMENT',
      'PENDING_OPERATOR_ACTION',
    ]);
    expect(requestedStatuses).not.toEqual(
      expect.arrayContaining([
        'PENDING_OPERATOR_REVIEW',
        'PENDING',
        'PENDING_ADDITIONAL_PAYMENT',
      ]),
    );
    expect(mockGetSentParcels).toHaveBeenCalledTimes(3);
    expect(page.items.map(item => item.id)).toEqual(['b', 'a', 'shared', 'c']);
    expect(page).toMatchObject({
      page: 1,
      pageSize: 20,
      totalItems: 5,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });

    await act(async () => renderer!.unmount());
  });

  it('uses one exact request for a single-status group', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryHarness role="SENT" filter="DELIVERED" />,
      );
    });

    const options = mockUseInfiniteQuery.mock
      .calls[0][0] as CapturedInfiniteQueryOptions;
    const signal = new AbortController().signal;
    await options.queryFn({ pageParam: 1, signal });

    expect(mockGetSentParcels).toHaveBeenCalledTimes(1);
    expect(mockGetSentParcels).toHaveBeenCalledWith(
      {
        status: 'DELIVERY_CONFIRMED',
        page: 1,
        pageSize: 20,
      },
      signal,
    );

    await act(async () => renderer!.unmount());
  });

  it('loads Received once without applying the retained sent group', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryHarness role="RECEIVED" filter="NEEDS_ACTION" />,
      );
    });

    const options = mockUseInfiniteQuery.mock
      .calls[0][0] as CapturedInfiniteQueryOptions;
    const signal = new AbortController().signal;
    const page = await options.queryFn({ pageParam: 1, signal });

    expect(options.queryKey).toEqual([
      'passenger-history',
      'user-1',
      'PARCEL_ROLE',
      'RECEIVED',
      'unfiltered',
      20,
    ]);
    expect(mockGetReceivedParcels).toHaveBeenCalledTimes(1);
    expect(mockGetReceivedParcels).toHaveBeenCalledWith(1, 20, signal);
    expect(mockGetSentParcels).not.toHaveBeenCalled();
    expect(page.items).toEqual([]);

    await act(async () => renderer!.unmount());
  });
});
