import { apiClient } from '@shared/api/axiosInstance';
import type { ApiSuccessEnvelope } from '@shared/api/errors';
import type {
  BookingResult,
  CreateBookingPayload,
  CreateRoundTripPayload,
  RoundTripResult,
} from '../types';
import { createBooking, createRoundTripBooking } from './bookingApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const postMock = jest.mocked(apiClient.post);

const oneWayPayload: CreateBookingPayload = {
  tripId: '11111111-1111-4111-8111-111111111111',
  pickup: { stationId: '22222222-2222-4222-8222-222222222222' },
  dropoff: { stationId: '33333333-3333-4333-8333-333333333333' },
  seats: [{ seatNumber: 'A01' }],
  paymentMethod: 'VNPAY',
};

const oneWayResult: BookingResult = {
  bookingId: '44444444-4444-4444-8444-444444444444',
  bookingCode: 'VR-ONE-WAY',
  status: 'PENDING_PAYMENT',
  totalAmount: 250_000,
  discountAmount: 0,
  paymentId: '55555555-5555-4555-8555-555555555555',
  paymentRedirectUrl: 'https://pay.example.test/redirect',
  tickets: [],
};

const roundTripPayload: CreateRoundTripPayload = {
  outbound: {
    ...oneWayPayload,
    seats: [{ seatNumber: 'A01' }],
  },
  return: {
    ...oneWayPayload,
    tripId: '66666666-6666-4666-8666-666666666666',
    seats: [{ seatNumber: 'B02' }],
  },
  paymentMethod: 'WALLET',
};

const roundTripResult: RoundTripResult = {
  bookingGroupId: '77777777-7777-4777-8777-777777777777',
  outbound: {
    bookingId: oneWayResult.bookingId,
    bookingCode: oneWayResult.bookingCode,
    totalAmount: 250_000,
    discountAmount: 0,
    tickets: [],
  },
  return: {
    bookingId: '88888888-8888-4888-8888-888888888888',
    bookingCode: 'VR-RETURN',
    totalAmount: 250_000,
    discountAmount: 0,
    tickets: [],
  },
  grandTotal: 500_000,
  paymentId: null,
  status: 'CONFIRMED',
  paymentRedirectUrl: null,
};

const successEnvelope = <T>(data: T): ApiSuccessEnvelope<T> => ({
  success: true,
  statusCode: 201,
  data,
});

describe('bookingApi create contracts', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('sends one-way seat numbers without passenger PII and keeps idempotency in the header', async () => {
    postMock.mockResolvedValueOnce({ data: successEnvelope(oneWayResult) });

    await expect(createBooking(oneWayPayload, ' booking-attempt-1 ')).resolves.toBe(oneWayResult);

    expect(postMock).toHaveBeenCalledWith(
      '/bookings',
      oneWayPayload,
      { headers: { 'Idempotency-Key': 'booking-attempt-1' } },
    );
    expect(JSON.stringify(postMock.mock.calls[0][1])).not.toMatch(
      /passenger|fullName|phone|email|idNumber|idempotencyKey/i,
    );
  });

  it('uses the same header-only idempotency contract for round trips', async () => {
    postMock.mockResolvedValueOnce({ data: successEnvelope(roundTripResult) });

    await expect(
      createRoundTripBooking(roundTripPayload, 'round-trip-attempt-1'),
    ).resolves.toBe(roundTripResult);

    expect(postMock).toHaveBeenCalledWith(
      '/bookings/round-trip',
      roundTripPayload,
      { headers: { 'Idempotency-Key': 'round-trip-attempt-1' } },
    );
    expect(JSON.stringify(postMock.mock.calls[0][1])).not.toMatch(
      /passenger|fullName|phone|email|idNumber|idempotencyKey/i,
    );
  });

  it('rejects a blank idempotency key before networking', async () => {
    await expect(createBooking(oneWayPayload, '   ')).rejects.toThrow(
      'Idempotency key is required.',
    );
    expect(postMock).not.toHaveBeenCalled();
  });
});
