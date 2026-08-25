import type { TripLifecycleStatus } from '@features/trip/types';
import type {
  BookingHistoryShuttleRequest,
  PassengerTicketHistoryItem,
} from '@features/profile/types';
import {
  buildTrackingTargetFromPoints,
  type TrackingTarget,
} from '@features/tracking/types/trackingTarget';
import { formatDate, formatDateTime } from '@shared/utils/format';
import i18n from '@shared/i18n';
import type {
  BookingResult,
  BookingTicketResult,
  BookingVehicle,
  BusTrip,
  DropOffPoint,
  PaymentMethod,
  PickUpPoint,
  RoundTripResult,
  ShuttleServiceDraft,
} from '../types';
import type { BookingHistoryTicketDetail } from '../data/bookingHistoryFixture';
import { getBookingReference } from './bookingReference';
import { getTicketStatusPresentation } from './ticketPresentation';

export interface TicketLegViewModel {
  label: string;
  reference: string;
  ticketReferences?: string;
  ticketEntries?: readonly TicketCodeViewModel[];
  boardingName: string;
  boardingAddress?: string;
  boardingTime?: string;
  boardingDate?: string;
  alightingName: string;
  alightingAddress?: string;
  alightingTime?: string;
  alightingDate?: string;
  isOvernight?: boolean;
  busType?: string;
  licensePlate?: string;
  seatNumbers: string;
  ticketCount: number;
  totalAmount: number;
  tripId?: string;
  bookingId?: string;
  /** Canonical STOP|STATION for live ETA; prefer over inventing from names. */
  trackingTarget?: TrackingTarget;
  tripStatus?: TripLifecycleStatus;
  trackingEnabled: boolean;
  shuttlePickupAddress?: string;
  shuttleDropoffAddress?: string;
  /** Ordered public Booking History shuttle snapshots, including cancelled requests. */
  shuttleRequests?: readonly BookingHistoryShuttleRequest[];
  /** Route display name from history payload; omit when unknown. */
  routeName?: string;
  /**
   * History only returns route-level origin/destination (HIST-BE-002).
   * When true, UI labels them as route endpoints — never as passenger stops.
   */
  usesRouteEndpoints?: boolean;
}

export interface TicketCodeViewModel {
  ticketId?: string;
  ticketCode: string;
  seatNumber: string;
  status?: string;
  paidAmount?: number;
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
  /** Booking-level status token for tone-aware header presentation. */
  bookingStatus?: string;
  /** Formatted booking createdAt from history; omit when unknown. */
  createdAtLabel?: string;
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
  shuttlePickup?: ShuttleServiceDraft | null;
  shuttleDropoff?: ShuttleServiceDraft | null;
}

interface CheckoutTicketViewModelInput {
  bookingResult: BookingResult | RoundTripResult | null;
  paymentMethod: PaymentMethod;
  selectedTrip: BusTrip | null;
  selectedPickUp: PickUpPoint | null;
  selectedDropOff: DropOffPoint | null;
  selectedShuttlePickup?: ShuttleServiceDraft | null;
  selectedShuttleDropoff?: ShuttleServiceDraft | null;
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
  vehicle?: BookingVehicle | null;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

const defaultTranslate: Translate = (key, options) => i18n.t(key, options);

/** After VNPay IPN, checkout still holds the create payload (tickets PENDING_PAYMENT). */
export const promotePaidCheckoutTickets = (
  tickets: readonly BookingTicketResult[],
): BookingTicketResult[] => tickets.map(ticket => (
  ticket.status === 'PENDING_PAYMENT'
    ? { ...ticket, status: 'ISSUED' }
    : ticket
));

export const confirmCheckoutBookingResult = (
  result: BookingResult | RoundTripResult,
): BookingResult | RoundTripResult => {
  if (result.status === 'CONFIRMED') return result;
  if ('bookingGroupId' in result) {
    return {
      ...result,
      status: 'CONFIRMED',
      outbound: {
        ...result.outbound,
        tickets: promotePaidCheckoutTickets(result.outbound.tickets),
      },
      return: {
        ...result.return,
        tickets: promotePaidCheckoutTickets(result.return.tickets),
      },
    };
  }
  return {
    ...result,
    status: 'CONFIRMED',
    tickets: promotePaidCheckoutTickets(result.tickets),
  };
};

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
  shuttleDropoff,
  vehicle,
}: BuildLegInput): TicketLegViewModel => {
  const boardingTimestamp = pickUp?.estimatedArrivalTime ?? trip?.departureDateTime;
  const alightingTimestamp = dropOff?.estimatedArrivalTime ?? trip?.estimatedArrivalDateTime;
  const boardingDate = boardingTimestamp ? formatDate(boardingTimestamp) : '';
  const alightingDate = alightingTimestamp ? formatDate(alightingTimestamp) : '';

  return ({
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
      paidAmount: ticket.paidAmount,
    }))
    .filter((ticket) => ticket.ticketCode.length > 0),
  boardingName: pickUp?.name || translate('common.notAvailable'),
  boardingAddress: pickUp?.address || '',
  boardingTime: pickUp?.time || undefined,
  boardingDate: boardingDate || undefined,
  alightingName: dropOff?.name || translate('common.notAvailable'),
  alightingAddress: dropOff?.address || '',
  alightingTime: dropOff?.time || undefined,
  alightingDate: alightingDate || undefined,
  isOvernight: Boolean(boardingDate && alightingDate && boardingDate !== alightingDate),
  busType: vehicle?.vehicleType?.displayName
    || trip?.busType
    || translate('booking.ticket.notReported'),
  ...(vehicle?.licensePlate ? { licensePlate: vehicle.licensePlate } : {}),
  seatNumbers: tickets
    .map((ticket) => ticket.seatNumber.trim())
    .filter(Boolean)
    .join(', ') || translate('common.none'),
  ticketCount: tickets.length,
  totalAmount,
  tripId: trip?.id,
  bookingId,
  trackingTarget: buildTrackingTargetFromPoints(dropOff),
  tripStatus: trip?.status,
  trackingEnabled: trackingEnabled && Boolean(trip?.id),
  ...(shuttlePickup?.address
    ? { shuttlePickupAddress: shuttlePickup.address }
    : {}),
  ...(shuttleDropoff?.address
    ? { shuttleDropoffAddress: shuttleDropoff.address }
    : {}),
  });
};

export const buildCheckoutTicketViewModel = ({
  bookingResult,
  paymentMethod,
  selectedTrip,
  selectedPickUp,
  selectedDropOff,
  selectedShuttlePickup,
  selectedShuttleDropoff,
  outboundState,
  returnState,
}: CheckoutTicketViewModelInput, translate: Translate = defaultTranslate): TicketViewModel | null => {
  if (!bookingResult || !getBookingReference(bookingResult)) return null;

  const isPendingPayment = bookingResult.status === 'PENDING_PAYMENT';
  const isConfirmed = bookingResult.status === 'CONFIRMED';
  const trackingEnabled = isConfirmed;
  const normalizedPaymentMethod = paymentMethod === 'wallet' ? 'WALLET' : 'VNPAY';
  const shared = {
    title: translate(
      isConfirmed
        ? 'booking.ticket.detailTitle'
        : 'booking.ticket.confirmationTitle',
    ),
    statusTitle: isPendingPayment
      ? translate('booking.ticket.paymentPending')
      : isConfirmed
        ? translate('booking.ticket.confirmed')
        : translate('booking.ticket.bookingCreated'),
    statusMessage: isPendingPayment
      ? translate('booking.ticket.completePayment')
      : isConfirmed
        ? translate('booking.ticket.showReferenceWhenBoarding')
        : translate('booking.ticket.bookingRecorded'),
    isPendingPayment,
    isDemo: false,
    paymentMethod: normalizedPaymentMethod,
    bookingStatus: bookingResult.status,
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
          tickets: isConfirmed
            ? promotePaidCheckoutTickets(bookingResult.outbound.tickets)
            : bookingResult.outbound.tickets,
          totalAmount: bookingResult.outbound.totalAmount,
          trackingEnabled,
          translate,
          trip: outboundState?.trip ?? null,
          pickUp: outboundState?.pickUp ?? null,
          dropOff: outboundState?.dropOff ?? null,
          shuttlePickup: outboundState?.shuttlePickup ?? null,
          shuttleDropoff: outboundState?.shuttleDropoff ?? null,
          vehicle: bookingResult.outbound.vehicle,
        }),
        buildLeg({
          label: translate('booking.header.return'),
          reference: bookingResult.return.bookingCode,
          bookingId: bookingResult.return.bookingId,
          tickets: isConfirmed
            ? promotePaidCheckoutTickets(bookingResult.return.tickets)
            : bookingResult.return.tickets,
          totalAmount: bookingResult.return.totalAmount,
          trackingEnabled,
          translate,
          trip: returnState?.trip ?? null,
          pickUp: returnState?.pickUp ?? null,
          dropOff: returnState?.dropOff ?? null,
          shuttlePickup: returnState?.shuttlePickup ?? null,
          shuttleDropoff: returnState?.shuttleDropoff ?? null,
          vehicle: bookingResult.return.vehicle,
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
      tickets: isConfirmed
        ? promotePaidCheckoutTickets(bookingResult.tickets)
        : bookingResult.tickets,
      totalAmount: bookingResult.totalAmount,
      trackingEnabled,
      translate,
      trip: selectedTrip,
      pickUp: selectedPickUp,
      dropOff: selectedDropOff,
      shuttlePickup: selectedShuttlePickup ?? null,
      shuttleDropoff: selectedShuttleDropoff ?? null,
      vehicle: bookingResult.vehicle,
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
    trackingTarget: buildTrackingTargetFromPoints(detail.dropoff),
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

/**
 * Builds only from fields returned by GET /passenger/history. Values that the
 * facade does not own (payment method, stop address/id) stay absent so the
 * ticket UI can omit them instead of fabricating details. Vehicle metadata is
 * sourced only from the nullable ticket.vehicle snapshot returned by BE.
 *
 * HIST-BE-002: originName/destinationName are route endpoints, not the
 * passenger's booked STOP/STATION snapshots. Labels must not claim otherwise.
 */
export const buildPassengerHistoryTicketViewModel = (
  item: PassengerTicketHistoryItem,
  translate: Translate = defaultTranslate,
): TicketViewModel => {
  const statusPresentation = getTicketStatusPresentation(item.status);
  const isPendingPayment = statusPresentation.pendingPayment;
  const statusTitle = translate(statusPresentation.labelKey);
  const statusMessage = isPendingPayment
    ? translate('booking.ticket.completePayment')
    : item.status === 'CONFIRMED'
      ? translate('booking.ticket.showBookingReferenceWhenBoarding')
      : translate('booking.ticket.latestHistoryStatus');

  const ticketPaidTotal = item.ticket.tickets.reduce(
    (sum, ticket) => sum + (Number.isFinite(ticket.paidAmount) ? ticket.paidAmount : 0),
    0,
  );

  return {
    title: translate('booking.ticket.detailTitle'),
    statusTitle,
    statusMessage,
    isPendingPayment,
    isDemo: false,
    totalAmount: item.totalAmount,
    bookingStatus: item.status,
    createdAtLabel: formatDateTime(item.createdAt),
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
        paidAmount: ticket.paidAmount,
      })),
      // Route endpoints only — not passenger boarding/alighting stops.
      boardingName: item.originName ?? translate('history.originUnavailable'),
      boardingTime: item.departureDateTime
        ? formatDateTime(item.departureDateTime)
        : undefined,
      alightingName: item.destinationName ?? translate('history.destinationUnavailable'),
      alightingTime: item.estimatedArrivalTime
        ? formatDateTime(item.estimatedArrivalTime)
        : undefined,
      ...(item.ticket.vehicle?.vehicleType?.displayName
        ? { busType: item.ticket.vehicle.vehicleType.displayName }
        : {}),
      ...(item.ticket.vehicle?.licensePlate
        ? { licensePlate: item.ticket.vehicle.licensePlate }
        : {}),
      seatNumbers: item.ticket.tickets
        .map((ticket) => ticket.seatNumber)
        .join(', ') || translate('common.none'),
      ticketCount: item.ticket.tickets.length,
      // Prefer booking total; fall back to summed per-ticket paid amounts.
      totalAmount: item.totalAmount > 0 ? item.totalAmount : ticketPaidTotal,
      tripId: item.tripId,
      bookingId: item.id,
      ...(item.trackingTarget ? { trackingTarget: item.trackingTarget } : {}),
      ...(item.ticket.routeName ? { routeName: item.ticket.routeName } : {}),
      ...(item.ticket.shuttleRequests.length > 0
        ? { shuttleRequests: item.ticket.shuttleRequests }
        : {}),
      usesRouteEndpoints: true,
      trackingEnabled: statusPresentation.trackingEnabled,
    }],
  };
};
