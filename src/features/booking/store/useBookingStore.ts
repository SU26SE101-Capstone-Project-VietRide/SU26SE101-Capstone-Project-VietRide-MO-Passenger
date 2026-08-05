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
  PaymentMethod,
  DropOffPoint,
  PickUpPoint,
  TripResultsStatus,
  BookingResult,
  RoundTripResult,
  BookingSearchPrefill,
  ShuttleServiceDraft,
} from '../types';
import type { TripDetail } from '../../trip/types';
import { searchTrips, getSeatMap, getTripDetail } from '../../trip/api/tripApi';
import { createBooking as apiCreateBooking, createRoundTripBooking } from '../api/bookingApi';
import { ApiRequestError, toApiError } from '@shared/api/errors';
import { IdempotencyKeyTracker } from '@shared/api/idempotency';
import { registerSessionCleanup } from '@shared/session/cleanup';
import { toBackendPaymentMethod } from '@shared/utils/paymentMethod';
import { toTripSearchDate } from '../utils/searchParams';
import {
  MAX_BOOKING_SEATS,
  normalizeBookingSeatCount,
} from '../constants/bookingLimits';
import {
  buildBookingLegPayload,
  type BookingLegDraft,
} from '../utils/bookingPayload';
import {
  getTotalSteps,
  OUTBOUND_STEPS,
  RETURN_STEPS,
} from '../utils/bookingSteps';
import { isEligibleReturnTrip } from '../utils/roundTripEligibility';

export {
  CHECKOUT_STEP,
  getTotalSteps,
  OUTBOUND_STEPS,
  PAYMENT_STEP,
  RETURN_STEPS,
} from '../utils/bookingSteps';

type BookingSubmissionResult = BookingResult | RoundTripResult;

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

const shouldRetainBookingIdempotencyKey = (error: ApiRequestError): boolean =>
  error.isNetworkError
  || error.code === 'REQUEST_TIMEOUT'
  || error.statusCode === 408
  || Boolean(error.statusCode && error.statusCode >= 500);

const SHUTTLE_DRAFT_INVALIDATING_ERROR_CODES = new Set([
  'SHUTTLE_PICKUP_STALE',
  'SHUTTLE_DROPOFF_STALE',
  'SHUTTLE_TRIP_NOT_SCHEDULED',
  'SHUTTLE_REQUEST_CUTOFF_PASSED',
  'SHUTTLE_STATION_NOT_SUPPORTED',
]);

const shouldInvalidateShuttleDrafts = (error: ApiRequestError): boolean =>
  SHUTTLE_DRAFT_INVALIDATING_ERROR_CODES.has(error.code);

const reconcileSelectedSeats = (
  seatRows: SeatRow[],
  selectedSeats: Seat[],
): Seat[] => {
  if (selectedSeats.length === 0) return selectedSeats;

  const availableSeats = new Map<string, Seat>();
  for (const row of seatRows) {
    for (const seat of [...row.leftSeats, ...row.rightSeats]) {
      if (seat.status !== 'sold') availableSeats.set(seat.id, seat);
    }
  }

  return selectedSeats.flatMap((selectedSeat) => {
    const refreshedSeat = availableSeats.get(selectedSeat.id);
    return refreshedSeat
      ? [{ ...refreshedSeat, status: 'selected' as const }]
      : [];
  });
};

export type OutboundState = BookingLegDraft;
type ReturnState = BookingLegDraft;

// ─── Round Trip State ────────────────────────────────
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
  saveOneWayLeg: () => void;
  restoreLegForEdit: (leg: 'outbound' | 'return') => void;
  highestStepReached: number;
  setHighestStep: (step: number) => void;

  // ─── Computed ────────────────────────────────────────
  totalSteps: () => number;
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
  // ─── Pick-up ─────────────────────────────────────────
  pickUpPoints: PickUpPoint[];
  selectedPickUp: PickUpPoint | null;
  selectPickUp: (point: PickUpPoint) => void;
  selectedShuttlePickup: ShuttleServiceDraft | null;
  setSelectedShuttlePickup: (pickup: ShuttleServiceDraft | null) => void;

  // ─── Drop-off ────────────────────────────────────────
  dropOffPoints: DropOffPoint[];
  selectedDropOff: DropOffPoint | null;
  selectDropOff: (point: DropOffPoint) => void;
  selectedShuttleDropoff: ShuttleServiceDraft | null;
  setSelectedShuttleDropoff: (dropoff: ShuttleServiceDraft | null) => void;

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
  bookingPaymentMethod: PaymentMethod | null;
  bookingError: ApiRequestError | null;
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
      shuttlePickup: state.selectedShuttlePickup,
      shuttleDropoff: state.selectedShuttleDropoff,
    },
    currentLeg: 'return',
    selectedTrip: null,
    selectedSeats: [],
    selectedPickUp: null,
    selectedDropOff: null,
    selectedShuttlePickup: null,
    selectedShuttleDropoff: null,
    pickUpPoints: [],
    dropOffPoints: [],
    highestStepReached: OUTBOUND_STEPS + 1, // After outbound (steps 1-4), unlock step 5 (return TripResults)
  })),
  saveReturnLeg: () => set((state) => ({
    returnState: {
      trip: state.selectedTrip,
      seats: state.selectedSeats,
      pickUp: state.selectedPickUp,
      dropOff: state.selectedDropOff,
      shuttlePickup: state.selectedShuttlePickup,
      shuttleDropoff: state.selectedShuttleDropoff,
    },
    highestStepReached: OUTBOUND_STEPS + RETURN_STEPS + 1, // After return (steps 5-8), unlock step 9 (Checkout)
  })),
  saveOneWayLeg: () => set((state) => ({
    outboundState: {
      trip: state.selectedTrip,
      seats: state.selectedSeats,
      pickUp: state.selectedPickUp,
      dropOff: state.selectedDropOff,
      shuttlePickup: state.selectedShuttlePickup,
      shuttleDropoff: state.selectedShuttleDropoff,
    },
    currentLeg: 'outbound',
    highestStepReached: Math.max(state.highestStepReached, 5),
  })),
  restoreLegForEdit: (leg) => set((state) => {
    const snapshot = leg === 'outbound' ? state.outboundState : state.returnState;
    if (!snapshot?.trip) return { currentLeg: leg };

    const pickUpPoints = snapshot.trip === state.selectedTrip
      ? state.pickUpPoints
      : [buildTerminalPickUp(snapshot.trip)];
    const dropOffPoints = snapshot.trip === state.selectedTrip
      ? state.dropOffPoints
      : [buildTerminalDropOff(snapshot.trip)];

    return {
      currentLeg: leg,
      selectedTrip: snapshot.trip,
      selectedSeats: snapshot.seats,
      selectedPickUp: snapshot.pickUp,
      selectedDropOff: snapshot.dropOff,
      selectedShuttlePickup: snapshot.shuttlePickup ?? null,
      selectedShuttleDropoff: snapshot.shuttleDropoff ?? null,
      pickUpPoints,
      dropOffPoints,
    };
  }),

  // ─── Computed ────────────────────────────────────────
  totalSteps: () => getTotalSteps(get().searchParams.isRoundTrip ?? false),

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

      let outboundConstraint = isReturnLeg ? get().outboundState?.trip ?? null : null;
      if (isReturnLeg) {
        if (!outboundConstraint) {
          throw new BookingSearchValidationError('Complete the outbound trip before selecting a return trip.');
        }

        // Search responses omit ReturnRouteId. Normally the outbound detail has
        // already enriched the snapshot while choosing seats; this guarded fetch
        // closes the fast-tap race without adding a second request in the common path.
        if (outboundConstraint.returnRouteId === undefined) {
          const detail = await getTripDetail(outboundConstraint.id);
          if (generation !== bookingGeneration || requestId !== searchRequestSequence) {
            return;
          }

          const latestOutboundState = get().outboundState;
          if (!latestOutboundState?.trip || latestOutboundState.trip.id !== outboundConstraint.id) {
            return;
          }

          outboundConstraint = {
            ...outboundConstraint,
            ...detail,
            operatorBadge: outboundConstraint.operatorBadge || detail.operatorBadge,
            busLabel: outboundConstraint.busLabel || detail.busLabel,
            busType: detail.busType || outboundConstraint.busType,
          };
          set({
            outboundState: {
              ...latestOutboundState,
              trip: outboundConstraint,
            },
          });
        }

        if (!outboundConstraint.returnRouteId?.trim()) {
          set({ tripResultsStatus: 'empty', trips: [] });
          return;
        }
      }

      const discoveredTrips = await searchTrips({
        originLocationCode,
        destinationLocationCode,
        departureDate,
        passengerCount,
        allowAlongRoutePickup: false,
      });

      if (generation !== bookingGeneration || requestId !== searchRequestSequence) {
        return;
      }
      const eligibleTrips = isReturnLeg && outboundConstraint
        ? discoveredTrips.filter((trip) => isEligibleReturnTrip(trip, outboundConstraint))
        : discoveredTrips;

      set({
        tripResultsStatus: eligibleTrips.length === 0 ? 'empty' : 'success',
        trips: eligibleTrips,
      });
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
        selectedShuttlePickup: null,
        selectedShuttleDropoff: null,
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
      const nextSelectedDropOff = matchedDropOff && matchedDropOff.status !== 'disabled'
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
        selectedShuttlePickup: (
          nextSelectedPickUp.stationId === enrichedTrip.originStationId
          && get().selectedShuttlePickup?.stationId === enrichedTrip.originStationId
        )
          ? get().selectedShuttlePickup
          : null,
        selectedShuttleDropoff: (
          nextSelectedDropOff.stationId === enrichedTrip.destinationStationId
          && get().selectedShuttleDropoff?.stationId === enrichedTrip.destinationStationId
        )
          ? get().selectedShuttleDropoff
          : null,
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
      set((state) => ({
        seatMap: seatRows,
        selectedSeats: reconcileSelectedSeats(seatRows, state.selectedSeats),
      }));
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
  // ─── Pick-up ─────────────────────────────────────────
  pickUpPoints: [],
  selectedPickUp: null,
  selectedShuttlePickup: null,
  setSelectedShuttlePickup: (pickup) => set({ selectedShuttlePickup: pickup }),
  selectPickUp: (point) => set((state) => {
    const selectedTripWithStops = state.selectedTrip as TripDetail | null;
    if (!selectedTripWithStops?.stops?.length) {
      return {
        selectedPickUp: point,
        selectedShuttlePickup: point.stationId === state.selectedTrip?.originStationId
          ? state.selectedShuttlePickup
          : null,
      };
    }

    const nextDropOffPoints = buildDropOffPoints(selectedTripWithStops, point);
    const currentDropOff = state.selectedDropOff
      ? nextDropOffPoints.find((candidate) => candidate.id === state.selectedDropOff?.id)
      : null;
    const terminalDropOff = buildTerminalDropOff(selectedTripWithStops);
    const nextSelectedDropOff = currentDropOff && currentDropOff.status !== 'disabled'
      ? currentDropOff
      : nextDropOffPoints.find((candidate) => candidate.id === terminalDropOff.id) ?? terminalDropOff;

    return {
      selectedPickUp: point,
      dropOffPoints: nextDropOffPoints,
      selectedDropOff: nextSelectedDropOff,
      selectedShuttlePickup: point.stationId === state.selectedTrip?.originStationId
        ? state.selectedShuttlePickup
        : null,
      selectedShuttleDropoff:
        nextSelectedDropOff.stationId === state.selectedTrip?.destinationStationId
          ? state.selectedShuttleDropoff
          : null,
    };
  }),

  // ─── Drop-off ────────────────────────────────────────
  dropOffPoints: [],
  selectedDropOff: null,
  selectedShuttleDropoff: null,
  setSelectedShuttleDropoff: (dropoff) => set({ selectedShuttleDropoff: dropoff }),
  selectDropOff: (point) => set((state) => ({
    selectedDropOff: point,
    selectedShuttleDropoff: point.stationId === state.selectedTrip?.destinationStationId
      ? state.selectedShuttleDropoff
      : null,
  })),

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
  bookingPaymentMethod: null,
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
        const paymentMethod = toBackendPaymentMethod(state.paymentMethod);
        const voucherCode = state.voucherCode || undefined;

        if (state.searchParams.isRoundTrip && (!state.outboundState || !state.returnState)) {
          throw new Error('Please complete both outbound and return trip details.');
        }

        if (state.searchParams.isRoundTrip && state.outboundState && state.returnState) {
          const payload = {
            outbound: buildBookingLegPayload(state.outboundState, 'Outbound trip'),
            return: buildBookingLegPayload(state.returnState, 'Return trip'),
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
          set({
            bookingStatus: 'success',
            bookingResult: result,
            bookingPaymentMethod: state.paymentMethod,
          });
          return result;
        }

        const payload = {
          ...buildBookingLegPayload({
            trip: state.selectedTrip,
            seats: state.selectedSeats,
            pickUp: state.selectedPickUp,
            dropOff: state.selectedDropOff,
            shuttlePickup: state.selectedShuttlePickup,
            shuttleDropoff: state.selectedShuttleDropoff,
          }),
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
        set({
          bookingStatus: 'success',
          bookingResult: result,
          bookingPaymentMethod: state.paymentMethod,
        });
        return result;
      } catch (error: unknown) {
        const apiError = generation === bookingGeneration
          ? toApiError(error)
          : staleBookingSessionError();

        if (generation === bookingGeneration) {
          if (!shouldRetainBookingIdempotencyKey(apiError)) {
            bookingIdempotency.reset();
          }
          if (shouldInvalidateShuttleDrafts(apiError)) {
            set((current) => ({
              selectedShuttlePickup: null,
              selectedShuttleDropoff: null,
              outboundState: current.outboundState
                ? {
                  ...current.outboundState,
                  shuttlePickup: null,
                  shuttleDropoff: null,
                }
                : null,
              returnState: current.returnState
                ? {
                  ...current.returnState,
                  shuttlePickup: null,
                  shuttleDropoff: null,
                }
                : null,
            }));
          }
          if (__DEV__ && apiError.code !== 'BOOKING_SEAT_COUNT_INVALID') {
            console.warn(
              `[Booking] Submission failed (${apiError.code}, ${apiError.statusCode ?? 'no-status'}).`,
            );
          }
          set({
            bookingStatus: 'error',
            bookingError: apiError,
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
    const {
      searchParams,
      currentLeg,
      selectedTrip,
      selectedSeats,
      outboundState,
      returnState,
    } = get();
    const selectedLegAmount = selectedTrip
      ? selectedTrip.price * selectedSeats.length
      : 0;
    const outboundAmount = currentLeg === 'outbound' && selectedTrip
      ? selectedLegAmount
      : outboundState?.trip
        ? outboundState.trip.price * outboundState.seats.length
        : 0;

    if (!searchParams.isRoundTrip) {
      return outboundAmount;
    }

    const returnAmount = currentLeg === 'return' && selectedTrip
      ? selectedLegAmount
      : returnState?.trip
        ? returnState.trip.price * returnState.seats.length
        : 0;

    return outboundAmount + returnAmount;
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
      selectedShuttlePickup: null,
      selectedShuttleDropoff: null,
      pickUpPoints: [],
      dropOffPoints: [],
      paymentMethod: 'vnpay',
      voucherCode: '',
      voucherDiscountPreview: 0,
      bookingStatus: 'idle',
      bookingResult: null,
      bookingPaymentMethod: null,
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
      pickUpPoints: [],
      dropOffPoints: [],
      selectedPickUp: null,
      selectedDropOff: null,
      selectedShuttlePickup: null,
      selectedShuttleDropoff: null,
      paymentMethod: 'vnpay',
      voucherCode: '',
      voucherDiscountPreview: 0,
      bookingStatus: 'idle',
      bookingResult: null,
      bookingPaymentMethod: null,
      bookingError: null,
      highestStepReached: 1,
    });
  },
}));

registerSessionCleanup('booking', () => {
  useBookingStore.getState().resetBooking();
});
