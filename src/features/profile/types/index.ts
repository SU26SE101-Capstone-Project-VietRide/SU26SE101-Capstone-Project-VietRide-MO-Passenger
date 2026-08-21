/**
 * Profile Feature Types
 */

export interface NotificationSettings {
  trips: boolean;
  parcels: boolean;
  promotions: boolean;
}

export interface LoyaltyPoints {
  currentPoints: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  nextTierPoints: number;
}

export type {
  BookingHistoryShuttleRequest,
  PassengerHistoryItem,
  PassengerHistoryPage,
  PassengerHistoryQuery,
  PassengerHistoryQueryInput,
  PassengerHistoryTicketSummary,
  PassengerHistoryType,
  PassengerHistoryVehicle,
  PassengerHistoryVehicleType,
  PassengerParcelHistoryDetails,
  PassengerParcelHistoryItem,
  PassengerParcelSizeCategory,
  PassengerParcelStatus,
  PassengerTicketHistoryDetails,
  PassengerTicketHistoryItem,
  PassengerTicketLifecycleStatus,
  PassengerTicketStatus,
} from './passengerHistory';
