/**
 * VietRide — Navigation Type Definitions
 *
 * Centralized param lists for all navigators, enabling type-safe
 * navigation across the entire app.
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

// ─── Auth Stack ───────────────────────────────────────────
export type AuthStackParamList = {
  Login: { email?: string; verified?: boolean } | undefined;
  Register: undefined;
  OTPVerification: {
    email: string;
    phone?: string;
    otpTtlMinutes?: number;
  };
  ForgotPassword: undefined;
};

// ─── Booking Stack (nested inside Main) ───────────────────
export type BookingStackParamList = {
  SearchRoutes: undefined;
  PopularRoutes: undefined;
  CityPicker: { mode: 'from' | 'to' };
  DatePicker: { mode?: 'departure' | 'return' } | undefined;
  PassengersPicker: { current: number };
  CreateTicketBooking: undefined;
  DigitalTicket: {
    bookingRef: string;
    fromHistory?: boolean;
  };
  Tracking: undefined;
};



// ─── Parcel Stack ─────────────────────────────────────────
export type ParcelStackParamList = {

  CityPicker: { mode: 'from' | 'to' };
  DistrictPicker: { city?: string };
  CreateParcel: undefined;
  ParcelDetail: { parcelId: string; fromHistory?: boolean; };
  ParcelTracking: { parcelId: string };
};

// ─── Profile Stack ────────────────────────────────────────
export type ProfileStackParamList = {
  ProfileOverview: undefined;
  EditProfile: undefined;
  Settings: undefined;
  ThemeSettings: undefined;
  Wallet: undefined;
  TopUp: undefined;
  Withdraw: undefined;
  AddPaymentMethod: undefined;
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
};

// ─── Declaration merging for useNavigation type safety ────
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
