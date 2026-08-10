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
export type SeatStatus = 'available' | 'selected' | 'sold' | 'unavailable';

export interface Seat {
  id: string;
  label: string;  // e.g. "A1", "B2"
  status: SeatStatus;
  row?: number;
  col?: number;
  deck?: number;
  type?: string;
  disabledReason?: string | null;
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
  estimatedArrivalTime?: string | null;
  status: StopStatus;
  orderIndex?: number;
  refundAmount?: number;
  disabledReason?: string;
  disabledReasonKey?: string;
}

export interface PickUpPoint {
  id: string;
  stationId?: string;
  stopId?: string;
  name: string;
  address: string;
  time: string;
  estimatedArrivalTime?: string | null;
  status: StopStatus;
  orderIndex?: number;
  refundAmount?: number;
  disabledReason?: string;
  disabledReasonKey?: string;
  /** Copied from TripStop.effectiveFare by stop id — never name-matched. */
  effectiveFare?: number | null;
}

// ─── Contact Info ─────────────────────────────────────────
// ─── Payment ──────────────────────────────────────────────
export type PaymentMethod = SharedPaymentMethod;

// ─── Search Params ────────────────────────────────────────
export interface SearchParams {
  from: string;
  to: string;
  /**
   * Official PROVINCE|MUNICIPALITY code → wire `originProvinceCode`
   * (e.g. "79", never legacy "HCM").
   */
  originLocationCode: string;
  destinationLocationCode: string;
  /** Optional leaf → wire `originWardCode` (5-digit). */
  originWardCode: string;
  destinationWardCode: string;
  /** Station mode → wire `originStationId` / `destinationStationId`. */
  originStationId: string;
  destinationStationId: string;
  originStationName: string;
  destinationStationName: string;
  date: string;
  passengers: number;
}

export type BookingSearchPrefill = Partial<SearchParams & {
  isRoundTrip: boolean;
  returnDate: string;
}>;

export type BookingEntryIntent =
  | { type: 'search' }
  | {
    type: 'promotion';
    pendingVoucher: {
      voucherId: string;
      code: string;
    };
  };

// ─── Popular Route ────────────────────────────────────────
// ─── Recent Search ────────────────────────────────────────
// ─── Booking Result ───────────────────────────────────────
export interface VnPaySdkMeta {
  tmnCode: string;
  scheme: string;
  isSandbox: boolean;
}

export interface BookingResult {
  bookingId: string;
  bookingCode: string;
  status: BookingCreationStatus;
  totalAmount: number;
  discountAmount: number;
  paymentId: string | null;
  paymentRedirectUrl: string | null;
  /** Present on MOBILE_SDK VNPay charges (BE v1.72+). */
  paymentReturnMode?: 'MOBILE_SDK' | string | null;
  vnpaySdk?: VnPaySdkMeta | null;
  tickets: BookingTicketResult[];
}

export type BookingCreationStatus = 'PENDING_PAYMENT' | 'CONFIRMED';

export type BookingStatus =
  | BookingCreationStatus
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'PARTIAL_NO_SHOW'
  | 'REFUNDED'
  | 'DISRUPTED';

/** Minimal Booking-owned projection returned by GET /bookings/{bookingId}. */
export interface BookingStatusResult {
  bookingId: string;
  status: BookingStatus;
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
  paymentId: string | null;
  status: BookingCreationStatus;
  paymentRedirectUrl: string | null;
  paymentReturnMode?: 'MOBILE_SDK' | string | null;
  vnpaySdk?: VnPaySdkMeta | null;
}

// ─── Trip Results State ───────────────────────────────────
export type TripResultsStatus = 'loading' | 'success' | 'empty' | 'error';

// ─── API Payloads ─────────────────────────────────────────
export type BookingLocationPayload =
  | { stationId: string; stopId?: never }
  | { stationId?: never; stopId: string };

export type ShuttleServiceDirection = 'pickup' | 'dropoff';

export interface ShuttleServicePayload {
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * Memory-only Shuttle draft. `stationId` binds sensitive coordinates to the
 * exact service station and is deliberately stripped from the network payload.
 */
export interface ShuttleServiceDraft extends ShuttleServicePayload {
  stationId: string;
}

/** Backwards-compatible aliases for existing inbound Shuttle callers. */
export type ShuttlePickupPayload = ShuttleServicePayload;
export type ShuttlePickupDraft = ShuttleServiceDraft;

export interface SeatBookingPayload {
  seatNumber: string;
}

export interface CreateBookingPayload {
  tripId: string;
  pickup: BookingLocationPayload;
  dropoff?: BookingLocationPayload;
  shuttlePickup?: ShuttleServicePayload;
  shuttleDropoff?: ShuttleServicePayload;
  seats: SeatBookingPayload[];
  voucherCode?: string;
  paymentMethod: 'WALLET' | 'VNPAY';
  /** Required by BE when paymentMethod is VNPAY (MOBILE_SDK). */
  paymentReturnMode?: 'MOBILE_SDK';
}

export interface CreateRoundTripPayload {
  outbound: Omit<
    CreateBookingPayload,
    'voucherCode' | 'paymentMethod' | 'paymentReturnMode'
  >;
  return: Omit<
    CreateBookingPayload,
    'voucherCode' | 'paymentMethod' | 'paymentReturnMode'
  >;
  voucherCode?: string;
  paymentMethod: 'WALLET' | 'VNPAY';
  paymentReturnMode?: 'MOBILE_SDK';
}

export interface BookingHistoryItem {
  id: string; // bookingId
  bookingCode: string;
  tripId: string;
  originStationName: string;
  destinationStationName: string;
  departureDateTime: string;
  status: BookingStatus;
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
