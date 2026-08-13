/**
 * VietRide — Navigation Type Definitions
 *
 * Centralized param lists for all navigators, enabling type-safe
 * navigation across the entire app.
 */

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BookingEntryIntent } from '@features/booking/types';
import type { PassengerTicketHistoryItem } from '@features/profile/types';
import type { TripLifecycleStatus } from '@features/trip/types';
import type { PaymentMethod } from '@shared/utils/paymentMethod';
import type { NotificationItemDto } from '@features/home/api/notificationApi';

// ─── Auth Stack ───────────────────────────────────────────
export type AuthStackParamList = {
  Login: { email?: string; verified?: boolean } | undefined;
  Register: undefined;
  OTPVerification: {
    email: string;
    phone?: string;
    otpTtlMinutes?: number;
    purpose: 'REGISTRATION';
    fromProfile?: boolean;
  };
  ForgotPassword: undefined;
  ResetPassword: {
    email: string;
    otpTtlMinutes?: number;
  };
};

// ─── Booking Stack (nested inside Main) ───────────────────
export type BookingStackParamList = {
  PopularRoutes: { intent?: BookingEntryIntent } | undefined;
  CityPicker: { mode: 'from' | 'to' };
  DatePicker: {
    mode?: 'departure' | 'return';
    next?: 'search';
    intent?: BookingEntryIntent;
  } | undefined;
  CreateTicketBooking: { intent: BookingEntryIntent } | undefined;
  /**
   * Map-first Shuttle address picker. Params are strictly serializable —
   * no navigation callbacks. `stationId` is local draft metadata only.
   */
  ShuttleAddressPicker: {
    leg: 'outbound' | 'return';
    direction: 'pickup' | 'dropoff';
    stationId: string;
    stationName: string;
    stationLatitude: number;
    stationLongitude: number;
  };
  /**
   * source='checkout' → show data from booking store (just completed)
   * source='history'  → render the serializable facade snapshot selected in History.
   * The snapshot is optional only for backward-compatible/demo callers because
   * BE does not expose an individual passenger history-detail endpoint.
   */
  DigitalTicket:
    | { source: 'checkout' }
    | {
        source: 'history';
        bookingId: string;
        historyItem?: PassengerTicketHistoryItem;
      };
};

// ─── Parcel Stack ─────────────────────────────────────────
export type ParcelStackParamList = {
  CityPicker: {
    mode: 'from' | 'to';
    next?: 'to' | 'create';
  };
  CreateParcel: undefined;
  ParcelDetail: {
    parcelId: string;
    fromHistory?: boolean;
    paymentRedirectUrl?: string;
    preferredPaymentMethod?: PaymentMethod;
    trackingTarget?: import('@features/tracking/types/trackingTarget').TrackingTarget;
  };
  ParcelTracking: {
    parcelId: string;
    trackingTarget?: import('@features/tracking/types/trackingTarget').TrackingTarget;
  };
};

// ─── Profile Stack ────────────────────────────────────────
export type ProfileStackParamList = {
  ProfileOverview: undefined;
  EditProfile: undefined;
  Settings: undefined;
  SecuritySettings: undefined;
  ChangePassword: undefined;
  ThemeSettings: undefined;
  Wallet: undefined;
  TopUp: undefined;
  Withdraw: undefined;
  SavedPayments: undefined;
  AddPaymentMethod: undefined;
  OTPVerification: {
    email: string;
    phone?: string;
    otpTtlMinutes?: number;
    purpose: 'REGISTRATION';
    fromProfile?: boolean;
  };
};

// ─── Main Tab Navigator ──────────────────────────────────
export type MainTabParamList = {
  Home: undefined;
  Notification: undefined;
  BookingHistory: { initialTab?: 'ticket' | 'parcel' } | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// ─── Root Navigator ──────────────────────────────────────
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  CompleteProfile: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Booking: NavigatorScreenParams<BookingStackParamList>;
  Parcel: NavigatorScreenParams<ParcelStackParamList>;
  Chatbot: undefined;
  Tracking:
    | {
        source: 'trip';
        tripId: string;
        bookingId?: string;
        /** Canonical STOP|STATION; omit for operational next-stop only. */
        trackingTarget?: import('@features/tracking/types/trackingTarget').TrackingTarget;
        tripStatus?: TripLifecycleStatus;
      }
    | {
        source: 'shuttle';
        shuttleTripId: string;
        bookingId?: string;
      };
  NotificationDetail: { notification: NotificationItemDto };
};

// ─── Declaration merging for useNavigation type safety ────
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
