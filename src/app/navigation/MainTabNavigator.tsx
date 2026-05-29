/**
 * Main Tab Navigator — Bottom tabs for authenticated users
 *
 * Houses 5 tabs: Home, Booking, Tracking, Parcel, Profile.
 * Each tab can nest its own stack navigator.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

import type { MainTabParamList } from './types';
import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Placeholder Screens (replaced in Phase 4) ───────────

function HomeScreen(): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>VietRide</Text>
      <Text style={styles.placeholderSubtitle}>
        Your journey starts here
      </Text>
    </View>
  );
}

function BookingScreen(): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Booking</Text>
    </View>
  );
}

function TrackingScreen(): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Tracking</Text>
    </View>
  );
}

function ParcelScreen(): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Parcel</Text>
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

// ─── Tab Icon placeholder (swap with vector icons in Phase 4) ─

interface TabIconProps {
  label: string;
  focused: boolean;
}

function TabIcon({ label, focused }: TabIconProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.tabIconContainer,
        focused && styles.tabIconContainerActive,
      ]}
    >
      <Text
        style={[styles.tabIconText, focused && styles.tabIconTextActive]}
      >
        {label.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Navigator ────────────────────────────────────────────

export function MainTabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Booking"
        component={BookingScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Booking" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Tracking"
        component={TrackingScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Tracking" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Parcel"
        component={ParcelScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Parcel" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Profile" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  placeholderTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h2,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  placeholderSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  placeholderText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  tabBarLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
  },
  tabIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconContainerActive: {
    backgroundColor: colors.primaryFaded,
  },
  tabIconText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
  },
  tabIconTextActive: {
    color: colors.primary,
  },
});
