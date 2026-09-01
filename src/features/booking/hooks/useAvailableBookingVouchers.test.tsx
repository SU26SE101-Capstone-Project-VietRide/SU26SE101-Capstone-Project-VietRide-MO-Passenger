import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { AvailableVoucherItem } from '../types';
import {
  BOOKING_VOUCHER_REFRESH_INTERVAL_MS,
  useAvailableBookingVouchers,
  type VoucherPreviewLeg,
} from './useAvailableBookingVouchers';

const mockUseQuery = jest.fn();
const mockGetAvailableVouchers = jest.fn();
let mockFocused = true;
let mockAppActive = true;
let mockUserId: string | undefined = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockFocused,
}));

jest.mock('@shared/hooks', () => ({
  useIsAppActive: () => mockAppActive,
}));

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } | null }) => unknown) =>
    selector({ user: mockUserId ? { id: mockUserId } : null }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => {
    mockUseQuery(options);
    return {};
  },
}));

jest.mock('../api/bookingApi', () => ({
  bookingKeys: {
    availableVouchers: (userId: string, params: unknown) => [
      'bookings',
      userId,
      'vouchers',
      'available',
      params,
    ],
  },
  getAvailableVouchers: (params: unknown, signal?: AbortSignal) =>
    mockGetAvailableVouchers(params, signal),
}));

interface CapturedQueryOptions {
  enabled: boolean;
  staleTime: number;
  gcTime: number;
  refetchOnMount: 'always';
  refetchOnReconnect: 'always';
  refetchInterval: number | false;
  refetchIntervalInBackground: boolean;
  queryFn: (context: { signal: AbortSignal }) => Promise<AvailableVoucherItem[]>;
}

const defaultLegs: VoucherPreviewLeg[] = [
  {
    tripId: '11111111-1111-4111-8111-111111111111',
    orderAmount: 250_000,
  },
];

function Harness({ legs = defaultLegs }: { legs?: VoucherPreviewLeg[] }): null {
  useAvailableBookingVouchers({
    legs,
    paymentMethod: 'VNPAY',
  });
  return null;
}

const latestOptions = (): CapturedQueryOptions =>
  mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0] as CapturedQueryOptions;

describe('useAvailableBookingVouchers freshness', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFocused = true;
    mockAppActive = true;
    mockUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    mockGetAvailableVouchers.mockResolvedValue([]);
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => renderer?.unmount());
    }
  });

  it('treats voucher availability as volatile while payment is visible', async () => {
    await act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
    });

    expect(latestOptions()).toMatchObject({
      enabled: true,
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      refetchOnMount: 'always',
      refetchOnReconnect: 'always',
      refetchInterval: BOOKING_VOUCHER_REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: false,
    });
  });

  it('stops fetching when the booking screen is hidden or the app is backgrounded', async () => {
    mockFocused = false;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
    });

    expect(latestOptions()).toMatchObject({
      enabled: false,
      refetchInterval: false,
    });

    mockFocused = true;
    mockAppActive = false;
    await act(async () => {
      renderer!.update(<Harness />);
    });

    expect(latestOptions()).toMatchObject({
      enabled: false,
      refetchInterval: false,
    });
  });

  it('fetches each round-trip leg and merges shared voucher discounts', async () => {
    mockGetAvailableVouchers
      .mockResolvedValueOnce([
        {
          id: 'voucher-outbound',
          code: 'ROUNDTRIP',
          title: 'Round trip',
          description: 'Outbound discount',
          discountAmount: 20_000,
          minOrderAmount: 100_000,
          validUntil: '2026-09-20T00:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'voucher-return',
          code: 'roundtrip',
          title: 'Round trip',
          description: 'Return discount',
          discountAmount: 30_000,
          minOrderAmount: 100_000,
          validUntil: '2026-09-18T00:00:00.000Z',
        },
      ]);

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <Harness
          legs={[
            defaultLegs[0],
            {
              tripId: '22222222-2222-4222-8222-222222222222',
              orderAmount: 300_000,
            },
          ]}
        />,
      );
    });

    const signal = new AbortController().signal;
    const result = await latestOptions().queryFn({ signal });

    expect(mockGetAvailableVouchers).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      code: 'ROUNDTRIP',
      discountAmount: 50_000,
      validUntil: '2026-09-18T00:00:00.000Z',
    });
  });
});
