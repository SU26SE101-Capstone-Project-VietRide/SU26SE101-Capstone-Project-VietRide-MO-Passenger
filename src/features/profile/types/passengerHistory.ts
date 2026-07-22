import type { BookingStatus } from '@features/booking/types';

export type PassengerHistoryType = 'TICKET' | 'PARCEL';

export type PassengerTicketStatus = BookingStatus;

export type PassengerTicketLifecycleStatus =
  | 'PENDING_PAYMENT'
  | 'ISSUED'
  | 'USED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED';

export type PassengerParcelStatus =
  | 'PENDING_OPERATOR_REVIEW'
  | 'PENDING_PAYMENT'
  | 'PENDING'
  | 'PENDING_ADDITIONAL_PAYMENT'
  | 'LOADED'
  | 'IN_TRANSIT'
  | 'PENDING_TRANSFER_CONFIRM'
  | 'TRANSFER_ESCALATED'
  | 'UNLOADED'
  | 'DELIVERED_PENDING_CONFIRM'
  | 'DELIVERY_CONFIRMED'
  | 'DELIVERY_REJECTED'
  | 'RETURN_INITIATED'
  | 'RETURNED'
  | 'PENDING_OPERATOR_ACTION'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

export interface PassengerHistoryTicketSummary {
  ticketId: string;
  ticketCode: string;
  seatNumber: string;
  status: PassengerTicketLifecycleStatus;
  paidAmount: number;
}

export interface PassengerTicketHistoryDetails {
  bookingGroupId: string | null;
  tripDirection: 'OUTBOUND' | 'RETURN' | null;
  routeName: string | null;
  tickets: PassengerHistoryTicketSummary[];
}

export interface PassengerParcelHistoryDetails {
  bookingId: string | null;
  recipientName: string;
  sizeCategory: PassengerParcelSizeCategory;
  photoUrl: string | null;
  deliveryMethod: string;
}

export type PassengerParcelSizeCategory =
  | 'SMALL'
  | 'MEDIUM'
  | 'LARGE'
  | 'EXTRA_LARGE';

interface PassengerHistoryItemBase {
  id: string;
  code: string;
  tripId: string;
  createdAt: string;
  totalAmount: number;
  originName: string | null;
  destinationName: string | null;
  departureDateTime: string | null;
  estimatedArrivalTime: string | null;
}

export interface PassengerTicketHistoryItem extends PassengerHistoryItemBase {
  type: 'TICKET';
  status: PassengerTicketStatus;
  ticket: PassengerTicketHistoryDetails;
  parcel: null;
}

export interface PassengerParcelHistoryItem extends PassengerHistoryItemBase {
  type: 'PARCEL';
  status: PassengerParcelStatus;
  ticket: null;
  parcel: PassengerParcelHistoryDetails;
}

export type PassengerHistoryItem =
  | PassengerTicketHistoryItem
  | PassengerParcelHistoryItem;

export interface PassengerHistoryPage<TItem extends PassengerHistoryItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PassengerHistoryQueryBase {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export type PassengerHistoryQuery =
  | (PassengerHistoryQueryBase & {
    type: 'TICKET';
    status?: PassengerTicketStatus;
  })
  | (PassengerHistoryQueryBase & {
    type: 'PARCEL';
    status?: PassengerParcelStatus;
  });

export type PassengerHistoryQueryInput =
  | (Omit<PassengerHistoryQueryBase, 'page'> & {
    type: 'TICKET';
    status?: PassengerTicketStatus;
  })
  | (Omit<PassengerHistoryQueryBase, 'page'> & {
    type: 'PARCEL';
    status?: PassengerParcelStatus;
  });
