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
  TripResultsStatus,
} from '../types';
import {
  MOCK_TRIPS,
  MOCK_SEAT_MAP,
  MOCK_CONTACT,
  MOCK_DROP_OFF_POINTS,
} from '../data/mockData';

interface BookingStore {
  // ─── Search ──────────────────────────────────────────
  searchParams: SearchParams;
  setSearchParams: (params: Partial<SearchParams>) => void;
  swapCities: () => void;

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

  // ─── Drop-off ────────────────────────────────────────
  dropOffPoints: DropOffPoint[];
  selectedDropOff: DropOffPoint | null;
  selectDropOff: (point: DropOffPoint) => void;

  // ─── Payment ─────────────────────────────────────────
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;

  // ─── Computed ────────────────────────────────────────
  totalPrice: () => number;

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
  selectTrip: (trip) => set({ selectedTrip: trip }),

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

  // ─── Drop-off ────────────────────────────────────────
  dropOffPoints: MOCK_DROP_OFF_POINTS,
  selectedDropOff: MOCK_DROP_OFF_POINTS[0],
  selectDropOff: (point) => set({ selectedDropOff: point }),

  // ─── Payment ─────────────────────────────────────────
  paymentMethod: 'vnpay',
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  // ─── Computed ────────────────────────────────────────
  totalPrice: () => {
    const { selectedTrip, selectedSeats } = get();
    if (!selectedTrip) return 0;
    return selectedTrip.price * Math.max(selectedSeats.length, 1);
  },

  // ─── Reset ───────────────────────────────────────────
  resetBooking: () =>
    set({
      searchParams: { from: '', to: '', date: 'Today', passengers: 1 },
      tripResultsStatus: 'loading',
      trips: [],
      selectedTrip: null,
      seatMap: [],
      selectedSeats: [],
      contactInfo: MOCK_CONTACT,
      selectedDropOff: MOCK_DROP_OFF_POINTS[0],
      paymentMethod: 'vnpay',
    }),
}));
