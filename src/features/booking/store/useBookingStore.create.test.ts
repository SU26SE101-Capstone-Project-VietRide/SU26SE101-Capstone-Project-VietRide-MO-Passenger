const mockCreateBooking = jest.fn();
const mockCreateRoundTripBooking = jest.fn();

jest.mock('../../trip/api/tripApi', () => ({
  searchTrips: jest.fn(),
  getSeatMap: jest.fn(),
  getTripDetail: jest.fn(),
}));

jest.mock('../api/bookingApi', () => ({
  createBooking: (...args: unknown[]) => mockCreateBooking(...args),
  createRoundTripBooking: (...args: unknown[]) => mockCreateRoundTripBooking(...args),
}));

import type { BookingResult, BusTrip, RoundTripResult } from '../types';
import { ApiRequestError } from '@shared/api/errors';
import { useBookingStore } from './useBookingStore';

const trip: BusTrip = {
  id: '11111111-1111-4111-8111-111111111111',
  operatorId: '22222222-2222-4222-8222-222222222222',
  routeId: '33333333-3333-4333-8333-333333333333',
  originStationId: '44444444-4444-4444-8444-444444444444',
  destinationStationId: '55555555-5555-4555-8555-555555555555',
  operatorBadge: 'VietRide',
  departureStation: 'Origin',
  arrivalStation: 'Destination',
  departureTime: '08:00',
  arrivalTime: '12:00',
  price: 250_000,
  seatsLeft: 10,
  allowPickup: false,
  allowDropoff: false,
  busType: null,
  busLabel: null,
  durationHours: 4,
  totalSeats: 40,
  departureCity: 'Origin City',
  arrivalCity: 'Destination City',
};

const returnTrip: BusTrip = {
  ...trip,
  id: '99999999-9999-4999-8999-999999999999',
  originStationId: trip.destinationStationId,
  destinationStationId: trip.originStationId,
  price: 300_000,
};

const result: BookingResult = {
  bookingId: '66666666-6666-4666-8666-666666666666',
  bookingCode: 'VR-CONTRACT',
  status: 'CONFIRMED',
  totalAmount: 250_000,
  discountAmount: 0,
  paymentId: null,
  paymentRedirectUrl: null,
  tickets: [],
};

const roundTripResult: RoundTripResult = {
  bookingGroupId: '77777777-7777-4777-8777-777777777777',
  outbound: {
    bookingId: result.bookingId,
    bookingCode: result.bookingCode,
    totalAmount: result.totalAmount,
    discountAmount: result.discountAmount,
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

describe('booking submission serialization', () => {
  let consoleWarn: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    useBookingStore.getState().resetBooking();
    mockCreateBooking.mockReset();
    mockCreateRoundTripBooking.mockReset();
    mockCreateBooking.mockResolvedValue(result);
    mockCreateRoundTripBooking.mockResolvedValue(roundTripResult);
    useBookingStore.setState({
      selectedTrip: trip,
      selectedSeats: [{ id: 'A01', label: 'A01', status: 'selected' }],
      selectedPickUp: {
        id: `station-${trip.originStationId}`,
        stationId: trip.originStationId,
        name: 'Origin',
        address: 'Origin City',
        time: '08:00',
        status: 'current',
      },
      selectedDropOff: {
        id: `station-${trip.destinationStationId}`,
        stationId: trip.destinationStationId,
        name: 'Destination',
        address: 'Destination City',
        time: '12:00',
        status: 'current',
      },
      contactInfo: {
        fullName: 'Passenger Name',
        phoneCountryCode: '+84',
        phone: '0912345678',
        email: 'passenger@example.test',
        idNumber: '012345678901',
      },
      paymentMethod: 'vnpay',
    });
  });

  afterEach(() => {
    useBookingStore.getState().resetBooking();
    consoleWarn.mockRestore();
  });

  it('keeps contact data local while serializing seats as seatNumber only', async () => {
    await expect(useBookingStore.getState().createBooking()).resolves.toBe(result);

    const [payload, idempotencyKey] = mockCreateBooking.mock.calls[0];
    expect(payload).toEqual({
      tripId: trip.id,
      pickup: { stationId: trip.originStationId },
      dropoff: { stationId: trip.destinationStationId },
      seats: [{ seatNumber: 'A01' }],
      voucherCode: undefined,
      paymentMethod: 'VNPAY',
    });
    expect(payload).not.toHaveProperty('contactInfo');
    expect(payload.seats[0]).not.toHaveProperty('passenger');
    expect(JSON.stringify(payload)).not.toMatch(
      /passenger|fullName|phone|email|idNumber|idempotencyKey/i,
    );
    expect(idempotencyKey).toEqual(expect.any(String));
  });

  it('preserves along-route stop selections instead of replacing them with terminal stations', async () => {
    const pickupStopId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const dropoffStopId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    useBookingStore.setState({
      selectedPickUp: {
        id: `stop-${pickupStopId}`,
        stopId: pickupStopId,
        name: 'Along-route pickup',
        address: 'Pickup address',
        time: '09:00',
        status: 'available',
      },
      selectedDropOff: {
        id: dropoffStopId,
        name: 'Along-route drop-off',
        address: 'Drop-off address',
        time: '11:00',
        status: 'available',
      },
    });

    await useBookingStore.getState().createBooking();

    const [payload] = mockCreateBooking.mock.calls[0];
    expect(payload.pickup).toEqual({ stopId: pickupStopId });
    expect(payload.dropoff).toEqual({ stopId: dropoffStopId });
  });

  it('keeps a pending promotion while the user selects a trip', () => {
    useBookingStore.getState().setVoucherCode('RIDE20');

    useBookingStore.getState().selectTrip(trip);

    expect(useBookingStore.getState().voucherCode).toBe('RIDE20');
  });

  it('applies the same PII-free seat contract to both round-trip legs', async () => {
    const pickup = useBookingStore.getState().selectedPickUp;
    const dropoff = useBookingStore.getState().selectedDropOff;
    const selectedSeats = useBookingStore.getState().selectedSeats;

    useBookingStore.setState((state) => ({
      searchParams: { ...state.searchParams, isRoundTrip: true },
      outboundState: { trip, seats: selectedSeats, pickUp: pickup, dropOff: dropoff },
      returnState: {
        trip: returnTrip,
        seats: [{ id: 'B02', label: 'B02', status: 'selected' }],
        pickUp: {
          ...dropoff!,
          stationId: returnTrip.originStationId,
          stopId: undefined,
        },
        dropOff: {
          ...pickup!,
          stationId: returnTrip.destinationStationId,
          stopId: undefined,
        },
      },
    }));

    await expect(useBookingStore.getState().createBooking()).resolves.toBe(roundTripResult);

    const [payload, idempotencyKey] = mockCreateRoundTripBooking.mock.calls[0];
    expect(payload.outbound.seats).toEqual([{ seatNumber: 'A01' }]);
    expect(payload.return.seats).toEqual([{ seatNumber: 'B02' }]);
    expect(JSON.stringify(payload)).not.toMatch(
      /passenger|fullName|phone|email|idNumber|idempotencyKey/i,
    );
    expect(idempotencyKey).toEqual(expect.any(String));
  });

  it('uses the outbound snapshot once for a completed one-way selection', () => {
    const state = useBookingStore.getState();
    useBookingStore.setState((current) => ({
      searchParams: { ...current.searchParams, isRoundTrip: false },
      outboundState: {
        trip,
        seats: state.selectedSeats,
        pickUp: state.selectedPickUp,
        dropOff: state.selectedDropOff,
      },
    }));

    expect(useBookingStore.getState().totalPrice()).toBe(250_000);
  });

  it('uses each leg snapshot once for a completed round trip', () => {
    const outboundState = useBookingStore.getState();
    const returnSeats = [
      { id: 'B01', label: 'B01', status: 'selected' as const },
      { id: 'B02', label: 'B02', status: 'selected' as const },
    ];

    useBookingStore.setState((current) => ({
      searchParams: { ...current.searchParams, isRoundTrip: true },
      currentLeg: 'return',
      outboundState: {
        trip,
        seats: outboundState.selectedSeats,
        pickUp: outboundState.selectedPickUp,
        dropOff: outboundState.selectedDropOff,
      },
      returnState: {
        trip: returnTrip,
        seats: returnSeats,
        pickUp: outboundState.selectedDropOff,
        dropOff: outboundState.selectedPickUp,
      },
      selectedTrip: returnTrip,
      selectedSeats: returnSeats,
    }));

    expect(useBookingStore.getState().totalPrice()).toBe(850_000);
  });

  it('coalesces a rapid double tap into one booking request', async () => {
    let resolveRequest: ((value: BookingResult) => void) | undefined;
    mockCreateBooking.mockImplementationOnce(
      () => new Promise<BookingResult>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const first = useBookingStore.getState().createBooking();
    const second = useBookingStore.getState().createBooking();

    expect(second).toBe(first);
    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
    resolveRequest?.(result);
    await expect(first).resolves.toBe(result);
  });

  it('reuses the idempotency key after an ambiguous timeout', async () => {
    mockCreateBooking
      .mockRejectedValueOnce(new ApiRequestError({
        message: 'Request timed out.',
        code: 'REQUEST_TIMEOUT',
        isNetworkError: true,
      }))
      .mockResolvedValueOnce(result);

    await expect(useBookingStore.getState().createBooking()).rejects.toThrow(
      'Request timed out.',
    );
    await expect(useBookingStore.getState().createBooking()).resolves.toBe(result);

    expect(mockCreateBooking).toHaveBeenCalledTimes(2);
    expect(mockCreateBooking.mock.calls[0][1]).toBe(mockCreateBooking.mock.calls[1][1]);
  });

  it('rotates the idempotency key after a definitive backend rejection', async () => {
    mockCreateBooking
      .mockRejectedValueOnce(new ApiRequestError({
        message: 'The selected seat is no longer available.',
        code: 'BOOKING_SEAT_UNAVAILABLE',
        statusCode: 409,
      }))
      .mockResolvedValueOnce(result);

    await expect(useBookingStore.getState().createBooking()).rejects.toThrow(
      'The selected seat is no longer available.',
    );
    await expect(useBookingStore.getState().createBooking()).resolves.toBe(result);

    expect(mockCreateBooking).toHaveBeenCalledTimes(2);
    expect(mockCreateBooking.mock.calls[0][1]).not.toBe(mockCreateBooking.mock.calls[1][1]);
  });

  it('retains the idempotency key after an ambiguous HTTP 408', async () => {
    mockCreateBooking
      .mockRejectedValueOnce(new ApiRequestError({
        message: 'The upstream request timed out.',
        code: 'API_ERROR',
        statusCode: 408,
      }))
      .mockResolvedValueOnce(result);

    await expect(useBookingStore.getState().createBooking()).rejects.toThrow(
      'The upstream request timed out.',
    );
    await expect(useBookingStore.getState().createBooking()).resolves.toBe(result);

    expect(mockCreateBooking.mock.calls[0][1]).toBe(mockCreateBooking.mock.calls[1][1]);
  });

  it.each([0, 6])(
    'rejects %i seats before issuing a booking request',
    async (seatCount) => {
      useBookingStore.setState({
        selectedSeats: Array.from({ length: seatCount }, (_, index) => ({
          id: `A${index + 1}`,
          label: `A${index + 1}`,
          status: 'selected' as const,
        })),
      });

      await expect(useBookingStore.getState().createBooking()).rejects.toThrow(
        'Please select between 1 and 5 seats before booking.',
      );
      expect(mockCreateBooking).not.toHaveBeenCalled();
    },
  );
});
