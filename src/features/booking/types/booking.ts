/**
 * VietRide Booking — Type Definitions
 *
 * All types used across the ticket booking flow.
 */

import type { BusType, BusTrip } from '../../trip/types/trip';
import type { PaymentMethod as SharedPaymentMethod } from '@shared/utils/paymentMethod';
export type { BusType, BusTrip };

// ─── Trip Filters ────────────────────────────────────────
export type TripTimeSlot = 'all' | 'morning' | 'afternoon' | 'evening' | 'night';
export type TripPriceRange = 'all' | 'under_350k' | '350k_450k' | 'over_450k';

export interface TripFilterState {
  operatorBadge: string | 'all';
  timeSlot: TripTimeSlot;
  priceRange: TripPriceRange;
}

// ─── Seats ────────────────────────────────────────────────
export type SeatStatus = 'available' | 'selected' | 'sold';

export interface Seat {
  id: string;
  label: string;  // e.g. "A1", "B2"
  status: SeatStatus;
  row?: number;
  col?: number;
  deck?: number;
  type?: string;
}

export interface SeatRow {
  rowLabel: string; // e.g. "A", "B"
  rowNumber?: number;
  deck?: number;
  columns?: number[];
  leftSeats: Seat[];
  rightSeats: Seat[];
}

// ─── Pick-up & Drop-off Points ─────────────────────────────
export type StopStatus = 'current' | 'available' | 'disabled';

export interface DropOffPoint {
  id: string;
  stationId?: string;
  stopId?: string;
  name: string;
  address: string;
  time: string;
  status: StopStatus;
  orderIndex?: number;
  refundAmount?: number;
  disabledReason?: string;
}

export interface PickUpPoint {
  id: string;
  stationId?: string;
  stopId?: string;
  name: string;
  address: string;
  time: string;
  status: StopStatus;
  orderIndex?: number;
  refundAmount?: number;
  disabledReason?: string;
}

// ─── Contact Info ─────────────────────────────────────────
export interface ContactInfo {
  fullName: string;
  phoneCountryCode: string;
  phone: string;
  email: string;
  idNumber: string;
}

// ─── Payment ──────────────────────────────────────────────
export type PaymentMethod = SharedPaymentMethod;

// ─── Search Params ────────────────────────────────────────
export interface SearchParams {
  from: string;
  to: string;
  originLocationCode: string;
  destinationLocationCode: string;
  originStationId: string;
  destinationStationId: string;
  originStationName: string;
  destinationStationName: string;
  date: string;
  passengers: number;
}

// ─── Popular Route ────────────────────────────────────────
// ─── Recent Search ────────────────────────────────────────
// ─── Booking Result ───────────────────────────────────────
export interface BookingResult {
  bookingId: string;
  bookingCode: string;
  status: 'PENDING_PAYMENT' | 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  totalAmount: number;
  discountAmount: number;
  paymentRedirectUrl: string | null;
  tickets: BookingTicketResult[];
}

export interface BookingTicketResult {
  ticketId: string;
  ticketCode: string;
  seatNumber: string;
  status: string;
  fareAmount: number;
  discountAmount: number;
  paidAmount: number;
}

export interface RoundTripResult {
  bookingGroupId: string;
  outbound: {
    bookingId: string;
    bookingCode: string;
    totalAmount: number;
    discountAmount: number;
    tickets: BookingTicketResult[];
  };
  return: {
    bookingId: string;
    bookingCode: string;
    totalAmount: number;
    discountAmount: number;
    tickets: BookingTicketResult[];
  };
  grandTotal: number;
  paymentRedirectUrl: string | null;
}

// ─── Trip Results State ───────────────────────────────────
export type TripResultsStatus = 'loading' | 'success' | 'empty' | 'error';

// ─── API Payloads ─────────────────────────────────────────
export interface CreateBookingPayload {
  tripId: string;
  pickup: {
    stationId?: string;
    stopId?: string;
  };
  dropoff: {
    stationId?: string;
    stopId?: string;
  };
  seats: Array<{
    seatNumber: string;
    passenger: {
      fullName: string;
      phoneNumber: string;
      idNumber: string;
    };
  }>;
  voucherCode?: string;
  paymentMethod: 'WALLET' | 'VNPAY';
}

export interface CreateRoundTripPayload {
  outbound: Omit<CreateBookingPayload, 'voucherCode' | 'paymentMethod'>;
  return: Omit<CreateBookingPayload, 'voucherCode' | 'paymentMethod'>;
  voucherCode?: string;
  paymentMethod: 'WALLET' | 'VNPAY';
}

export interface BookingHistoryItem {
  id: string; // bookingId
  bookingCode: string;
  tripId: string;
  originStationName: string;
  destinationStationName: string;
  departureDateTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  totalAmount: number;
}

export interface AvailableVoucherItem {
  id: string;
  code: string;
  name: string;
  type: 'PERCENT_OFF' | 'FIXED_AMOUNT' | string;
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  discountAmount: number;
  applicableServices: string[];
  applicablePaymentMethods: string[];
  validUntil: string;
}

export interface GetAvailableVouchersParams {
  service: 'BOOKING' | 'PARCEL' | string;
  tripId?: string;
  operatorId?: string;
  routeId?: string;
  paymentMethod?: 'WALLET' | 'VNPAY';
  orderAmount?: number;
}

export interface PromotionItem {
  voucherId: string;
  code: string;
  name: string;
  type: 'PERCENT_OFF' | 'FIXED_AMOUNT' | string;
  value: number;
  applicableServices: string[];
  validUntil: string;
}
