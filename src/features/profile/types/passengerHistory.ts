import type { BookingStatus } from '@features/booking/types';
import type {
  ParcelReliabilitySummary,
  ParcelStatus,
} from '@features/parcel/types';
import type { TrackingTarget } from '@features/tracking/types/trackingTarget';

export type PassengerHistoryType = 'TICKET' | 'PARCEL';

export type PassengerTicketStatus = BookingStatus | (string & {});

export type PassengerTicketLifecycleStatus =
  | 'PENDING_PAYMENT'
  | 'ISSUED'
  | 'USED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED'
  | (string & {});

export type PassengerParcelStatus = ParcelStatus | (string & {});

export interface PassengerHistoryTicketSummary {
  ticketId: string;
  ticketCode: string;
  /** Current operational seat; null while BE is waiting for a replacement assignment. */
  seatNumber: string | null;
  status: PassengerTicketLifecycleStatus;
  paidAmount: number;
}

export interface PassengerHistoryVehicleType {
  code: string;
  displayName: string;
}

export interface PassengerHistoryVehicle {
  licensePlate: string;
  vehicleType: PassengerHistoryVehicleType | null;
}

export interface PassengerHistoryPointSnapshot {
  type: 'STATION' | 'STOP';
  id: string;
  displayName: string;
  address: string | null;
  plannedAt: string;
}

export interface BookingHistoryShuttleRequest {
  direction: 'INBOUND_TO_STATION' | 'OUTBOUND_FROM_STATION';
  address: string;
  latitude: number;
  longitude: number;
  roadDistanceMeters: number | null;
  isActive: boolean;
  requestedAt: string;
  cancelledAt: string | null;
}

export interface PassengerTicketHistoryDetails {
  bookingGroupId: string | null;
  tripDirection: 'OUTBOUND' | 'RETURN' | null;
  routeName: string | null;
  pickupPoint?: PassengerHistoryPointSnapshot | null;
  dropoffPoint?: PassengerHistoryPointSnapshot | null;
  tickets: PassengerHistoryTicketSummary[];
  vehicle: PassengerHistoryVehicle | null;
  shuttleRequests: BookingHistoryShuttleRequest[];
}

export interface PassengerParcelHistoryDetails {
  bookingId: string | null;
  recipientName: string;
  sizeCategory: PassengerParcelSizeCategory;
  photoUrl: string | null;
  deliveryMethod: string;
  role: 'SENT' | 'RECEIVED';
  reliability: ParcelReliabilitySummary | null;
}

export type PassengerParcelSizeCategory =
  | 'SMALL'
  | 'MEDIUM'
  | 'LARGE'
  | 'EXTRA_LARGE'
  | (string & {});

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
  paymentRedirectUrl: string | null;
  /** Canonical tracking destination from BE v1.63+; null when unknown. */
  trackingTarget: TrackingTarget | null;
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
