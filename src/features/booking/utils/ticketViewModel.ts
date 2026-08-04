import type { TripLifecycleStatus } from '@features/trip/types';
import type { PassengerTicketHistoryItem } from '@features/profile/types';
import { formatDateTime } from '@shared/utils/format';
import i18n from '@shared/i18n';
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
  label: string;
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
  ticketId?: string;
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

export interface TicketPageViewModel {
  key: string;
  index: number;
  leg: TicketLegViewModel;
  ticket?: TicketCodeViewModel;
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
  translate: Translate;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

const defaultTranslate: Translate = (key, options) => i18n.t(key, options);

const buildLeg = ({
  label,
  reference,
  bookingId,
  tickets,
  totalAmount,
  trackingEnabled,
  translate,
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
      ticketId: ticket.ticketId,
      ticketCode: ticket.ticketCode.trim(),
      seatNumber: ticket.seatNumber.trim(),
      status: ticket.status,
    }))
    .filter((ticket) => ticket.ticketCode.length > 0),
  boardingName: pickUp?.name || translate('common.notAvailable'),
  boardingAddress: pickUp?.address || '',
  boardingTime: pickUp?.time || undefined,
  alightingName: dropOff?.name || translate('common.notAvailable'),
  alightingAddress: dropOff?.address || '',
  alightingTime: dropOff?.time || undefined,
  busType: trip?.busType || translate('booking.ticket.notReported'),
  seatNumbers: tickets
    .map((ticket) => ticket.seatNumber.trim())
    .filter(Boolean)
    .join(', ') || translate('common.none'),
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
}: CheckoutTicketViewModelInput, translate: Translate = defaultTranslate): TicketViewModel | null => {
  if (!bookingResult || !getBookingReference(bookingResult)) return null;

  const isPendingPayment = bookingResult.status === 'PENDING_PAYMENT';
  const trackingEnabled = bookingResult.status === 'CONFIRMED';
  const normalizedPaymentMethod = paymentMethod === 'wallet' ? 'WALLET' : 'VNPAY';
  const shared = {
    title: translate('booking.ticket.confirmationTitle'),
    statusTitle: isPendingPayment
      ? translate('booking.ticket.paymentPending')
      : translate('booking.ticket.bookingCreated'),
    statusMessage: isPendingPayment
      ? translate('booking.ticket.completePayment')
      : translate('booking.ticket.bookingRecorded'),
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
          label: translate('booking.header.outbound'),
          reference: bookingResult.outbound.bookingCode,
          bookingId: bookingResult.outbound.bookingId,
          tickets: bookingResult.outbound.tickets,
          totalAmount: bookingResult.outbound.totalAmount,
          trackingEnabled,
          translate,
          trip: outboundState?.trip ?? null,
          pickUp: outboundState?.pickUp ?? null,
          dropOff: outboundState?.dropOff ?? null,
          shuttlePickup: outboundState?.shuttlePickup ?? null,
        }),
        buildLeg({
          label: translate('booking.header.return'),
          reference: bookingResult.return.bookingCode,
          bookingId: bookingResult.return.bookingId,
          tickets: bookingResult.return.tickets,
          totalAmount: bookingResult.return.totalAmount,
          trackingEnabled,
          translate,
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
      label: translate('booking.header.trip'),
      reference: bookingResult.bookingCode,
      bookingId: bookingResult.bookingId,
      tickets: bookingResult.tickets,
      totalAmount: bookingResult.totalAmount,
      trackingEnabled,
      translate,
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
  translate: Translate = defaultTranslate,
): TicketViewModel => ({
  title: translate('booking.ticket.detailTitle'),
  statusTitle: detail.status === 'CONFIRMED'
    ? translate('booking.ticket.confirmed')
    : translate('booking.ticket.statusUpdated'),
  statusMessage: detail.status === 'CONFIRMED'
    ? translate('booking.ticket.showReferenceWhenBoarding')
    : translate('booking.ticket.latestAvailableStatus'),
  isPendingPayment: detail.status === 'PENDING_PAYMENT',
  isDemo: source === 'demo',
  paymentMethod: detail.paymentMethod,
  totalAmount: detail.totalAmount,
  legs: [{
    label: translate('booking.header.trip'),
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

/**
 * Flattens legs only for presentation. The domain model remains leg-scoped and
 * ticketId is the canonical identity, so equal seat labels on separate trips
 * never collide.
 */
export const buildTicketPages = (model: TicketViewModel): TicketPageViewModel[] => {
  const pages: TicketPageViewModel[] = [];

  model.legs.forEach((leg, legIndex) => {
    const entries = leg.ticketEntries?.length ? leg.ticketEntries : [undefined];
    entries.forEach((ticket, ticketIndex) => {
      const bookingIdentity = leg.bookingId?.trim()
        || leg.reference.trim()
        || `leg-${legIndex}`;
      const ticketIdentity = ticket?.ticketId?.trim();
      const fallbackIdentity = ticket?.ticketCode.trim() || `summary-${ticketIndex}`;

      pages.push({
        key: ticketIdentity
          ? `${bookingIdentity}:${ticketIdentity}`
          : `${bookingIdentity}:${fallbackIdentity}:${ticketIndex}`,
        index: pages.length + 1,
        leg,
        ...(ticket ? { ticket } : {}),
      });
    });
  });

  return pages;
};

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
  translate: Translate = defaultTranslate,
): TicketViewModel => ({
  title: translate('booking.ticket.detailTitle'),
  statusTitle: item.status === 'CONFIRMED'
    ? translate('booking.ticket.confirmed')
    : translate('booking.ticket.statusUpdated'),
  statusMessage: item.status === 'CONFIRMED'
    ? translate('booking.ticket.showBookingReferenceWhenBoarding')
    : translate('booking.ticket.latestHistoryStatus'),
  isPendingPayment: item.status === 'PENDING_PAYMENT',
  isDemo: false,
  totalAmount: item.totalAmount,
  legs: [{
    label: item.ticket.tripDirection === 'OUTBOUND'
      ? translate('booking.header.outbound')
      : item.ticket.tripDirection === 'RETURN'
        ? translate('booking.header.return')
        : translate('booking.header.trip'),
    reference: item.code,
    ticketReferences: item.ticket.tickets
      .map((ticket) => ticket.ticketCode)
      .join(', ') || undefined,
    ticketEntries: item.ticket.tickets.map((ticket) => ({
      ticketId: ticket.ticketId,
      ticketCode: ticket.ticketCode,
      seatNumber: ticket.seatNumber,
      status: ticket.status,
    })),
    boardingName: item.originName ?? translate('history.originUnavailable'),
    boardingTime: item.departureDateTime
      ? formatDateTime(item.departureDateTime)
      : undefined,
    alightingName: item.destinationName ?? translate('history.destinationUnavailable'),
    seatNumbers: item.ticket.tickets
      .map((ticket) => ticket.seatNumber)
      .join(', ') || translate('common.none'),
    ticketCount: item.ticket.tickets.length,
    totalAmount: item.totalAmount,
    tripId: item.tripId,
    bookingId: item.id,
    trackingEnabled: REMOTE_TRACKABLE_BOOKING_STATUSES.has(item.status),
  }],
});
