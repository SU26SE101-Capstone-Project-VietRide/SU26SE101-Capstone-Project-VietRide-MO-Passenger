/**
 * CustomTabBar — Reusable custom bottom tab bar component
 *
 * Implements the premium Figma design bottom bar with:
 * - Elevated center floating "Scan" FAB.
 * - Dynamic active indicator background pill.
 * - Multi-language support via react-i18next localization keys.
 */

import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { House, Bell, ClockCounterClockwise, User } from 'phosphor-react-native';

import { fontFamilies, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

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
  const styles = useThemedStyles(createStyles);
  const bottomInset = Math.max(insets.bottom, spacing.sm);

  return (
    <View style={[styles.tabBarContainer, { height: 70 + bottomInset }]}>
      <View style={styles.tabBarSheen} pointerEvents="none" />
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
            <View key={route.key} style={[styles.fabSlot, { paddingBottom: bottomInset }]}>
              <Pressable
                onPress={() => navigation.navigate('Chatbot')}
                style={({ pressed }) => [
                  styles.fabButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Image
                  source={appLogoPlaceholder}
                  style={styles.fabImage}
                  resizeMode="cover"
                />
              </Pressable>
            </View>
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
          <Pressable
            key={route.key}
            onPress={onPress}
            style={({ pressed }) => [
              styles.tabButton,
              { paddingBottom: bottomInset },
              pressed ? styles.pressed : null,
            ]}
          >
            {isFocused ? <View style={styles.activeTabFill} pointerEvents="none" /> : null}
            <View style={styles.tabContent}>
              <IconComponent
                size={22}
                weight={isFocused ? 'fill' : 'regular'}
                color={isFocused ? theme.colors.primary : theme.colors.textSecondary}
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabText,
                  isFocused ? styles.tabTextActive : styles.tabTextInactive,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    ...theme.components.tabBar,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'visible',
  },
  tabBarSheen: {
    position: 'absolute',
    top: 1,
    left: 12,
    right: 12,
    height: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: theme.effects.isLiquid ? 'rgba(255, 255, 255, 0.42)' : 'transparent',
  },
  tabButton: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: spacing.sm,
    overflow: 'hidden',
  },
  activeTabFill: {
    position: 'absolute',
    top: 6,
    left: 5,
    right: 5,
    bottom: 0,
    ...theme.components.activeTab,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  tabContent: {
    position: 'relative',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    width: '100%',
  },
  tabIcon: {
    marginBottom: 3,
  },
  tabText: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontFamily: fontFamilies.semiBold,
  },
  tabTextInactive: {
    color: theme.colors.textSecondary,
  },
  fabSlot: {
    width: 74,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  fabButton: {
    position: 'relative',
    top: -19,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.effects.floatingShadow,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  fabImage: {
    width: '100%',
    height: '100%',
  },
  fabText: {
    fontFamily: fontFamilies.regular,
    fontSize: 9,
    color: theme.colors.textInverse,
    marginTop: 2,
  },
});
