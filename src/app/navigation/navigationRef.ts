import { createNavigationContainerRef } from '@react-navigation/native';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import {
  getNotificationNavigationIntent,
  NONE_NOTIFICATION_ACTION,
  type NotificationAction,
} from '@shared/notifications/notificationAction';
import type { PendingVnPaySession } from '@shared/payments';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingNotificationAction: NotificationAction | null = null;
let pendingPaymentDestination: PendingVnPaySession | null = null;

const canOpenAuthenticatedRoute = (): boolean => {
  if (!navigationRef.isReady()) return false;
  const { isAuthenticated, user } = useAuthStore.getState();
  if (
    !isAuthenticated
    || user?.status !== 'ACTIVE'
    || !user.phone
  ) {
    return false;
  }
  return navigationRef.getRootState().routeNames.includes('Main');
};

const navigateToNotificationAction = (action: NotificationAction): void => {
  const intent = getNotificationNavigationIntent(action);
  switch (intent?.type) {
    case 'booking-history':
      navigationRef.navigate('Main', {
        screen: 'BookingHistory',
        params: { initialTab: 'ticket' },
      });
      return;
    case 'trip-tracking':
      navigationRef.navigate('Tracking', {
        source: 'trip',
        tripId: intent.tripId,
      });
      return;
    case 'parcel-detail':
      navigationRef.navigate('Parcel', {
        screen: 'ParcelDetail',
        params: { parcelId: intent.parcelId, fromHistory: true },
      });
      return;
    case 'wallet':
      navigationRef.navigate('Main', {
        screen: 'Profile',
        params: { screen: 'Wallet' },
      });
      return;
    case 'shuttle-tracking':
      navigationRef.navigate('Tracking', {
        source: 'shuttle',
        shuttleTripId: intent.shuttleTripId,
        ...(intent.bookingId ? { bookingId: intent.bookingId } : {}),
      });
      return;
    default:
      navigationRef.navigate('Main', { screen: 'Notification' });
  }
};

export const flushPendingNotificationOpen = (): void => {
  if (!pendingNotificationAction || !canOpenAuthenticatedRoute()) return;

  const action = pendingNotificationAction;
  pendingNotificationAction = null;
  navigateToNotificationAction(action);
};

export const openNotificationFromSystemTray = (
  action: NotificationAction = NONE_NOTIFICATION_ACTION,
): void => {
  pendingNotificationAction = action;
  flushPendingNotificationOpen();
};

export const discardPendingNotificationOpen = (): void => {
  pendingNotificationAction = null;
};

export const openNotificationInboxFromSystemTray = (): void => {
  openNotificationFromSystemTray(NONE_NOTIFICATION_ACTION);
};

export const flushPendingPaymentOpen = (): void => {
  const pending = pendingPaymentDestination;
  if (!pending || !canOpenAuthenticatedRoute()) return;

  const currentUserId = useAuthStore.getState().user?.id;
  pendingPaymentDestination = null;
  if (!currentUserId || pending.ownerUserId !== currentUserId) return;

  switch (pending.kind) {
    case 'booking':
      navigationRef.navigate('Main', {
        screen: 'BookingHistory',
        params: { initialTab: 'ticket' },
      });
      return;
    case 'parcel_deposit':
    case 'parcel_final':
      if (!pending.businessId) return;
      navigationRef.navigate('Parcel', {
        screen: 'ParcelDetail',
        params: { parcelId: pending.businessId, fromHistory: true },
      });
      return;
    case 'topup':
      navigationRef.navigate('Main', {
        screen: 'Profile',
        params: { screen: 'Wallet' },
      });
  }
};

export const openPendingPaymentDestination = (
  pending: PendingVnPaySession,
): void => {
  pendingPaymentDestination = pending;
  flushPendingPaymentOpen();
};

export const discardPendingPaymentOpen = (): void => {
  pendingPaymentDestination = null;
};

export const flushPendingNavigationOpens = (): void => {
  flushPendingNotificationOpen();
  flushPendingPaymentOpen();
};
