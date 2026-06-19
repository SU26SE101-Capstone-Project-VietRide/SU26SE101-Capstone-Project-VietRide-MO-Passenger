/**
 * CustomTabBar — Reusable custom bottom tab bar component
 *
 * Implements the premium Figma design bottom bar with:
 * - Elevated center floating "Scan" FAB.
 * - Dynamic active indicator background pill.
 * - Multi-language support via react-i18next localization keys.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { House, Bell, ClockCounterClockwise, User } from 'phosphor-react-native';

import { colors, fontFamilies, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { getCardStyle } from '@shared/theme/helpers';

// Import local image for AI button
const appLogoPlaceholder = require('../../assets/images/app_logo_placeholder.png');

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export function CustomTabBar({ state, descriptors: _descriptors, navigation }: CustomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useTheme();
  const isLiquid = theme.variant.startsWith('liquid');

  return (
    <View style={[styles.tabBarContainer, isLiquid && getCardStyle(theme, styles.tabBarContainer), { paddingBottom: insets.bottom || spacing.sm }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Middle AI Chat FAB Layout
        if (route.name === 'ChatbotTab') {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate('Chatbot')}
              activeOpacity={0.85}
              style={[styles.fabButton, { backgroundColor: '#fff', borderWidth: 2, borderColor: colors.primary }]}
            >
              <Image
                source={appLogoPlaceholder}
                style={styles.fabImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          );
        }

        // Standard tabs mapping
        let label = '';
        let IconComponent = House;

        if (route.name === 'Home') {
          label = t('nav.home');
          IconComponent = House;
        } else if (route.name === 'Notification') {
          label = t('profile.notifications');
          IconComponent = Bell;
        } else if (route.name === 'BookingHistory') {
          label = t('profile.history', 'History');
          IconComponent = ClockCounterClockwise;
        } else if (route.name === 'Profile') {
          label = t('nav.profile');
          IconComponent = User;
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.tabButton}
          >
            <View style={[styles.tabContent, isFocused && styles.tabContentActive, isFocused && isLiquid && { backgroundColor: theme.colors.primaryFaded }]}>
              <IconComponent
                size={22}
                weight={isFocused ? 'fill' : 'regular'}
                color={isFocused ? colors.primary : (theme.isDark ? '#A0A0A0' : colors.textSecondary)}
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: theme.isDark ? '#FFF' : colors.textPrimary },
                  isFocused ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: 80,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  tabContentActive: {
    backgroundColor: colors.primaryFaded,
  },
  tabIcon: {
    marginBottom: 3,
  },
  tabText: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabTextInactive: {
    color: colors.textSecondary,
  },
  fabButton: {
    position: 'relative',
    top: -16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  fabImage: {
    width: '100%',
    height: '100%',
  },
  fabText: {
    fontFamily: fontFamilies.regular,
    fontSize: 9,
    color: colors.textInverse,
    marginTop: 2,
  },
});
