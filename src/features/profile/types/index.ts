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
  PassengerHistoryItem,
  PassengerHistoryPage,
  PassengerHistoryQuery,
  PassengerHistoryQueryInput,
  PassengerHistoryTicketSummary,
  PassengerHistoryType,
  PassengerParcelHistoryDetails,
  PassengerParcelHistoryItem,
  PassengerParcelSizeCategory,
  PassengerParcelStatus,
  PassengerTicketHistoryDetails,
  PassengerTicketHistoryItem,
  PassengerTicketLifecycleStatus,
  PassengerTicketStatus,
} from './passengerHistory';
