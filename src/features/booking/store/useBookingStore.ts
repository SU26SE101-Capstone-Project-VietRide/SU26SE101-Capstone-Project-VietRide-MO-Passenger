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
import { getLegFareTotal } from '../utils/bookingPricing';
import { isEligibleReturnTrip } from '../utils/roundTripEligibility';

export {
  CHECKOUT_STEP,
  getTotalSteps,
  OUTBOUND_SEAT_STEP,
  OUTBOUND_STEPS,
  PAYMENT_STEP,
  RETURN_SEAT_STEP,
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
  // Station boarding uses trip.effectiveFare via bookingPricing (not stop fare).
  effectiveFare: trip.effectiveFare,
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
      // Copy by stop id identity — never match by stop name.
      effectiveFare: stop.effectiveFare ?? null,
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

/**
 * Keep the same idempotency key for ambiguous / in-flight outcomes.
 * IDEMPOTENCY_REQUEST_PENDING (409) means BE still has the original request —
 * a new key on the next tap can create a duplicate booking/payment.
 */
const shouldRetainBookingIdempotencyKey = (error: ApiRequestError): boolean =>
  error.isNetworkError
  || error.code === 'REQUEST_TIMEOUT'
  || error.code === 'IDEMPOTENCY_REQUEST_PENDING'
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

  // Allow-list only: never treat unavailable/unknown as selectable via !== 'sold'.
  const availableSeats = new Map<string, Seat>();
  for (const row of seatRows) {
    for (const seat of [...row.leftSeats, ...row.rightSeats]) {
      if (seat.status === 'available') availableSeats.set(seat.id, seat);
    }
  }

  return selectedSeats.flatMap((selectedSeat) => {
    const refreshedSeat = availableSeats.get(selectedSeat.id);
    return refreshedSeat
      ? [{ ...refreshedSeat, status: 'selected' as const }]
      : [];
  });
};

export type BookingSeatConflictLeg = 'outbound' | 'return';

const uniqueConflictLegs = (
  legs: readonly BookingSeatConflictLeg[],
): BookingSeatConflictLeg[] => {
  const seen = new Set<BookingSeatConflictLeg>();
  const result: BookingSeatConflictLeg[] = [];
  for (const leg of legs) {
    if (!seen.has(leg)) {
      seen.add(leg);
      result.push(leg);
    }
  }
  return result;
};

/**
 * Exact BE field allowlist only (no endsWith heuristics).
 * - one-way: always outbound
 * - RT `outbound.seatNumbers` → outbound
 * - RT `return.seatNumbers` → return
 * - RT top-level `seatNumbers` or unknown/missing → both legs
 */
export const resolveSeatConflictLegsFromError = (
  isRoundTrip: boolean,
  error?: ApiRequestError,
): BookingSeatConflictLeg[] => {
  if (!isRoundTrip) {
    return ['outbound'];
  }

  const fields = error?.fields ?? [];
  if (fields.length === 0) {
    return uniqueConflictLegs(['outbound', 'return']);
  }

  const legs: BookingSeatConflictLeg[] = [];
  let sawKnownField = false;

  for (const fieldError of fields) {
    const field = fieldError.field.trim().toLowerCase();
    if (field === 'outbound.seatnumbers') {
      sawKnownField = true;
      legs.push('outbound');
      continue;
    }
    if (field === 'return.seatnumbers') {
      sawKnownField = true;
      legs.push('return');
      continue;
    }
    if (field === 'seatnumbers') {
      // Ambiguous on round-trip — reconcile both legs.
      sawKnownField = true;
      legs.push('outbound', 'return');
    }
  }

  if (!sawKnownField || legs.length === 0) {
    return uniqueConflictLegs(['outbound', 'return']);
  }
  return uniqueConflictLegs(legs);
};

/**
 * Authoritative conflicted seat labels from BE fields.
 * Prefer structured `values` (from value[]), then message tokens — matches
 * TripServiceClient.ExtractSeatNumbers on BE.
 */
export const extractConflictedSeatLabels = (
  error?: ApiRequestError,
): string[] => {
  if (!error?.fields?.length) return [];
  const labels: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string): void => {
    for (const token of raw.split(/[,;\s]+/)) {
      const seat = token.trim();
      if (!seat || seen.has(seat)) continue;
      seen.add(seat);
      labels.push(seat);
    }
  };

  for (const fieldError of error.fields) {
    const field = fieldError.field.trim().toLowerCase();
    const isSeatField = field === 'seatnumbers'
      || field === 'outbound.seatnumbers'
      || field === 'return.seatnumbers';
    if (!isSeatField) continue;

    if (fieldError.values?.length) {
      for (const value of fieldError.values) push(value);
      continue;
    }
    if (fieldError.message?.trim()) push(fieldError.message);
  }
  return labels;
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

  /** Legs that still need seat re-selection after BOOKING_SEAT_UNAVAILABLE. */
  seatConflictLegs: BookingSeatConflictLeg[];
  clearSeatConflictLeg: (leg: BookingSeatConflictLeg) => void;
  clearAllSeatConflicts: () => void;
  /**
   * After a definitive seat conflict: refresh seat maps for affected trip(s),
   * reconcile selection per tripId+seatNumber, never auto-retry booking.
   * Uses BE error.fields (outbound.seatNumbers / return.seatNumbers) when present.
   */
  handleSeatUnavailableConflict: (error?: ApiRequestError) => Promise<void>;

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
    // Clear seat map before switching legs to avoid layout flash.
    seatMap: [],
    selectedTrip: null,
    selectedSeats: [],
    selectedPickUp: null,
    selectedDropOff: null,
    selectedShuttlePickup: null,
    selectedShuttleDropoff: null,
    pickUpPoints: [],
    dropOffPoints: [],
    seatConflictLegs: state.seatConflictLegs.filter((leg) => leg !== 'outbound'),
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
    seatConflictLegs: state.seatConflictLegs.filter((leg) => leg !== 'return'),
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
    seatConflictLegs: state.seatConflictLegs.filter((leg) => leg !== 'outbound'),
    highestStepReached: Math.max(state.highestStepReached, 5),
  })),
  restoreLegForEdit: (leg) => set((state) => {
    const snapshot = leg === 'outbound' ? state.outboundState : state.returnState;
    if (!snapshot?.trip) {
      return {
        currentLeg: leg,
        seatMap: [],
        bookingError: null,
        bookingStatus: 'idle' as const,
      };
    }

    const pickUpPoints = snapshot.trip === state.selectedTrip
      ? state.pickUpPoints
      : [buildTerminalPickUp(snapshot.trip)];
    const dropOffPoints = snapshot.trip === state.selectedTrip
      ? state.dropOffPoints
      : [buildTerminalDropOff(snapshot.trip)];

    return {
      currentLeg: leg,
      // Clear prior seat map so the next initSeatMap does not flash another trip.
      seatMap: [],
      selectedTrip: snapshot.trip,
      selectedSeats: snapshot.seats,
      selectedPickUp: snapshot.pickUp,
      selectedDropOff: snapshot.dropOff,
      selectedShuttlePickup: snapshot.shuttlePickup ?? null,
      selectedShuttleDropoff: snapshot.shuttleDropoff ?? null,
      pickUpPoints,
      dropOffPoints,
      // Clear stale checkout error so Payment does not keep blocking UI after edit.
      bookingError: null,
      bookingStatus: 'idle' as const,
    };
  }),
  seatConflictLegs: [],
  clearSeatConflictLeg: (leg) => set((state) => ({
    seatConflictLegs: state.seatConflictLegs.filter((item) => item !== leg),
  })),
  clearAllSeatConflicts: () => set({ seatConflictLegs: [] }),
  handleSeatUnavailableConflict: async (error) => {
    const generation = bookingGeneration;
    const state = get();
    const isRoundTrip = Boolean(state.searchParams.isRoundTrip);

    // BE v1.63+: field-scoped legs. Fallback both RT legs only when fields missing/unknown.
    const conflictLegs = resolveSeatConflictLegsFromError(isRoundTrip, error);
    const conflictedLabels = new Set(
      extractConflictedSeatLabels(error).map((label) => label.toUpperCase()),
    );
    const dropConflicted = (seats: Seat[]): Seat[] => {
      if (conflictedLabels.size === 0) return seats;
      return seats.filter((seat) => {
        const label = String(seat.label || seat.id).toUpperCase();
        return !conflictedLabels.has(label);
      });
    };

    set({ seatConflictLegs: conflictLegs });

    type RefreshTarget = {
      leg: BookingSeatConflictLeg;
      tripId: string;
      seats: Seat[];
    };

    const targets: RefreshTarget[] = [];
    const includeOutbound = conflictLegs.includes('outbound');
    const includeReturn = conflictLegs.includes('return');

    if (isRoundTrip) {
      if (includeOutbound && state.outboundState?.trip?.id) {
        targets.push({
          leg: 'outbound',
          tripId: state.outboundState.trip.id,
          seats: state.outboundState.seats,
        });
      }
      if (includeReturn && state.returnState?.trip?.id) {
        targets.push({
          leg: 'return',
          tripId: state.returnState.trip.id,
          seats: state.returnState.seats,
        });
      }
    } else if (state.selectedTrip?.id) {
      targets.push({
        leg: 'outbound',
        tripId: state.selectedTrip.id,
        seats: state.selectedSeats,
      });
    } else if (state.outboundState?.trip?.id) {
      targets.push({
        leg: 'outbound',
        tripId: state.outboundState.trip.id,
        seats: state.outboundState.seats,
      });
    }

    // Dedupe network fetches by trip id while keeping leg-scoped reconcile.
    const uniqueTripIds = [...new Set(targets.map((target) => target.tripId))];
    const seatMapByTripId = new Map<string, SeatRow[] | null>();

    await Promise.all(uniqueTripIds.map(async (tripId) => {
      try {
        const seatRows = await getSeatMap(tripId);
        seatMapByTripId.set(tripId, seatRows);
      } catch {
        seatMapByTripId.set(tripId, null);
      }
    }));

    if (generation !== bookingGeneration) {
      return;
    }

    const nextConflictLegs = conflictLegs;

    set((current) => {
      if (generation !== bookingGeneration) {
        return current;
      }

      let nextOutbound = current.outboundState;
      let nextReturn = current.returnState;
      let nextSelectedSeats = current.selectedSeats;
      let nextSeatMap = current.seatMap;

      for (const target of targets) {
        const seatRows = seatMapByTripId.get(target.tripId);
        let nextSeats: Seat[];
        if (seatRows) {
          // Reconcile by tripId + seatNumber; never merge same labels across legs.
          nextSeats = dropConflicted(reconcileSelectedSeats(seatRows, target.seats));
        } else {
          // Refresh failed: still drop authoritative conflicted labels so user
          // cannot resubmit the same 409 seats.
          nextSeats = dropConflicted(target.seats);
        }

        if (target.leg === 'outbound' && nextOutbound?.trip?.id === target.tripId) {
          nextOutbound = { ...nextOutbound, seats: nextSeats };
        }
        if (target.leg === 'return' && nextReturn?.trip?.id === target.tripId) {
          nextReturn = { ...nextReturn, seats: nextSeats };
        }
        if (current.selectedTrip?.id === target.tripId) {
          nextSelectedSeats = nextSeats;
          if (seatRows) nextSeatMap = seatRows;
        }
      }

      // One-way / active selection when no target matched but labels known.
      if (targets.length === 0 && conflictedLabels.size > 0) {
        nextSelectedSeats = dropConflicted(current.selectedSeats);
      }

      return {
        outboundState: nextOutbound,
        returnState: nextReturn,
        selectedSeats: nextSelectedSeats,
        seatMap: nextSeatMap,
        seatConflictLegs: nextConflictLegs,
      };
    });
  },

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
        bookingError: null,
        bookingStatus: 'idle' as const,
        seatConflictLegs: [],
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

      // Allow-list only: unavailable/sold/unknown must not enter selection.
      if (!targetSeat || targetSeat.status !== 'available') {
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
            seatConflictLegs: [],
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
          seatConflictLegs: [],
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
          // Definitive 409 seat conflict: refresh maps, never auto-retry submit.
          if (apiError.code === 'BOOKING_SEAT_UNAVAILABLE') {
            get().handleSeatUnavailableConflict(apiError).catch(() => undefined);
          }
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
      selectedPickUp,
      outboundState,
      returnState,
    } = get();
    const selectedLegAmount = selectedTrip
      ? getLegFareTotal(selectedTrip, selectedSeats, selectedPickUp)
      : 0;
    const outboundAmount = currentLeg === 'outbound' && selectedTrip
      ? selectedLegAmount
      : outboundState?.trip
        ? getLegFareTotal(
          outboundState.trip,
          outboundState.seats,
          outboundState.pickUp,
        )
        : 0;

    if (!searchParams.isRoundTrip) {
      return outboundAmount;
    }

    const returnAmount = currentLeg === 'return' && selectedTrip
      ? selectedLegAmount
      : returnState?.trip
        ? getLegFareTotal(
          returnState.trip,
          returnState.seats,
          returnState.pickUp,
        )
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
      seatConflictLegs: [],
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
      seatConflictLegs: [],
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
