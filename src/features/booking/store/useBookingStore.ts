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
  CreateBookingPayload
} from '../types';
import { searchTrips, getSeatMap } from '../../trip/api/tripApi';
import { createBooking as apiCreateBooking, createRoundTripBooking } from '../api/bookingApi';
import { toApiError } from '@shared/api/errors';
import { toTripSearchDate } from '../utils/searchParams';

type BookingSubmissionResult = BookingResult | RoundTripResult;
type LocationPayload = CreateBookingPayload['pickup'];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toBackendPaymentMethod = (method: PaymentMethod): 'WALLET' | 'VNPAY' => {
  return method === 'wallet' ? 'WALLET' : 'VNPAY';
};

const buildTerminalPickUp = (trip: BusTrip): PickUpPoint => ({
  id: `station-${trip.originStationId}`,
  stationId: trip.originStationId,
  name: trip.departureStation,
  address: trip.departureCity,
  time: trip.departureTime,
  status: 'current',
});

const buildTerminalDropOff = (trip: BusTrip): DropOffPoint => ({
  id: `station-${trip.destinationStationId}`,
  stationId: trip.destinationStationId,
  name: trip.arrivalStation,
  address: trip.arrivalCity,
  time: trip.arrivalTime,
  status: 'current',
});

const toLocationPayload = (
  point: PickUpPoint | DropOffPoint | null,
  fallbackStationId?: string,
): LocationPayload => {
  const stationId = point?.stationId ?? fallbackStationId;
  if (stationId) {
    return { stationId };
  }

  const stopId = point?.stopId ?? (point?.id && UUID_PATTERN.test(point.id) ? point.id : undefined);
  if (stopId) {
    return { stopId };
  }

  return {};
};

const makeSeatRequests = (seats: Seat[], contactInfo: ContactInfo) =>
  seats.map((seat) => ({
    seatNumber: seat.id,
    passenger: {
      fullName: contactInfo.fullName.trim(),
      phoneNumber: contactInfo.phone.trim(),
      idNumber: contactInfo.idNumber.trim(),
    },
  }));

const assertContactInfo = (contactInfo: ContactInfo) => {
  if (!contactInfo.fullName.trim() || !contactInfo.phone.trim() || !contactInfo.idNumber.trim()) {
    throw new Error('Full name, phone number and ID number are required to book tickets.');
  }
};

const assertLocationPayload = (label: string, payload: LocationPayload) => {
  const provided = Number(Boolean(payload.stationId)) + Number(Boolean(payload.stopId));
  if (provided !== 1) {
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
import {
  MOCK_CONTACT,
  MOCK_DROP_OFF_POINTS,
  MOCK_PICK_UP_POINTS,
} from '../data/mockData';

interface BookingStore {
  // ─── Search ──────────────────────────────────────────
  searchParams: SearchParams & { isRoundTrip?: boolean; returnDate?: string };
  setSearchParams: (params: Partial<SearchParams & { isRoundTrip?: boolean; returnDate?: string }>) => void;
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
      const originStationId = (
        isReturnLeg ? searchParams.destinationStationId : searchParams.originStationId
      ).trim();
      const destinationStationId = (
        isReturnLeg ? searchParams.originStationId : searchParams.destinationStationId
      ).trim();

      if (!originLocationCode || !destinationLocationCode) {
        throw new Error('Please select both departure and destination provinces.');
      }
      if (originLocationCode === destinationLocationCode) {
        throw new Error('Departure and destination provinces must be different.');
      }

      const requestedDate = isReturnLeg ? searchParams.returnDate : searchParams.date;
      const departureDate = toTripSearchDate(requestedDate ?? '');
      const passengerCount = Math.max(1, Math.trunc(searchParams.passengers));

      const trips = await searchTrips({
        originLocationCode,
        destinationLocationCode,
        ...(originStationId ? { originStationId } : {}),
        ...(destinationStationId ? { destinationStationId } : {}),
        departureDate,
        passengerCount,
        allowAlongRoutePickup: false,
      });
      set({ tripResultsStatus: trips.length === 0 ? 'empty' : 'success', trips });
    } catch (error) {
      console.warn('[Booking] Search trips failed:', error);
      set({ tripResultsStatus: 'error' });
    }
  },

  // ─── Selected Trip ───────────────────────────────────
  selectedTrip: null,
  selectTrip: (trip) => set((state) => {
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
      voucherCode: '',
      voucherDiscountPreview: 0,
      highestStepReached: Math.max(state.highestStepReached, state.currentLeg === 'return' ? 5 : 1),
    };
  }),

  // ─── Seats ───────────────────────────────────────────
  seatMap: [],
  selectedSeats: [],
  initSeatMap: async () => {
    const { selectedTrip } = get();
    if (!selectedTrip?.id) return;
    try {
      const seatRows = await getSeatMap(selectedTrip.id);
      set({ seatMap: seatRows, selectedSeats: [] });
    } catch (error) {
      console.warn('[Booking] Seat map fetch failed:', error);
    }
  },
  toggleSeat: (seatId) =>
    set((state) => {
      const newMap = state.seatMap.map((row) => ({
        ...row,
        leftSeats: row.leftSeats.map((s) => {
          if (s.id === seatId && s.status !== 'sold') {
            return {
              ...s,
              status:
                s.status === 'selected'
                  ? ('available' as const)
                  : ('selected' as const),
            };
          }
          return s;
        }),
        rightSeats: row.rightSeats.map((s) => {
          if (s.id === seatId && s.status !== 'sold') {
            return {
              ...s,
              status:
                s.status === 'selected'
                  ? ('available' as const)
                  : ('selected' as const),
            };
          }
          return s;
        }),
      }));

      const selected: Seat[] = [];
      newMap.forEach((row) => {
        [...row.leftSeats, ...row.rightSeats].forEach((s) => {
          if (s.status === 'selected') selected.push(s);
        });
      });

      return { seatMap: newMap, selectedSeats: selected };
    }),

  // ─── Contact Info ────────────────────────────────────
  contactInfo: MOCK_CONTACT,
  setContactInfo: (info) =>
    set((state) => ({
      contactInfo: { ...state.contactInfo, ...info },
    })),

  // ─── Pick-up ─────────────────────────────────────────
  pickUpPoints: MOCK_PICK_UP_POINTS,
  selectedPickUp: MOCK_PICK_UP_POINTS[0],
  selectPickUp: (point) => set({ selectedPickUp: point }),

  // ─── Drop-off ────────────────────────────────────────
  dropOffPoints: MOCK_DROP_OFF_POINTS,
  selectedDropOff: MOCK_DROP_OFF_POINTS[0],
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
  createBooking: async () => {
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
            seats: makeSeatRequests(state.outboundState.seats, state.contactInfo),
          },
          return: {
            tripId: returnTrip.id,
            pickup: returnPickup,
            dropoff: returnDropoff,
            seats: makeSeatRequests(state.returnState.seats, state.contactInfo),
          },
          voucherCode,
          paymentMethod,
        };
        const result = await createRoundTripBooking(payload);
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
          seats: makeSeatRequests(state.selectedSeats, state.contactInfo),
          voucherCode,
          paymentMethod,
        };
        const result = await apiCreateBooking(payload);
        set({ bookingStatus: 'success', bookingResult: result });
        return result;
      }
    } catch (error: unknown) {
      const apiError = toApiError(error);
      console.error('[Booking] Create failed:', error);
      set({ 
        bookingStatus: 'error', 
        bookingError: apiError.message || 'Could not create your booking. Please try again.'
      });
      throw apiError;
    }
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
  resetBooking: () =>
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
      contactInfo: MOCK_CONTACT,
      pickUpPoints: MOCK_PICK_UP_POINTS,
      dropOffPoints: MOCK_DROP_OFF_POINTS,
      selectedPickUp: MOCK_PICK_UP_POINTS[0],
      selectedDropOff: MOCK_DROP_OFF_POINTS[0],
      paymentMethod: 'vnpay',
      voucherCode: '',
      voucherDiscountPreview: 0,
      bookingStatus: 'idle',
      bookingResult: null,
      bookingError: null,
      highestStepReached: 1,
    }),
}));
