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
} from '../types';

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
  MOCK_TRIPS,
  MOCK_SEAT_MAP,
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

  // ─── Reset ───────────────────────────────────────────
  resetBooking: () => void;
}

export const useBookingStore = create<BookingStore>((set, get) => ({
  // ─── Search ──────────────────────────────────────────
  searchParams: {
    from: '',
    to: '',
    date: 'Today',
    passengers: 1,
    isRoundTrip: false,
    returnDate: '',
  },
  setSearchParams: (params) =>
    set((state) => ({
      searchParams: { ...state.searchParams, ...params },
    })),
  swapCities: () =>
    set((state) => ({
      searchParams: {
        ...state.searchParams,
        from: state.searchParams.to,
        to: state.searchParams.from,
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
  searchTrips: () => {
    set({ tripResultsStatus: 'loading', trips: [] });
    // Simulate network delay
    setTimeout(() => {
      set({ tripResultsStatus: 'success', trips: MOCK_TRIPS });
    }, 2000);
  },

  // ─── Selected Trip ───────────────────────────────────
  selectedTrip: null,
  selectTrip: (trip) => set({
    selectedTrip: trip,
    selectedSeats: [],
    highestStepReached: 1,
  }),

  // ─── Seats ───────────────────────────────────────────
  seatMap: [],
  selectedSeats: [],
  initSeatMap: () => {
    // Deep clone so mutations don't affect mock source
    const cloned = MOCK_SEAT_MAP.map((row) => ({
      ...row,
      leftSeats: row.leftSeats.map((s) => ({ ...s })),
      rightSeats: row.rightSeats.map((s) => ({ ...s })),
    }));
    // Collect initially selected seats
    const selected: Seat[] = [];
    cloned.forEach((row) => {
      [...row.leftSeats, ...row.rightSeats].forEach((s) => {
        if (s.status === 'selected') selected.push(s);
      });
    });
    set({ seatMap: cloned, selectedSeats: selected });
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

  // ─── Computed ────────────────────────────────────────
  totalPrice: () => {
    const { selectedTrip, selectedSeats, outboundState, returnState } = get();
    let total = 0;
    if (selectedTrip) {
      total += selectedTrip.price * Math.max(selectedSeats.length, 1);
    }
    if (outboundState?.trip) {
      total += outboundState.trip.price * Math.max(outboundState.seats.length, 1);
    }
    if (returnState?.trip) {
      total += returnState.trip.price * Math.max(returnState.seats.length, 1);
    }
    return total;
  },

  // ─── Reset ───────────────────────────────────────────
  resetBooking: () =>
    set({
      searchParams: { from: '', to: '', date: 'Today', passengers: 1, isRoundTrip: false, returnDate: '' },
      currentLeg: 'outbound',
      outboundState: null,
      returnState: null,
      tripResultsStatus: 'loading',
      trips: [],
      selectedTrip: null,
      seatMap: [],
      selectedSeats: [],
      contactInfo: MOCK_CONTACT,
      selectedPickUp: MOCK_PICK_UP_POINTS[0],
      selectedDropOff: MOCK_DROP_OFF_POINTS[0],
      paymentMethod: 'vnpay',
      highestStepReached: 1,
    }),
}));
