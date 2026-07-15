import type { BookingResult, BookingStatusResult, RoundTripResult } from '../types';
import { ApiRequestError } from '@shared/api/errors';
import {
  getBookingIds,
  isRetryableBookingStatusError,
  pollBookingPayment,
  resolveBookingPayment,
} from './bookingPayment';

const oneWayResult: BookingResult = {
  bookingId: '11111111-1111-4111-8111-111111111111',
  bookingCode: 'VR-ONE',
  status: 'PENDING_PAYMENT',
  totalAmount: 250_000,
  discountAmount: 0,
  paymentId: '22222222-2222-4222-8222-222222222222',
  paymentRedirectUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  tickets: [],
};

const roundTripResult: RoundTripResult = {
  bookingGroupId: '33333333-3333-4333-8333-333333333333',
  outbound: {
    bookingId: oneWayResult.bookingId,
    bookingCode: 'VR-OUT',
    totalAmount: 250_000,
    discountAmount: 0,
    tickets: [],
  },
  return: {
    bookingId: '44444444-4444-4444-8444-444444444444',
    bookingCode: 'VR-RETURN',
    totalAmount: 250_000,
    discountAmount: 0,
    tickets: [],
  },
  grandTotal: 500_000,
  paymentId: '55555555-5555-4555-8555-555555555555',
  status: 'PENDING_PAYMENT',
  paymentRedirectUrl: oneWayResult.paymentRedirectUrl,
};

const status = (
  bookingId: string,
  value: BookingStatusResult['status'],
): BookingStatusResult => ({ bookingId, status: value });

describe('booking payment reconciliation', () => {
  it('extracts every BE booking ID without using the display group ID', () => {
    expect(getBookingIds(oneWayResult)).toEqual([oneWayResult.bookingId]);
    expect(getBookingIds(roundTripResult)).toEqual([
      roundTripResult.outbound.bookingId,
      roundTripResult.return.bookingId,
    ]);
    expect(getBookingIds(null)).toEqual([]);
  });

  it('waits until every round-trip leg is confirmed', () => {
    expect(resolveBookingPayment([
      status(roundTripResult.outbound.bookingId, 'CONFIRMED'),
      status(roundTripResult.return.bookingId, 'PENDING_PAYMENT'),
    ]).phase).toBe('pending');

    expect(resolveBookingPayment([
      status(roundTripResult.outbound.bookingId, 'CONFIRMED'),
      status(roundTripResult.return.bookingId, 'CONFIRMED'),
    ]).phase).toBe('confirmed');
  });

  it('treats EXPIRED as a definitive checkout payment expiry', () => {
    expect(resolveBookingPayment([
      status(oneWayResult.bookingId, 'EXPIRED'),
    ])).toMatchObject({ phase: 'expired', terminalStatus: 'EXPIRED' });
  });

  it.each([
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
    'PARTIAL_NO_SHOW',
    'REFUNDED',
    'DISRUPTED',
  ] as const)(
    'keeps the later %s booking lifecycle separate from payment outcome',
    (terminalStatus) => {
      expect(resolveBookingPayment([
        status(oneWayResult.bookingId, terminalStatus),
      ])).toMatchObject({ phase: 'inactive', terminalStatus });
    },
  );

  it('uses bounded backoff and stops immediately after confirmation', async () => {
    const fetchResolution = jest
      .fn<Promise<ReturnType<typeof resolveBookingPayment>>, []>()
      .mockResolvedValueOnce(resolveBookingPayment([
        status(oneWayResult.bookingId, 'PENDING_PAYMENT'),
      ]))
      .mockResolvedValueOnce(resolveBookingPayment([
        status(oneWayResult.bookingId, 'CONFIRMED'),
      ]));
    const waitForDelay = jest.fn().mockResolvedValue(undefined);

    await expect(pollBookingPayment({
      fetchResolution,
      delaysMs: [0, 500, 1_000],
      waitForDelay,
    })).resolves.toMatchObject({ phase: 'confirmed' });

    expect(fetchResolution).toHaveBeenCalledTimes(2);
    expect(waitForDelay).toHaveBeenCalledTimes(1);
    expect(waitForDelay).toHaveBeenCalledWith(500);
  });

  it('cancels without another network call when the screen leaves foreground', async () => {
    let current = true;
    const fetchResolution = jest.fn().mockImplementation(async () => {
      current = false;
      return resolveBookingPayment([
        status(oneWayResult.bookingId, 'PENDING_PAYMENT'),
      ]);
    });

    await expect(pollBookingPayment({
      fetchResolution,
      delaysMs: [0, 500],
      waitForDelay: jest.fn().mockResolvedValue(undefined),
      isCurrent: () => current,
    })).resolves.toBeNull();
    expect(fetchResolution).toHaveBeenCalledTimes(1);
  });

  it('retries a transient status failure inside the bounded foreground window', async () => {
    const fetchResolution = jest
      .fn<Promise<ReturnType<typeof resolveBookingPayment>>, []>()
      .mockRejectedValueOnce(new ApiRequestError({
        message: 'Temporary gateway failure.',
        code: 'UPSTREAM_UNAVAILABLE',
        statusCode: 503,
      }))
      .mockResolvedValueOnce(resolveBookingPayment([
        status(oneWayResult.bookingId, 'CONFIRMED'),
      ]));
    const waitForDelay = jest.fn().mockResolvedValue(undefined);

    await expect(pollBookingPayment({
      fetchResolution,
      delaysMs: [0, 500],
      waitForDelay,
      shouldRetryError: isRetryableBookingStatusError,
    })).resolves.toMatchObject({ phase: 'confirmed' });

    expect(fetchResolution).toHaveBeenCalledTimes(2);
    expect(waitForDelay).toHaveBeenCalledWith(500);
  });

  it('fails fast for an authorization or contract error', async () => {
    const error = new ApiRequestError({
      message: 'Booking is not owned by this passenger.',
      code: 'FORBIDDEN',
      statusCode: 403,
    });
    const fetchResolution = jest.fn().mockRejectedValue(error);

    await expect(pollBookingPayment({
      fetchResolution,
      delaysMs: [0, 500],
      waitForDelay: jest.fn().mockResolvedValue(undefined),
      shouldRetryError: isRetryableBookingStatusError,
    })).rejects.toBe(error);
    expect(fetchResolution).toHaveBeenCalledTimes(1);
  });
});
