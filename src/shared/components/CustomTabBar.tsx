/**
 * CustomTabBar — Reusable custom bottom tab bar component
 *
 * Implements the premium Figma design bottom bar with:
 * - Elevated center floating "Scan" FAB.
 * - Dynamic active indicator background pill.
 * - Multi-language support via react-i18next localization keys.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Scan, House, MapTrifold, Wallet, User } from 'phosphor-react-native';

import { colors, fontFamilies, spacing, borderRadius } from '@shared/theme';

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export function CustomTabBar({ state, descriptors: _descriptors, navigation }: CustomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom || spacing.sm }]}>
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

        // Middle Scan FAB Layout
        if (route.name === 'Tracking') {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.85}
              style={styles.fabButton}
            >
              <Scan size={24} color="#fff" weight="bold" />
              <Text style={styles.fabText}>{t('nav.scan')}</Text>
            </TouchableOpacity>
          );
        }

        // Standard tabs mapping
        let label = '';
        let IconComponent = House;

        if (route.name === 'Home') {
          label = t('nav.home');
          IconComponent = House;
        } else if (route.name === 'Booking') {
          label = t('nav.activity');
          IconComponent = MapTrifold;
        } else if (route.name === 'Parcel') {
          label = t('nav.wallet');
          IconComponent = Wallet;
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
            <View style={[styles.tabContent, isFocused && styles.tabContentActive]}>
              <IconComponent
                size={22}
                weight={isFocused ? 'fill' : 'regular'}
                color={isFocused ? '#006a67' : '#3c4948'}
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabText,
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
    height: 72,
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
    backgroundColor: 'rgba(42, 193, 188, 0.18)',
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
    color: '#006a67',
  },
  tabTextInactive: {
    color: '#3c4948',
  },
  fabButton: {
    position: 'relative',
    top: -16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#006a67',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#006a67',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabText: {
    fontFamily: fontFamilies.regular,
    fontSize: 9,
    color: colors.textInverse,
    marginTop: 2,
  },
});
