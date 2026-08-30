import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ApiRequestError } from '@shared/api/errors';
import type { PassengerTicketHistoryItem } from '@features/profile/types';
import type { BookingResult, BookingStatusResult } from '../types';
import { BOOKING_PAYMENT_POLL_DELAYS_MS } from '../utils/bookingPayment';
import {
  useBookingPaymentReconciliation,
  type BookingPaymentReconciliationState,
} from './useBookingPaymentReconciliation';

const mockGetBookingStatus = jest.fn<
  Promise<BookingStatusResult>,
  [string, AbortSignal?]
>();
const mockGetRecentBookingHistoryItemsByIds = jest.fn<
  Promise<PassengerTicketHistoryItem[]>,
  [readonly string[], AbortSignal?]
>();
let mockFocused = true;
let mockOnline = true;
let mockAppActive = true;
let mockUserId: string | undefined = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key === 'errors.api.forbidden'
      ? 'You do not have permission to access this information.'
      : key,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockFocused,
}));

jest.mock('@shared/hooks', () => ({
  useIsAppActive: () => mockAppActive,
  useNetworkStatus: () => mockOnline,
}));

const mockPaymentBackRemove = jest.fn();
const mockPaymentBackHandler: { current?: () => void } = {};

jest.mock('@shared/payments', () => ({
  addVnPaySdkPaymentBackListener: (handler: () => void) => {
    mockPaymentBackHandler.current = handler;
    return { remove: mockPaymentBackRemove };
  },
}));

jest.mock('@features/auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } | null }) => unknown) =>
    selector({ user: mockUserId ? { id: mockUserId } : null }),
}));

jest.mock('../api/bookingApi', () => ({
  bookingKeys: {
    paymentStatus: (userId: string, bookingIds: readonly string[]) => [
      'bookings',
      userId,
      'payment-status',
      ...bookingIds,
    ],
  },
  getBookingStatus: (bookingId: string, signal?: AbortSignal) =>
    mockGetBookingStatus(bookingId, signal),
}));

jest.mock('../api/bookingHistoryApi', () => ({
  bookingHistoryKeys: {
    paymentRefresh: (userId: string, bookingIds: readonly string[]) => [
      'bookings',
      'history',
      userId,
      'payment-refresh',
      ...bookingIds,
    ],
  },
  getRecentBookingHistoryItemsByIds: (
    bookingIds: readonly string[],
    signal?: AbortSignal,
  ) => mockGetRecentBookingHistoryItemsByIds(bookingIds, signal),
}));

const pendingBooking: BookingResult = {
  bookingId: '11111111-1111-4111-8111-111111111111',
  bookingCode: 'VR-PENDING',
  status: 'PENDING_PAYMENT',
  totalAmount: 250_000,
  discountAmount: 0,
  paymentId: '22222222-2222-4222-8222-222222222222',
  paymentRedirectUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  tickets: [],
};

const confirmedStatus: BookingStatusResult = {
  bookingId: pendingBooking.bookingId,
  status: 'CONFIRMED',
};
const pendingStatus: BookingStatusResult = {
  bookingId: pendingBooking.bookingId,
  status: 'PENDING_PAYMENT',
};
const freshHistoryItem: PassengerTicketHistoryItem = {
  id: pendingBooking.bookingId,
  code: pendingBooking.bookingCode,
  tripId: '44444444-4444-4444-8444-444444444444',
  createdAt: '2026-08-31T02:00:00.000Z',
  totalAmount: pendingBooking.totalAmount,
  originName: 'Ho Chi Minh City',
  destinationName: 'Da Lat',
  departureDateTime: '2026-09-01T01:00:00.000Z',
  estimatedArrivalTime: null,
  paymentRedirectUrl: null,
  trackingTarget: null,
  type: 'TICKET',
  status: 'CONFIRMED',
  ticket: {
    bookingGroupId: null,
    tripDirection: 'OUTBOUND',
    routeName: 'Ho Chi Minh City - Da Lat',
    tickets: [{
      ticketId: '55555555-5555-4555-8555-555555555555',
      ticketCode: 'VR-FRESH-1',
      seatNumber: 'A01',
      status: 'ISSUED',
      paidAmount: pendingBooking.totalAmount,
    }],
    vehicle: null,
    shuttleRequests: [],
  },
  parcel: null,
};
const staleHistoryItem: PassengerTicketHistoryItem = {
  ...freshHistoryItem,
  status: 'PENDING_PAYMENT',
  paymentRedirectUrl: pendingBooking.paymentRedirectUrl,
  ticket: {
    ...freshHistoryItem.ticket,
    tickets: freshHistoryItem.ticket.tickets.map(ticket => ({
      ...ticket,
      status: 'PENDING_PAYMENT',
      paidAmount: 0,
    })),
  },
};

const secondPendingBooking: BookingResult = {
  ...pendingBooking,
  bookingId: '33333333-3333-4333-8333-333333333333',
  bookingCode: 'VR-SECOND',
};

const flushAsyncWork = async (): Promise<void> => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

describe('useBookingPaymentReconciliation lifecycle', () => {
  let latest: BookingPaymentReconciliationState | undefined;
  let queryClient: QueryClient;
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  function Harness({ result = pendingBooking }: { result?: BookingResult }): null {
    latest = useBookingPaymentReconciliation(result);
    return null;
  }

  const tree = (result = pendingBooking): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>
      <Harness result={result} />
    </QueryClientProvider>
  );

  beforeEach(() => {
    latest = undefined;
    renderer = undefined;
    mockFocused = true;
    mockOnline = true;
    mockAppActive = true;
    mockUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    mockGetBookingStatus.mockReset();
    mockGetRecentBookingHistoryItemsByIds.mockReset();
    mockGetRecentBookingHistoryItemsByIds.mockResolvedValue([]);
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

  it('coalesces auto and manual checks into one request, then confirms', async () => {
    let resolveStatus: ((value: BookingStatusResult) => void) | undefined;
    mockGetBookingStatus.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );

    await act(async () => {
      renderer = ReactTestRenderer.create(tree());
      await Promise.resolve();
    });

    const first = latest!.checkNow();
    const second = latest!.checkNow();
    expect(second).toBe(first);
    expect(mockGetBookingStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveStatus?.(confirmedStatus);
      await Promise.all([first, second]);
      await flushAsyncWork();
    });

    expect(latest?.phase).toBe('confirmed');
    expect(latest?.isChecking).toBe(false);
  });

  it('fetches the full fresh history DTO after payment confirms and replaces detail cache', async () => {
    let resolveFreshHistory: ((items: PassengerTicketHistoryItem[]) => void) | undefined;
    mockGetBookingStatus.mockResolvedValue(confirmedStatus);
    mockGetRecentBookingHistoryItemsByIds.mockReturnValue(new Promise(resolve => {
      resolveFreshHistory = resolve;
    }));
    const snapshotKey = [
      'bookings',
      'history',
      mockUserId,
      'ticket-snapshot',
      pendingBooking.bookingId,
    ];
    queryClient.setQueryData(snapshotKey, staleHistoryItem);

    await act(async () => {
      renderer = ReactTestRenderer.create(tree());
      await flushAsyncWork();
    });

    expect(queryClient.getQueryData(snapshotKey)).toEqual(staleHistoryItem);

    await act(async () => {
      resolveFreshHistory?.([freshHistoryItem]);
      await flushAsyncWork();
      await flushAsyncWork();
    });

    expect(mockGetRecentBookingHistoryItemsByIds).toHaveBeenCalledWith(
      [pendingBooking.bookingId],
      expect.any(AbortSignal),
    );
    expect(latest?.freshHistoryItems).toEqual([freshHistoryItem]);
    expect(queryClient.getQueryData(snapshotKey)).toEqual(freshHistoryItem);
  });

  it('keeps a focused pending ticket fresh after the bounded return poll ends', async () => {
    jest.useFakeTimers();
    let requestCount = 0;
    mockGetBookingStatus.mockImplementation(async () => {
      requestCount += 1;
      return requestCount <= 8 ? pendingStatus : confirmedStatus;
    });

    try {
      await act(async () => {
        renderer = ReactTestRenderer.create(tree());
        await Promise.resolve();
      });

      expect(mockGetBookingStatus).toHaveBeenCalledTimes(1);

      for (const delayMs of BOOKING_PAYMENT_POLL_DELAYS_MS.slice(1)) {
        await act(async () => {
          await jest.advanceTimersByTimeAsync(delayMs);
        });
      }

      expect(mockGetBookingStatus).toHaveBeenCalledTimes(8);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(5_000);
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

      expect(mockGetBookingStatus).toHaveBeenCalledTimes(9);
      expect(queryClient.getQueryData([
        'bookings',
        mockUserId,
        'payment-status',
        pendingBooking.bookingId,
      ])).toEqual([confirmedStatus]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('starts a fresh bounded check when VNPay returns during an older poll', async () => {
    let firstRequestAborted = false;
    mockGetBookingStatus
      .mockImplementationOnce((_bookingId, signal) => new Promise(
        (_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            firstRequestAborted = true;
            reject(new Error('Cancelled stale pre-return poll.'));
          });
        },
      ))
      .mockResolvedValueOnce(confirmedStatus);

    await act(async () => {
      renderer = ReactTestRenderer.create(tree());
      await Promise.resolve();
    });
    expect(mockGetBookingStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      mockPaymentBackHandler.current?.();
      await flushAsyncWork();
    });

    expect(firstRequestAborted).toBe(true);
    expect(mockGetBookingStatus).toHaveBeenCalledTimes(2);
    expect(latest?.phase).toBe('confirmed');
  });

  it('waits offline and starts exactly once after connectivity returns', async () => {
    mockOnline = false;
    mockGetBookingStatus.mockResolvedValue(confirmedStatus);

    await act(async () => {
      renderer = ReactTestRenderer.create(tree());
      await flushAsyncWork();
    });
    expect(mockGetBookingStatus).not.toHaveBeenCalled();

    mockOnline = true;
    await act(async () => {
      renderer!.update(tree());
      await flushAsyncWork();
    });

    expect(mockGetBookingStatus).toHaveBeenCalledTimes(1);
    expect(latest?.phase).toBe('confirmed');
  });

  it('starts exactly once when the app returns to the foreground', async () => {
    mockAppActive = false;
    mockGetBookingStatus.mockResolvedValue(confirmedStatus);

    await act(async () => {
      renderer = ReactTestRenderer.create(tree());
      await flushAsyncWork();
    });
    expect(mockGetBookingStatus).not.toHaveBeenCalled();

    mockAppActive = true;
    await act(async () => {
      renderer!.update(tree());
      await flushAsyncWork();
    });

    expect(mockGetBookingStatus).toHaveBeenCalledTimes(1);
    expect(latest?.phase).toBe('confirmed');
  });

  it('aborts the active request when the screen loses focus', async () => {
    let wasAborted = false;
    mockGetBookingStatus.mockImplementation((_bookingId, signal) => new Promise(
      (_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          wasAborted = true;
          reject(new Error('Query aborted.'));
        });
      },
    ));

    await act(async () => {
      renderer = ReactTestRenderer.create(tree());
      await Promise.resolve();
    });
    expect(mockGetBookingStatus).toHaveBeenCalledTimes(1);

    mockFocused = false;
    await act(async () => {
      renderer!.update(tree());
      await flushAsyncWork();
    });

    expect(wasAborted).toBe(true);
    expect(mockGetBookingStatus).toHaveBeenCalledTimes(1);
    expect(latest?.isChecking).toBe(false);
  });

  it('does not reuse a previous user or booking status cache', async () => {
    mockGetBookingStatus.mockImplementation(async (bookingId) => ({
      bookingId,
      status: 'CONFIRMED',
    }));

    await act(async () => {
      renderer = ReactTestRenderer.create(tree());
      await flushAsyncWork();
    });
    expect(latest?.phase).toBe('confirmed');

    mockUserId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    await act(async () => {
      renderer!.update(tree(secondPendingBooking));
      await flushAsyncWork();
    });

    expect(mockGetBookingStatus.mock.calls.map(([bookingId]) => bookingId)).toEqual([
      pendingBooking.bookingId,
      secondPendingBooking.bookingId,
    ]);
    expect(latest?.phase).toBe('confirmed');
  });

  it('fails closed when the backend rejects ownership', async () => {
    mockGetBookingStatus.mockRejectedValue(new ApiRequestError({
      message: 'You cannot access this booking.',
      code: 'FORBIDDEN',
      statusCode: 403,
    }));

    await act(async () => {
      renderer = ReactTestRenderer.create(tree());
      await flushAsyncWork();
    });

    expect(mockGetBookingStatus).toHaveBeenCalledTimes(1);
    expect(latest?.phase).toBe('unavailable');
    expect(latest?.errorMessage).toBe(
      'You do not have permission to access this information.',
    );
  });
});
