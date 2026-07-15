/**
 * VietRide Booking — Zustand Store
 *
 * Manages the complete state of the booking flow: search params,
 * selected trip, seat selections, contact info, payment method.
 */

import { create } from 'zustand';
import type {
  SearchParams,
  BusTrip,
  SeatRow,
  Seat,
  ContactInfo,
  PaymentMethod,
  DropOffPoint,
  PickUpPoint,
  TripResultsStatus,
  BookingResult,
  RoundTripResult,
  CreateBookingPayload,
  BookingSearchPrefill,
} from '../types';
import type { TripDetail } from '../../trip/types';
import { searchTrips, getSeatMap, getTripDetail } from '../../trip/api/tripApi';
import { createBooking as apiCreateBooking, createRoundTripBooking } from '../api/bookingApi';
import { ApiRequestError, toApiError } from '@shared/api/errors';
import { IdempotencyKeyTracker } from '@shared/api/idempotency';
import { registerSessionCleanup } from '@shared/session/cleanup';
import { toBackendPaymentMethod } from '@shared/utils/paymentMethod';
import { isUuid } from '@shared/utils/pathSegment';
import { toTripSearchDate } from '../utils/searchParams';
import {
  isValidBookingSeatCount,
  MAX_BOOKING_SEATS,
  normalizeBookingSeatCount,
} from '../constants/bookingLimits';

type BookingSubmissionResult = BookingResult | RoundTripResult;
type LocationPayload = CreateBookingPayload['pickup'];

const bookingIdempotency = new IdempotencyKeyTracker('booking-mobile');
let bookingGeneration = 0;
let searchRequestSequence = 0;
let detailRequestSequence = 0;
let seatRequestSequence = 0;
let activeBookingSubmission: Promise<BookingSubmissionResult> | null = null;

class BookingSearchValidationError extends Error {}

const invalidateAsyncBookingWork = (): void => {
  bookingGeneration += 1;
  searchRequestSequence += 1;
  detailRequestSequence += 1;
  seatRequestSequence += 1;
  activeBookingSubmission = null;
  bookingIdempotency.reset();
};

const staleBookingSessionError = (): ApiRequestError =>
  new ApiRequestError({
    message: 'Phiên đặt vé đã thay đổi.',
    code: 'SESSION_INVALIDATED',
  });

const createEmptyContactInfo = (): ContactInfo => ({
  fullName: '',
  phoneCountryCode: '+84',
  phone: '',
  email: '',
  idNumber: '',
});

const buildTerminalPickUp = (trip: BusTrip): PickUpPoint => ({
  id: `station-${trip.originStationId}`,
  stationId: trip.originStationId,
  name: trip.departureStation,
  address: trip.departureCity,
  time: trip.departureTime,
  status: 'current',
  orderIndex: 0,
});

const buildTerminalDropOff = (trip: BusTrip): DropOffPoint => ({
  id: `station-${trip.destinationStationId}`,
  stationId: trip.destinationStationId,
  name: trip.arrivalStation,
  address: trip.arrivalCity,
  time: trip.arrivalTime,
  status: 'current',
  orderIndex: Number.MAX_SAFE_INTEGER,
});

const buildPickUpPoints = (trip: TripDetail): PickUpPoint[] => [
  buildTerminalPickUp(trip),
  ...trip.stops
    .filter((stop) => stop.id && stop.allowPickup)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((stop) => ({
      id: `stop-${stop.id}`,
      stopId: stop.id,
      name: stop.name,
      address: stop.distanceFromOriginKm != null
        ? `${stop.distanceFromOriginKm} km from departure`
        : 'Along-route pickup point',
      time: stop.time,
      status: 'available' as const,
      orderIndex: stop.orderIndex,
    })),
];

const buildDropOffPoints = (trip: TripDetail, selectedPickUp?: PickUpPoint | null): DropOffPoint[] => {
  const pickupOrderIndex = selectedPickUp?.orderIndex ?? 0;

  return [
    ...trip.stops
      .filter((stop) => stop.id && stop.allowDropoff)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((stop) => {
        const isBeforeOrAtPickup = stop.orderIndex <= pickupOrderIndex;
        return {
          id: `stop-${stop.id}`,
          stopId: stop.id,
          name: stop.name,
          address: stop.distanceFromOriginKm != null
            ? `${stop.distanceFromOriginKm} km from departure`
            : 'Along-route drop-off point',
          time: stop.time,
          status: isBeforeOrAtPickup ? 'disabled' as const : 'available' as const,
          disabledReason: isBeforeOrAtPickup ? 'Drop-off must be after pick-up.' : undefined,
          orderIndex: stop.orderIndex,
        };
      }),
    buildTerminalDropOff(trip),
  ];
};

const toLocationPayload = (
  point: PickUpPoint | DropOffPoint | null,
  fallbackStationId?: string,
): LocationPayload | null => {
  const stationId = point?.stationId ?? fallbackStationId;
  if (stationId) {
    return { stationId };
  }

  const stopId = point?.stopId ?? (isUuid(point?.id) ? point.id : undefined);
  if (stopId) {
    return { stopId };
  }

  return null;
};

const makeSeatRequests = (seats: Seat[]) => {
  if (!isValidBookingSeatCount(seats.length)) {
    throw new ApiRequestError({
      message: 'Please select between 1 and 5 seats before booking.',
      code: 'BOOKING_SEAT_COUNT_INVALID',
    });
  }

  return seats.map((seat) => ({
    seatNumber: seat.id,
  }));
};

const assertContactInfo = (contactInfo: ContactInfo) => {
  if (!contactInfo.fullName.trim() || !contactInfo.phone.trim() || !contactInfo.idNumber.trim()) {
    throw new Error('Full name, phone number and ID number are required to book tickets.');
  }
};

const assertLocationPayload: (
  label: string,
  payload: LocationPayload | null,
) => asserts payload is LocationPayload = (label, payload) => {
  if (!payload) {
    throw new Error(`${label} must resolve to exactly one station or stop.`);
  }
};

export interface OutboundState {
  trip: BusTrip | null;
  seats: Seat[];
  pickUp: PickUpPoint | null;
  dropOff: DropOffPoint | null;
}

interface ReturnState {
  trip: BusTrip | null;
  seats: Seat[];
  pickUp: PickUpPoint | null;
  dropOff: DropOffPoint | null;
}

// ─── Round Trip State ────────────────────────────────
export const OUTBOUND_STEPS = 4;   // TripResults, SeatSelection, PickUp, DropOff
export const RETURN_STEPS = 4;     // TripResults, SeatSelection, PickUp, DropOff (for return leg)
export const CHECKOUT_STEP = OUTBOUND_STEPS + RETURN_STEPS + 1; // 9
export const PAYMENT_STEP = CHECKOUT_STEP + 1; // 10

// Step ranges (1-indexed)
// One-way: steps 1-4 (outbound selection) + 5 (Checkout) + 6 (Payment) = 6 steps
// Round trip: steps 1-4 (outbound) + 5-8 (return) + 9 (Checkout) + 10 (Payment) = 10 steps

export const getTotalSteps = (isRoundTrip: boolean): number => {
  return isRoundTrip ? OUTBOUND_STEPS + RETURN_STEPS + 2 : OUTBOUND_STEPS + 2;
};
interface BookingStore {
  // ─── Search ──────────────────────────────────────────
  searchParams: SearchParams & { isRoundTrip?: boolean; returnDate?: string };
  setSearchParams: (params: Partial<SearchParams & { isRoundTrip?: boolean; returnDate?: string }>) => void;
  applySearchPrefill: (params: BookingSearchPrefill) => void;
  swapCities: () => void;

  // ─── Round Trip State ────────────────────────────────
  currentLeg: 'outbound' | 'return';
  outboundState: OutboundState | null;
  returnState: ReturnState | null;
  saveOutboundLeg: () => void;
  saveReturnLeg: () => void;
  highestStepReached: number;
  setHighestStep: (step: number) => void;

  // ─── Computed ────────────────────────────────────────
  totalSteps: () => number;
  isStepAccessible: (step: number) => boolean;
  totalPrice: () => number;

  // ─── Trip Results ────────────────────────────────────
  tripResultsStatus: TripResultsStatus;
  trips: BusTrip[];
  searchTrips: () => void;

  // ─── Selected Trip ───────────────────────────────────
  selectedTrip: BusTrip | null;
  selectTrip: (trip: BusTrip) => void;
  initTripDetail: () => Promise<void>;

  // ─── Seats ───────────────────────────────────────────
  seatMap: SeatRow[];
  selectedSeats: Seat[];
  toggleSeat: (seatId: string) => void;
  initSeatMap: () => void;

  // ─── Contact Info ────────────────────────────────────
  contactInfo: ContactInfo;
  setContactInfo: (info: Partial<ContactInfo>) => void;

  // ─── Pick-up ─────────────────────────────────────────
  pickUpPoints: PickUpPoint[];
  selectedPickUp: PickUpPoint | null;
  selectPickUp: (point: PickUpPoint) => void;

  // ─── Drop-off ────────────────────────────────────────
  dropOffPoints: DropOffPoint[];
  selectedDropOff: DropOffPoint | null;
  selectDropOff: (point: DropOffPoint) => void;

  // ─── Payment ─────────────────────────────────────────
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  voucherCode: string;
  voucherDiscountPreview: number;
  setVoucherCode: (code: string, discountPreview?: number) => void;
  clearVoucher: () => void;

  // ─── Create Booking ──────────────────────────────────
  bookingStatus: 'idle' | 'loading' | 'success' | 'error';
  bookingResult: BookingResult | RoundTripResult | null;
  bookingError: string | null;
  createBooking: () => Promise<BookingSubmissionResult>;

  // ─── Reset ───────────────────────────────────────────
  resetFlowPreservingSearch: () => void;
  resetBooking: () => void;
}

export const useBookingStore = create<BookingStore>((set, get) => ({
  // ─── Search ──────────────────────────────────────────
  searchParams: {
    from: '',
    to: '',
    originLocationCode: '',
    destinationLocationCode: '',
    originStationId: '',
    destinationStationId: '',
    originStationName: '',
    destinationStationName: '',
    date: 'Today',
    passengers: 1,
    isRoundTrip: false,
    returnDate: '',
  },
  setSearchParams: (params) =>
    set((state) => {
      const nextParams = { ...params };

      if (params.passengers !== undefined) {
        nextParams.passengers = normalizeBookingSeatCount(params.passengers);
      }

      if (
        params.from !== undefined
        && params.from !== state.searchParams.from
        && params.originLocationCode === undefined
      ) {
        nextParams.originLocationCode = '';
        nextParams.originStationId = '';
        nextParams.originStationName = '';
      }
      if (
        params.to !== undefined
        && params.to !== state.searchParams.to
        && params.destinationLocationCode === undefined
      ) {
        nextParams.destinationLocationCode = '';
        nextParams.destinationStationId = '';
        nextParams.destinationStationName = '';
      }
      if (
        params.originLocationCode !== undefined
        && params.originLocationCode !== state.searchParams.originLocationCode
        && params.originStationId === undefined
      ) {
        nextParams.originStationId = '';
        nextParams.originStationName = '';
      }
      if (
        params.destinationLocationCode !== undefined
        && params.destinationLocationCode !== state.searchParams.destinationLocationCode
        && params.destinationStationId === undefined
      ) {
        nextParams.destinationStationId = '';
        nextParams.destinationStationName = '';
      }

      return {
        searchParams: { ...state.searchParams, ...nextParams },
      };
    }),
  applySearchPrefill: (params) => {
    get().resetBooking();
    get().setSearchParams(params);
  },
  swapCities: () =>
    set((state) => ({
      searchParams: {
        ...state.searchParams,
        from: state.searchParams.to,
        to: state.searchParams.from,
        originLocationCode: state.searchParams.destinationLocationCode,
        destinationLocationCode: state.searchParams.originLocationCode,
        originStationId: state.searchParams.destinationStationId,
        destinationStationId: state.searchParams.originStationId,
        originStationName: state.searchParams.destinationStationName,
        destinationStationName: state.searchParams.originStationName,
      },
    })),

  // ─── Round Trip State ────────────────────────────────
  currentLeg: 'outbound',
  outboundState: null,
  returnState: null,
  highestStepReached: 1,
  setHighestStep: (step) => set((state) => ({
    highestStepReached: Math.max(state.highestStepReached, step)
  })),
  saveOutboundLeg: () => set((state) => ({
    outboundState: {
      trip: state.selectedTrip,
      seats: state.selectedSeats,
      pickUp: state.selectedPickUp,
      dropOff: state.selectedDropOff,
    },
    currentLeg: 'return',
    selectedTrip: null,
    selectedSeats: [],
    selectedPickUp: state.pickUpPoints[0],
    selectedDropOff: state.dropOffPoints[0],
    highestStepReached: OUTBOUND_STEPS + 1, // After outbound (steps 1-4), unlock step 5 (return TripResults)
  })),
  saveReturnLeg: () => set((state) => ({
    returnState: {
      trip: state.selectedTrip,
      seats: state.selectedSeats,
      pickUp: state.selectedPickUp,
      dropOff: state.selectedDropOff,
    },
    highestStepReached: OUTBOUND_STEPS + RETURN_STEPS + 1, // After return (steps 5-8), unlock step 9 (Checkout)
  })),

  // ─── Computed ────────────────────────────────────────
  totalSteps: () => getTotalSteps(get().searchParams.isRoundTrip ?? false),
  isStepAccessible: (step) => step <= get().highestStepReached,

  // ─── Trip Results ────────────────────────────────────
  tripResultsStatus: 'loading',
  trips: [],
  searchTrips: async () => {
    const generation = bookingGeneration;
    const requestId = ++searchRequestSequence;
    const { searchParams, currentLeg } = get();
    set({ tripResultsStatus: 'loading', trips: [] });
    try {
      const isReturnLeg = currentLeg === 'return';
      const originLocationCode = (
        isReturnLeg ? searchParams.destinationLocationCode : searchParams.originLocationCode
      ).trim().toUpperCase();
      const destinationLocationCode = (
        isReturnLeg ? searchParams.originLocationCode : searchParams.destinationLocationCode
      ).trim().toUpperCase();
      if (!originLocationCode || !destinationLocationCode) {
        throw new BookingSearchValidationError('Please select both departure and destination provinces.');
      }
      if (originLocationCode === destinationLocationCode) {
        throw new BookingSearchValidationError('Departure and destination provinces must be different.');
      }

      const requestedDate = isReturnLeg ? searchParams.returnDate : searchParams.date;
      const departureDate = toTripSearchDate(requestedDate ?? '');
      if (isReturnLeg) {
        const outboundDate = toTripSearchDate(searchParams.date);
        if (departureDate < outboundDate) {
          throw new BookingSearchValidationError('Return date must be on or after the departure date.');
        }
      }
      const passengerCount = normalizeBookingSeatCount(searchParams.passengers);

      const trips = await searchTrips({
        originLocationCode,
        destinationLocationCode,
        departureDate,
        passengerCount,
        allowAlongRoutePickup: false,
      });

      if (generation !== bookingGeneration || requestId !== searchRequestSequence) {
        return;
      }
      set({ tripResultsStatus: trips.length === 0 ? 'empty' : 'success', trips });
    } catch (error) {
      if (generation !== bookingGeneration || requestId !== searchRequestSequence) {
        return;
      }
      if (__DEV__ && !(error instanceof BookingSearchValidationError)) {
        const apiError = toApiError(error);
        console.warn(`[Booking] Trip search failed (${apiError.code}).`);
      }
      set({ tripResultsStatus: 'error' });
    }
  },

  // ─── Selected Trip ───────────────────────────────────
  selectedTrip: null,
  selectTrip: (trip) => {
    detailRequestSequence += 1;
    seatRequestSequence += 1;
    set((state) => {
      const terminalPickUp = buildTerminalPickUp(trip);
      const terminalDropOff = buildTerminalDropOff(trip);

      return {
        selectedTrip: trip,
        selectedSeats: [],
        seatMap: [],
        pickUpPoints: [terminalPickUp],
        dropOffPoints: [terminalDropOff],
        selectedPickUp: terminalPickUp,
        selectedDropOff: terminalDropOff,
        highestStepReached: Math.max(
          state.highestStepReached,
          state.currentLeg === 'return' ? 5 : 1,
        ),
      };
    });
  },
  initTripDetail: async () => {
    const { selectedTrip, selectedPickUp, selectedDropOff } = get();
    if (!selectedTrip?.id) return;
    const generation = bookingGeneration;
    const requestId = ++detailRequestSequence;
    const tripId = selectedTrip.id;

    try {
      const detail = await getTripDetail(tripId);
      const enrichedTrip: TripDetail = {
        ...detail,
        operatorBadge: selectedTrip.operatorBadge || detail.operatorBadge,
        busLabel: selectedTrip.busLabel || detail.busLabel,
        busType: detail.busType || selectedTrip.busType,
      };
      const nextPickUpPoints = buildPickUpPoints(enrichedTrip);
      const nextSelectedPickUp = selectedPickUp
        ? nextPickUpPoints.find((point) => point.id === selectedPickUp.id) ?? nextPickUpPoints[0]
        : nextPickUpPoints[0];
      const nextDropOffPoints = buildDropOffPoints(enrichedTrip, nextSelectedPickUp);
      const terminalDropOff = buildTerminalDropOff(enrichedTrip);
      const matchedDropOff = selectedDropOff
        ? nextDropOffPoints.find((point) => point.id === selectedDropOff.id)
        : null;
      const nextSelectedDropOff = matchedDropOff?.status !== 'disabled'
        ? matchedDropOff
        : nextDropOffPoints.find((point) => point.id === terminalDropOff.id) ?? terminalDropOff;

      if (
        generation !== bookingGeneration
        || requestId !== detailRequestSequence
        || get().selectedTrip?.id !== tripId
      ) {
        return;
      }

      set({
        selectedTrip: enrichedTrip,
        pickUpPoints: nextPickUpPoints,
        dropOffPoints: nextDropOffPoints,
        selectedPickUp: nextSelectedPickUp,
        selectedDropOff: nextSelectedDropOff,
      });
    } catch (error) {
      if (
        __DEV__
        && generation === bookingGeneration
        && requestId === detailRequestSequence
      ) {
        console.warn(`[Booking] Trip detail failed (${toApiError(error).code}).`);
      }
    }
  },

  // ─── Seats ───────────────────────────────────────────
  seatMap: [],
  selectedSeats: [],
  initSeatMap: async () => {
    const { selectedTrip } = get();
    if (!selectedTrip?.id) return;
    const generation = bookingGeneration;
    const requestId = ++seatRequestSequence;
    const tripId = selectedTrip.id;
    try {
      const seatRows = await getSeatMap(tripId);
      if (
        generation !== bookingGeneration
        || requestId !== seatRequestSequence
        || get().selectedTrip?.id !== tripId
      ) {
        return;
      }
      set({ seatMap: seatRows, selectedSeats: [] });
    } catch (error) {
      if (
        __DEV__
        && generation === bookingGeneration
        && requestId === seatRequestSequence
      ) {
        console.warn(`[Booking] Seat map failed (${toApiError(error).code}).`);
      }
    }
  },
  toggleSeat: (seatId) =>
    set((state) => {
      const selectedIndex = state.selectedSeats.findIndex((seat) => seat.id === seatId);
      if (selectedIndex >= 0) {
        return {
          selectedSeats: state.selectedSeats.filter((seat) => seat.id !== seatId),
        };
      }

      let targetSeat: Seat | undefined;
      for (const row of state.seatMap) {
        targetSeat =
          row.leftSeats.find((seat) => seat.id === seatId) ??
          row.rightSeats.find((seat) => seat.id === seatId);
        if (targetSeat) break;
      }

      if (!targetSeat || targetSeat.status === 'sold') {
        return state;
      }

      if (state.selectedSeats.length >= MAX_BOOKING_SEATS) {
        return state;
      }

      return {
        selectedSeats: [
          ...state.selectedSeats,
          { ...targetSeat, status: 'selected' as const },
        ],
      };
    }),

  // ─── Contact Info ────────────────────────────────────
  contactInfo: createEmptyContactInfo(),
  setContactInfo: (info) =>
    set((state) => ({
      contactInfo: { ...state.contactInfo, ...info },
    })),

  // ─── Pick-up ─────────────────────────────────────────
  pickUpPoints: [],
  selectedPickUp: null,
  selectPickUp: (point) => set((state) => {
    const selectedTripWithStops = state.selectedTrip as TripDetail | null;
    if (!selectedTripWithStops?.stops?.length) {
      return { selectedPickUp: point };
    }

    const nextDropOffPoints = buildDropOffPoints(selectedTripWithStops, point);
    const currentDropOff = state.selectedDropOff
      ? nextDropOffPoints.find((candidate) => candidate.id === state.selectedDropOff?.id)
      : null;
    const terminalDropOff = buildTerminalDropOff(selectedTripWithStops);
    const nextSelectedDropOff = currentDropOff?.status !== 'disabled'
      ? currentDropOff
      : nextDropOffPoints.find((candidate) => candidate.id === terminalDropOff.id) ?? terminalDropOff;

    return {
      selectedPickUp: point,
      dropOffPoints: nextDropOffPoints,
      selectedDropOff: nextSelectedDropOff,
    };
  }),

  // ─── Drop-off ────────────────────────────────────────
  dropOffPoints: [],
  selectedDropOff: null,
  selectDropOff: (point) => set({ selectedDropOff: point }),

  // ─── Payment ─────────────────────────────────────────
  paymentMethod: 'vnpay',
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  voucherCode: '',
  voucherDiscountPreview: 0,
  setVoucherCode: (code, discountPreview = 0) =>
    set({
      voucherCode: code.trim().toUpperCase(),
      voucherDiscountPreview: Math.max(0, discountPreview),
    }),
  clearVoucher: () => set({ voucherCode: '', voucherDiscountPreview: 0 }),

  // ─── Create Booking ──────────────────────────────────
  bookingStatus: 'idle',
  bookingResult: null,
  bookingError: null,
  createBooking: () => {
    if (activeBookingSubmission) {
      return activeBookingSubmission;
    }

    const generation = bookingGeneration;
    const submission = (async (): Promise<BookingSubmissionResult> => {
      const state = get();
      set({ bookingStatus: 'loading', bookingError: null });

      try {
        assertContactInfo(state.contactInfo);
        const paymentMethod = toBackendPaymentMethod(state.paymentMethod);
        const voucherCode = state.voucherCode || undefined;

      if (state.searchParams.isRoundTrip && (!state.outboundState || !state.returnState)) {
        throw new Error('Please complete both outbound and return trip details.');
      }

      if (state.searchParams.isRoundTrip && state.outboundState && state.returnState) {
        // Round trip
        const outboundTrip = state.outboundState.trip;
        const returnTrip = state.returnState.trip;

        if (!outboundTrip || !returnTrip) {
          throw new Error('Please select both outbound and return trips.');
        }

        const outboundPickup = toLocationPayload(state.outboundState.pickUp, outboundTrip.originStationId);
        const outboundDropoff = toLocationPayload(state.outboundState.dropOff, outboundTrip.destinationStationId);
        const returnPickup = toLocationPayload(state.returnState.pickUp, returnTrip.originStationId);
        const returnDropoff = toLocationPayload(state.returnState.dropOff, returnTrip.destinationStationId);

        assertLocationPayload('Outbound pickup', outboundPickup);
        assertLocationPayload('Outbound drop-off', outboundDropoff);
        assertLocationPayload('Return pickup', returnPickup);
        assertLocationPayload('Return drop-off', returnDropoff);

        const payload = {
          outbound: {
            tripId: outboundTrip.id,
            pickup: outboundPickup,
            dropoff: outboundDropoff,
            seats: makeSeatRequests(state.outboundState.seats),
          },
          return: {
            tripId: returnTrip.id,
            pickup: returnPickup,
            dropoff: returnDropoff,
            seats: makeSeatRequests(state.returnState.seats),
          },
          voucherCode,
          paymentMethod,
        };
        const idempotencyKey = bookingIdempotency.getOrCreate({
          type: 'round-trip',
          payload,
        });
        const result = await createRoundTripBooking(payload, idempotencyKey);
        if (generation !== bookingGeneration) {
          throw staleBookingSessionError();
        }
        set({ bookingStatus: 'success', bookingResult: result });
        return result;
      } else {
        // One way
        if (!state.selectedTrip) {
          throw new Error('Please select a trip before booking.');
        }

        const pickup = toLocationPayload(state.selectedPickUp, state.selectedTrip.originStationId);
        const dropoff = toLocationPayload(state.selectedDropOff, state.selectedTrip.destinationStationId);

        assertLocationPayload('Pickup', pickup);
        assertLocationPayload('Drop-off', dropoff);

        const payload = {
          tripId: state.selectedTrip.id,
          pickup,
          dropoff,
          seats: makeSeatRequests(state.selectedSeats),
          voucherCode,
          paymentMethod,
        };
        const idempotencyKey = bookingIdempotency.getOrCreate({
          type: 'one-way',
          payload,
        });
        const result = await apiCreateBooking(payload, idempotencyKey);
        if (generation !== bookingGeneration) {
          throw staleBookingSessionError();
        }
        set({ bookingStatus: 'success', bookingResult: result });
        return result;
      }
      } catch (error: unknown) {
        const apiError = generation === bookingGeneration
          ? toApiError(error)
          : staleBookingSessionError();

        if (generation === bookingGeneration) {
          if (__DEV__ && apiError.code !== 'BOOKING_SEAT_COUNT_INVALID') {
            console.warn(
              `[Booking] Submission failed (${apiError.code}, ${apiError.statusCode ?? 'no-status'}).`,
            );
          }
          set({
            bookingStatus: 'error',
            bookingError: apiError.message || 'Could not create your booking. Please try again.',
          });
        }
        throw apiError;
      }
    })();

    activeBookingSubmission = submission;
    const releaseSubmission = (): void => {
      if (activeBookingSubmission === submission) {
        activeBookingSubmission = null;
      }
    };
    submission.then(releaseSubmission, releaseSubmission);
    return submission;
  },

  // ─── Computed ────────────────────────────────────────
  totalPrice: () => {
    const { selectedTrip, selectedSeats, outboundState, returnState } = get();
    let total = 0;
    if (selectedTrip) {
      total += selectedTrip.price * selectedSeats.length;
    }
    if (outboundState?.trip) {
      total += outboundState.trip.price * outboundState.seats.length;
    }
    if (returnState?.trip) {
      total += returnState.trip.price * returnState.seats.length;
    }
    return total;
  },

  // ─── Reset ───────────────────────────────────────────
  resetFlowPreservingSearch: () => {
    invalidateAsyncBookingWork();
    set({
      currentLeg: 'outbound',
      outboundState: null,
      returnState: null,
      selectedTrip: null,
      seatMap: [],
      selectedSeats: [],
      selectedPickUp: null,
      selectedDropOff: null,
      contactInfo: createEmptyContactInfo(),
      pickUpPoints: [],
      dropOffPoints: [],
      paymentMethod: 'vnpay',
      voucherCode: '',
      voucherDiscountPreview: 0,
      bookingStatus: 'idle',
      bookingResult: null,
      bookingError: null,
      highestStepReached: 1,
      tripResultsStatus: 'loading',
      trips: [],
    });
  },
  resetBooking: () => {
    invalidateAsyncBookingWork();
    set({
      searchParams: {
        from: '',
        to: '',
        originLocationCode: '',
        destinationLocationCode: '',
        originStationId: '',
        destinationStationId: '',
        originStationName: '',
        destinationStationName: '',
        date: 'Today',
        passengers: 1,
        isRoundTrip: false,
        returnDate: '',
      },
      currentLeg: 'outbound',
      outboundState: null,
      returnState: null,
      tripResultsStatus: 'loading',
      trips: [],
      selectedTrip: null,
      seatMap: [],
      selectedSeats: [],
      contactInfo: createEmptyContactInfo(),
      pickUpPoints: [],
      dropOffPoints: [],
      selectedPickUp: null,
      selectedDropOff: null,
      paymentMethod: 'vnpay',
      voucherCode: '',
      voucherDiscountPreview: 0,
      bookingStatus: 'idle',
      bookingResult: null,
      bookingError: null,
      highestStepReached: 1,
    });
  },
}));

registerSessionCleanup('booking', () => {
  useBookingStore.getState().resetBooking();
});
