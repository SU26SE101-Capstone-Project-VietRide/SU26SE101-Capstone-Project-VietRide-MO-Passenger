/**
 * Main Tab Navigator — Bottom tabs for authenticated users
 *
 * Houses 5 tabs: Home, Booking (Activity), Tracking (Scan), Parcel (Wallet), Profile.
 * Uses the reusable CustomTabBar shared component to render the premium bottom navbar.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

import type { MainTabParamList } from './types';
import { fontFamilies, fontSizes } from '@shared/theme';
import { HomeScreen } from '@features/home';
import { BookingNavigator } from '@features/booking';
import { ParcelNavigator } from '@features/parcel';
import { CustomTabBar } from '@shared/components';

const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Placeholder Screens ──────────────────────────────────

function TrackingScreen(): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Scan QR Code</Text>
    </View>
  );
}



function ProfileScreen(): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Profile</Text>
    </View>
  );
}

// ─── Navigator ────────────────────────────────────────────
export function MainTabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Booking" component={BookingNavigator} />
      <Tab.Screen name="Tracking" component={TrackingScreen} />
      <Tab.Screen name="Parcel" component={ParcelNavigator} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FF',
  },
  placeholderText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.lg,
    color: '#3c4948',
  },
});
