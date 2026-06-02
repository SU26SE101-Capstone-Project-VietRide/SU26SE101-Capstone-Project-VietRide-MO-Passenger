/**
 * VietRide — Navigation Type Definitions
 *
 * Centralized param lists for all navigators, enabling type-safe
 * navigation across the entire app.
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

// ─── Auth Stack ───────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OTPVerification: { phone: string };
  ForgotPassword: undefined;
};

// ─── Booking Stack (nested inside Main) ───────────────────
export type BookingStackParamList = {
  SearchRoutes: undefined;
  RouteResults: {
    departureId: string;
    destinationId: string;
    date: string;
  };
  SeatSelection: {
    tripId: string;
  };
  BookingConfirmation: {
    bookingId: string;
  };
  Payment: {
    bookingId: string;
    amount: number;
  };
  DigitalTicket: {
    bookingRef: string;
  };
};

// ─── Tracking Stack ───────────────────────────────────────
export type TrackingStackParamList = {
  TrackingOverview: undefined;
  TripTracker: {
    tripId: string;
  };
};

// ─── Parcel Stack ─────────────────────────────────────────
export type ParcelStackParamList = {
  ParcelList: undefined;
  CreateParcel: undefined;
  ParcelDetail: {
    parcelId: string;
  };
  ParcelTracking: {
    parcelId: string;
  };
};

// ─── Profile Stack ────────────────────────────────────────
export type ProfileStackParamList = {
  ProfileOverview: undefined;
  EditProfile: undefined;
  Settings: undefined;
  BookingHistory: undefined;
  SavedPayments: undefined;
};

// ─── Main Tab Navigator ──────────────────────────────────
export type MainTabParamList = {
  Home: undefined;
  Notification: undefined;
  Tracking: NavigatorScreenParams<TrackingStackParamList>;
  BookingHistory: undefined;
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
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
