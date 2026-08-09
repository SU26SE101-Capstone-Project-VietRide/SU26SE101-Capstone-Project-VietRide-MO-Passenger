/**
 * Main Tab Navigator — Bottom tabs for authenticated users
 *
 * Houses 5 tabs: Home, Booking (Activity), Tracking (Scan), Parcel (Wallet), Profile.
 * Uses the reusable CustomTabBar shared component to render the premium bottom navbar.
 */

import React from 'react';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import type { MainTabParamList } from './types';
import { HomeScreen, NotificationScreen } from '@features/home';
import { useNotificationUnreadCount } from '@features/home/hooks/useNotifications';
import { ProfileNavigator, BookingHistoryScreen } from '@features/profile';
import { CustomTabBar } from '@shared/components';

const Tab = createBottomTabNavigator<MainTabParamList>();

const renderTabBar = (props: BottomTabBarProps): React.JSX.Element => (
  <CustomTabBar {...props} />
);

// ─── Navigator ────────────────────────────────────────────
export function MainTabNavigator(): React.JSX.Element {
  const unreadCount = useNotificationUnreadCount().data ?? 0;
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Notification"
        component={NotificationScreen}
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen name="BookingHistory" component={BookingHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}
