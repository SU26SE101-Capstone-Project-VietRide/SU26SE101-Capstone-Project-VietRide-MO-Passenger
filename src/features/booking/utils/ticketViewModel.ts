import type { TripLifecycleStatus } from '@features/trip/types';
import type {
  BookingResult,
  BookingTicketResult,
  BusTrip,
  DropOffPoint,
  PaymentMethod,
  PickUpPoint,
  RoundTripResult,
  ShuttlePickupDraft,
} from '../types';
import type { BookingHistoryTicketDetail } from '../data/bookingHistoryFixture';
import { getBookingReference } from './bookingReference';

export interface TicketLegViewModel {
  label: 'Outbound' | 'Return' | 'Trip';
  reference: string;
  boardingName: string;
  boardingAddress: string;
  boardingTime: string;
  alightingName: string;
  alightingAddress: string;
  alightingTime: string;
  busType: string;
  seatNumbers: string;
  ticketCount: number;
  totalAmount: number;
  tripId?: string;
  bookingId?: string;
  stopId?: string;
  tripStatus?: TripLifecycleStatus;
  trackingEnabled: boolean;
  shuttlePickupAddress?: string;
}

export interface TicketViewModel {
  title: string;
  statusTitle: string;
  statusMessage: string;
  isPendingPayment: boolean;
  isDemo: boolean;
  paymentMethod: 'WALLET' | 'VNPAY';
  totalAmount: number;
  legs: TicketLegViewModel[];
}

interface BookingLegDraft {
  trip: BusTrip | null;
  pickUp: PickUpPoint | null;
  dropOff: DropOffPoint | null;
  shuttlePickup?: ShuttlePickupDraft | null;
}

interface CheckoutTicketViewModelInput {
  bookingResult: BookingResult | RoundTripResult | null;
  paymentMethod: PaymentMethod;
  selectedTrip: BusTrip | null;
  selectedPickUp: PickUpPoint | null;
  selectedDropOff: DropOffPoint | null;
  selectedShuttlePickup?: ShuttlePickupDraft | null;
  outboundState: BookingLegDraft | null;
  returnState: BookingLegDraft | null;
}

interface BuildLegInput extends BookingLegDraft {
  label: TicketLegViewModel['label'];
  reference: string;
  bookingId: string;
  tickets: readonly BookingTicketResult[];
  totalAmount: number;
  trackingEnabled: boolean;
}

const buildLeg = ({
  label,
  reference,
  bookingId,
  tickets,
  totalAmount,
  trackingEnabled,
  trip,
  pickUp,
  dropOff,
  shuttlePickup,
}: BuildLegInput): TicketLegViewModel => ({
  label,
  reference,
  boardingName: pickUp?.name || '—',
  boardingAddress: pickUp?.address || '',
  boardingTime: pickUp?.time || '—',
  alightingName: dropOff?.name || '—',
  alightingAddress: dropOff?.address || '',
  alightingTime: dropOff?.time || '—',
  busType: trip?.busType || 'Not reported',
  seatNumbers: tickets
    .map((ticket) => ticket.seatNumber.trim())
    .filter(Boolean)
    .join(', ') || '—',
  ticketCount: tickets.length,
  totalAmount,
  tripId: trip?.id,
  bookingId,
  stopId: dropOff?.stopId,
  tripStatus: trip?.status,
  trackingEnabled: trackingEnabled && Boolean(trip?.id),
  ...(shuttlePickup?.address
    ? { shuttlePickupAddress: shuttlePickup.address }
    : {}),
});

export const buildCheckoutTicketViewModel = ({
  bookingResult,
  paymentMethod,
  selectedTrip,
  selectedPickUp,
  selectedDropOff,
  selectedShuttlePickup,
  outboundState,
  returnState,
}: CheckoutTicketViewModelInput): TicketViewModel | null => {
  if (!bookingResult || !getBookingReference(bookingResult)) return null;

  const isPendingPayment = bookingResult.status === 'PENDING_PAYMENT';
  const trackingEnabled = bookingResult.status === 'CONFIRMED';
  const normalizedPaymentMethod = paymentMethod === 'wallet' ? 'WALLET' : 'VNPAY';
  const shared = {
    title: 'Booking Confirmation',
    statusTitle: isPendingPayment ? 'Payment Pending' : 'Booking Created',
    statusMessage: isPendingPayment
      ? 'Complete payment to activate your ticket.'
      : 'Your booking has been recorded successfully.',
    isPendingPayment,
    isDemo: false,
    paymentMethod: normalizedPaymentMethod,
  } as const;

  if ('bookingGroupId' in bookingResult) {
    return {
      ...shared,
      totalAmount: bookingResult.grandTotal,
      legs: [
        buildLeg({
          label: 'Outbound',
          reference: bookingResult.outbound.bookingCode,
          bookingId: bookingResult.outbound.bookingId,
          tickets: bookingResult.outbound.tickets,
          totalAmount: bookingResult.outbound.totalAmount,
          trackingEnabled,
          trip: outboundState?.trip ?? null,
          pickUp: outboundState?.pickUp ?? null,
          dropOff: outboundState?.dropOff ?? null,
          shuttlePickup: outboundState?.shuttlePickup ?? null,
        }),
        buildLeg({
          label: 'Return',
          reference: bookingResult.return.bookingCode,
          bookingId: bookingResult.return.bookingId,
          tickets: bookingResult.return.tickets,
          totalAmount: bookingResult.return.totalAmount,
          trackingEnabled,
          trip: returnState?.trip ?? null,
          pickUp: returnState?.pickUp ?? null,
          dropOff: returnState?.dropOff ?? null,
          shuttlePickup: returnState?.shuttlePickup ?? null,
        }),
      ],
    };
  }

  return {
    ...shared,
    totalAmount: bookingResult.totalAmount,
    legs: [buildLeg({
      label: 'Trip',
      reference: bookingResult.bookingCode,
      bookingId: bookingResult.bookingId,
      tickets: bookingResult.tickets,
      totalAmount: bookingResult.totalAmount,
      trackingEnabled,
      trip: selectedTrip,
      pickUp: selectedPickUp,
      dropOff: selectedDropOff,
      shuttlePickup: selectedShuttlePickup ?? null,
    })],
  };
};

export const buildHistoryTicketViewModel = (
  source: 'remote' | 'demo',
  detail: BookingHistoryTicketDetail,
): TicketViewModel => ({
  title: 'Ticket Detail',
  statusTitle: detail.status === 'CONFIRMED'
    ? 'Ticket confirmed'
    : detail.status.replaceAll('_', ' '),
  statusMessage: detail.status === 'CONFIRMED'
    ? 'Show this ticket reference when boarding.'
    : 'This is the latest available ticket status.',
  isPendingPayment: detail.status === 'PENDING_PAYMENT',
  isDemo: source === 'demo',
  paymentMethod: detail.paymentMethod,
  totalAmount: detail.totalAmount,
  legs: [{
    label: 'Trip',
    reference: detail.ticketCode,
    boardingName: detail.pickup.name,
    boardingAddress: detail.pickup.address,
    boardingTime: detail.pickup.time,
    alightingName: detail.dropoff.name,
    alightingAddress: detail.dropoff.address,
    alightingTime: detail.dropoff.time,
    busType: detail.busTypeLabel,
    seatNumbers: detail.seatNumbers.join(', '),
    ticketCount: detail.seatNumbers.length,
    totalAmount: detail.totalAmount,
    tripId: detail.tripId,
    bookingId: detail.id,
    stopId: detail.dropoff.stopId,
    trackingEnabled: source === 'remote' && detail.status === 'CONFIRMED',
  }],
});
