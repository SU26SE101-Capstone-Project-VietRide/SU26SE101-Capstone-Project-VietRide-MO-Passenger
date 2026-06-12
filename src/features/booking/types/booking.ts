/**
 * VietRide Booking — Type Definitions
 *
 * All types used across the ticket booking flow.
 */

// ─── Bus Trip ─────────────────────────────────────────────
export type BusType = 'sleeper' | 'limousine' | 'standard';

export interface BusTrip {
  id: string;
  operatorBadge: string; // e.g. "⭐ VietRide"
  departureCity: string;
  arrivalCity: string;
  departureTime: string; // e.g. "07:00"
  arrivalTime: string;   // e.g. "13:30"
  departureStation: string;
  arrivalStation: string;
  price: number;
  busType: BusType;
  busLabel: string;       // e.g. "Luxury Sleeper 34s"
  seatsLeft: number;
  totalSeats: number;
  durationHours: number;
}

// ─── Seats ────────────────────────────────────────────────
export type SeatStatus = 'available' | 'selected' | 'sold';

export interface Seat {
  id: string;
  label: string;  // e.g. "A1", "B2"
  status: SeatStatus;
}

export interface SeatRow {
  rowLabel: string; // e.g. "A", "B"
  leftSeats: Seat[];
  rightSeats: Seat[];
}

// ─── Pick-up & Drop-off Points ─────────────────────────────
export type StopStatus = 'current' | 'available' | 'disabled';

export interface DropOffPoint {
  id: string;
  name: string;
  address: string;
  time: string;
  status: StopStatus;
  refundAmount?: number;
}

export interface PickUpPoint {
  id: string;
  name: string;
  address: string;
  time: string;
  status: StopStatus;
  refundAmount?: number;
  disabledReason?: string;
}

// ─── Contact Info ─────────────────────────────────────────
export interface ContactInfo {
  fullName: string;
  phoneCountryCode: string;
  phone: string;
  email: string;
}

// ─── Payment ──────────────────────────────────────────────
export type PaymentMethod = 'vnpay' | 'card';

// ─── Search Params ────────────────────────────────────────
export interface SearchParams {
  from: string;
  to: string;
  date: string;
  passengers: number;
}

// ─── Popular Route ────────────────────────────────────────
export interface PopularRoute {
  id: string;
  from: string;
  to: string;
  price: string;
  gradientColors: [string, string];
}

// ─── Recent Search ────────────────────────────────────────
export interface RecentSearch {
  id: string;
  route: string;
  date: string;
}

// ─── Booking Result ───────────────────────────────────────
export interface BookingResult {
  bookingRef: string;
  operatorName: string;
  operatorSubtitle: string;
  status: 'CONFIRMED';
  departureCode: string;
  departureName: string;
  arrivalCode: string;
  arrivalName: string;
  departureDate: string;
  departureTime: string;
  seatNumber: string;
  passengerName: string;
}

// ─── Trip Results State ───────────────────────────────────
export type TripResultsStatus = 'loading' | 'success' | 'empty' | 'error';
