import type { TripLifecycleStatus } from '@features/trip/types';
import type { PassengerTicketHistoryItem } from '@features/profile/types';
import { formatDateTime } from '@shared/utils/format';
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
  ticketReferences?: string;
  ticketEntries?: readonly TicketCodeViewModel[];
  boardingName: string;
  boardingAddress?: string;
  boardingTime?: string;
  alightingName: string;
  alightingAddress?: string;
  alightingTime?: string;
  busType?: string;
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

export interface TicketCodeViewModel {
  ticketCode: string;
  seatNumber: string;
  status?: string;
}

export interface TicketViewModel {
  title: string;
  statusTitle: string;
  statusMessage: string;
  isPendingPayment: boolean;
  isDemo: boolean;
  paymentMethod?: 'WALLET' | 'VNPAY';
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
  ticketReferences: tickets
    .map((ticket) => ticket.ticketCode.trim())
    .filter(Boolean)
    .join(', ') || undefined,
  ticketEntries: tickets
    .map((ticket) => ({
      ticketCode: ticket.ticketCode.trim(),
      seatNumber: ticket.seatNumber.trim(),
    }))
    .filter((ticket) => ticket.ticketCode.length > 0),
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
    : 'Ticket status updated',
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
    ticketReferences: detail.ticketCode,
    ticketEntries: [{ ticketCode: detail.ticketCode, seatNumber: detail.seatNumbers.join(', ') }],
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

const REMOTE_TRACKABLE_BOOKING_STATUSES = new Set<PassengerTicketHistoryItem['status']>([
  'CONFIRMED',
  'COMPLETED',
  'PARTIAL_NO_SHOW',
  'DISRUPTED',
]);

/**
 * Builds only from fields returned by GET /passenger/history. Values that the
 * facade does not own (payment method, bus type, stop address/id) stay absent
 * so the ticket UI can omit them instead of fabricating details.
 */
export const buildPassengerHistoryTicketViewModel = (
  item: PassengerTicketHistoryItem,
): TicketViewModel => ({
  title: 'Ticket Detail',
  statusTitle: item.status === 'CONFIRMED'
    ? 'Ticket confirmed'
    : 'Ticket status updated',
  statusMessage: item.status === 'CONFIRMED'
    ? 'Show the booking or ticket reference when boarding.'
    : 'This is the latest status recorded in your booking history.',
  isPendingPayment: item.status === 'PENDING_PAYMENT',
  isDemo: false,
  totalAmount: item.totalAmount,
  legs: [{
    label: item.ticket.tripDirection === 'OUTBOUND'
      ? 'Outbound'
      : item.ticket.tripDirection === 'RETURN'
        ? 'Return'
        : 'Trip',
    reference: item.code,
    ticketReferences: item.ticket.tickets
      .map((ticket) => ticket.ticketCode)
      .join(', ') || undefined,
    ticketEntries: item.ticket.tickets.map((ticket) => ({
      ticketCode: ticket.ticketCode,
      seatNumber: ticket.seatNumber,
      status: ticket.status,
    })),
    boardingName: item.originName ?? 'Origin unavailable',
    boardingTime: item.departureDateTime
      ? formatDateTime(item.departureDateTime)
      : undefined,
    alightingName: item.destinationName ?? 'Destination unavailable',
    seatNumbers: item.ticket.tickets
      .map((ticket) => ticket.seatNumber)
      .join(', ') || '—',
    ticketCount: item.ticket.tickets.length,
    totalAmount: item.totalAmount,
    tripId: item.tripId,
    bookingId: item.id,
    trackingEnabled: REMOTE_TRACKABLE_BOOKING_STATUSES.has(item.status),
  }],
});
