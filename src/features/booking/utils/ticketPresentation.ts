import type { StatusChipTone } from '@shared/components';
import type { PassengerTicketStatus } from '@features/profile/types';

export interface TicketStatusPresentation {
  labelKey: string;
  fallback: string;
  tone: StatusChipTone;
  trackingEnabled: boolean;
  pendingPayment: boolean;
}

export interface TicketLifecyclePresentation {
  labelKey: string;
  fallback: string;
}

const PRESENTATION_BY_STATUS: Record<string, TicketStatusPresentation> = {
  PENDING_PAYMENT: {
    labelKey: 'history.status.ticket.pendingPayment',
    fallback: 'Payment pending',
    tone: 'warning',
    trackingEnabled: false,
    pendingPayment: true,
  },
  CONFIRMED: {
    labelKey: 'history.status.ticket.confirmed',
    fallback: 'Confirmed',
    tone: 'success',
    trackingEnabled: true,
    pendingPayment: false,
  },
  COMPLETED: {
    labelKey: 'history.status.ticket.completed',
    fallback: 'Completed',
    tone: 'success',
    trackingEnabled: true,
    pendingPayment: false,
  },
  PARTIAL_NO_SHOW: {
    labelKey: 'history.status.ticket.partialNoShow',
    fallback: 'Partially used',
    tone: 'warning',
    trackingEnabled: true,
    pendingPayment: false,
  },
  DISRUPTED: {
    labelKey: 'history.status.ticket.disrupted',
    fallback: 'Trip disrupted',
    tone: 'warning',
    trackingEnabled: true,
    pendingPayment: false,
  },
  EXPIRED: {
    labelKey: 'history.status.ticket.expired',
    fallback: 'Expired',
    tone: 'neutral',
    trackingEnabled: false,
    pendingPayment: false,
  },
  CANCELLED: {
    labelKey: 'history.status.ticket.cancelled',
    fallback: 'Cancelled',
    tone: 'error',
    trackingEnabled: false,
    pendingPayment: false,
  },
  NO_SHOW: {
    labelKey: 'history.status.ticket.noShow',
    fallback: 'Not boarded',
    tone: 'neutral',
    trackingEnabled: false,
    pendingPayment: false,
  },
  REFUNDED: {
    labelKey: 'history.status.ticket.refunded',
    fallback: 'Refunded',
    tone: 'neutral',
    trackingEnabled: false,
    pendingPayment: false,
  },
};

const UNKNOWN_TICKET_PRESENTATION: TicketStatusPresentation = {
  labelKey: 'history.status.ticket.unknown',
  fallback: 'Status unavailable',
  tone: 'neutral',
  trackingEnabled: false,
  pendingPayment: false,
};

export const getTicketStatusPresentation = (
  status: PassengerTicketStatus | string | null | undefined,
): TicketStatusPresentation => {
  const normalizedStatus = status?.trim().toUpperCase();
  return normalizedStatus
    ? PRESENTATION_BY_STATUS[normalizedStatus] ?? UNKNOWN_TICKET_PRESENTATION
    : UNKNOWN_TICKET_PRESENTATION;
};

const LIFECYCLE_PRESENTATIONS: Record<string, TicketLifecyclePresentation> = {
  PENDING_PAYMENT: { labelKey: 'history.ticketState.pendingPayment', fallback: 'Payment pending' },
  ISSUED: { labelKey: 'history.ticketState.issued', fallback: 'Ready to board' },
  USED: { labelKey: 'history.ticketState.used', fallback: 'Used' },
  CANCELLED: { labelKey: 'history.ticketState.cancelled', fallback: 'Cancelled' },
  REFUNDED: { labelKey: 'history.ticketState.refunded', fallback: 'Refunded' },
  EXPIRED: { labelKey: 'history.ticketState.expired', fallback: 'Expired' },
};

const UNKNOWN_LIFECYCLE_PRESENTATION: TicketLifecyclePresentation = {
  labelKey: 'history.ticketState.unknown',
  fallback: 'Status unavailable',
};

export const getTicketLifecyclePresentation = (
  status: string | null | undefined,
): TicketLifecyclePresentation => {
  const normalizedStatus = status?.trim().toUpperCase();
  return normalizedStatus
    ? LIFECYCLE_PRESENTATIONS[normalizedStatus] ?? UNKNOWN_LIFECYCLE_PRESENTATION
    : UNKNOWN_LIFECYCLE_PRESENTATION;
};
