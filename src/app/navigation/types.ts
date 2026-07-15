/**
 * VietRide — Navigation Type Definitions
 *
 * Centralized param lists for all navigators, enabling type-safe
 * navigation across the entire app.
 */

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BookingEntryIntent } from '@features/booking/types';
import type { TripLifecycleStatus } from '@features/trip/types';

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
  SearchRoutes: { intent?: BookingEntryIntent } | undefined;
  PopularRoutes: { intent?: BookingEntryIntent } | undefined;
  CityPicker: { mode: 'from' | 'to' };
  DatePicker: { mode?: 'departure' | 'return' } | undefined;
  CreateTicketBooking: { intent: BookingEntryIntent } | undefined;
  /**
   * source='checkout' → show data from booking store (just completed)
   * source='history'  → resolve the guarded history provider by bookingId
   */
  DigitalTicket:
    | { source: 'checkout' }
    | { source: 'history'; bookingId: string };
};

// ─── Parcel Stack ─────────────────────────────────────────
export type ParcelStackParamList = {
  CityPicker: { mode: 'from' | 'to' };
  DistrictPicker: { city?: string };
  CreateParcel: undefined;
  ParcelDetail: { parcelId: string; fromHistory?: boolean };
  ParcelTracking: { parcelId: string };
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
  ChatbotTab: undefined;
  BookingHistory: { initialTab?: 'ticket' | 'parcel' } | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// ─── Root Navigator ──────────────────────────────────────
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Booking: NavigatorScreenParams<BookingStackParamList>;
  Parcel: NavigatorScreenParams<ParcelStackParamList>;
  Chatbot: undefined;
  /**
   * Tracking screen — accessible from DigitalTicket CTA or Chatbot intent
   * tripId  : ID of the active trip to track
   * bookingId: optional — display context (booking code header)
   * stopId  : optional — pre-center map on a specific stop
   */
  Tracking: {
    tripId: string;
    bookingId?: string;
    stopId?: string;
    tripStatus?: TripLifecycleStatus;
  };
};

// ─── Declaration merging for useNavigation type safety ────
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
