/**
 * CustomTabBar — Reusable custom bottom tab bar component
 *
 * Floating modern bottom tabs with an elevated center Chatbot action.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Pressable, Image, Animated, Easing } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { House, Bell, ClockCounterClockwise, User } from 'phosphor-react-native';

import { spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { useTabBarStore } from '@shared/store/useTabBarStore';
import type { AppTheme } from '@shared/theme';
import { APP_LOGO } from '@shared/constants/assets';

export const CUSTOM_TAB_BAR_BASE_HEIGHT = 76;
const TAB_BAR_COLLAPSE_DURATION_MS = 320;
const TAB_BAR_EXPAND_DURATION_MS = 360;

export function CustomTabBar({ state, descriptors: _descriptors, navigation }: BottomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isCompact = useTabBarStore((tabBarState) => tabBarState.isCompact);
  const setCompact = useTabBarStore((tabBarState) => tabBarState.setCompact);
  const bottomInset = Math.max(insets.bottom, spacing.sm);
  const compactProgress = useRef(new Animated.Value(isCompact ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(compactProgress, {
      toValue: isCompact ? 1 : 0,
      duration: isCompact ? TAB_BAR_COLLAPSE_DURATION_MS : TAB_BAR_EXPAND_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [compactProgress, isCompact]);

  const animatedTabBarStyle = useMemo(
    () => ({
      opacity: compactProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.96],
      }),
      transform: [
        {
          translateY: compactProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 8],
          }),
        },
        {
          scaleX: compactProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.88],
          }),
        },
        {
          scaleY: compactProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.82],
          }),
        },
      ],
    }),
    [compactProgress],
  );

  return (
    <View
      style={[
        styles.tabBarContainer,
        { bottom: bottomInset, height: CUSTOM_TAB_BAR_BASE_HEIGHT },
      ]}
    >
      <Animated.View style={[styles.tabBarAnimatedGroup, animatedTabBarStyle]}>
        <View style={styles.tabBarOuterHalo} pointerEvents="none" />
        <View style={styles.tabBarShadowWide} pointerEvents="none" />
        <View style={styles.tabBarShadowTight} pointerEvents="none" />
        <View style={styles.tabBarSurface} pointerEvents="none" />
        <View style={styles.tabBarSheen} pointerEvents="none" />
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            setCompact(false);

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
              <View key={route.key} style={styles.fabSlot}>
                <Pressable
                  onPress={() => {
                    setCompact(false);
                    navigation.navigate('Chatbot');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="VietRide assistant"
                  style={({ pressed }) => [
                    styles.fabButton,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Image
                    source={APP_LOGO}
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
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: isFocused }}
              style={({ pressed }) => [
                styles.tabButton,
                pressed ? styles.pressed : null,
              ]}
            >
              {isFocused ? <View style={styles.activeTabFill} pointerEvents="none" /> : null}
              <View style={styles.tabContent}>
                <IconComponent
                  size={22}
                  weight={isFocused ? 'fill' : 'regular'}
                  color={isFocused ? theme.colors.textInverse : theme.colors.textSecondary}
                  style={styles.tabIcon}
                />
                {isFocused ? <View style={styles.activeDot} /> : <View style={styles.dotSpacer} />}
              </View>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  tabBarContainer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    overflow: 'visible',
  },
  tabBarAnimatedGroup: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 38,
    paddingHorizontal: spacing.sm,
    overflow: 'visible',
  },
  tabBarOuterHalo: {
    position: 'absolute',
    top: -3,
    right: -3,
    bottom: -3,
    left: -3,
    borderRadius: 42,
    backgroundColor: theme.isDark
      ? 'rgba(85, 241, 232, 0.09)'
      : theme.effects.isLiquid
        ? 'rgba(0, 125, 120, 0.14)'
        : 'rgba(0, 106, 103, 0.10)',
  },
  tabBarShadowWide: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: -13,
    height: 48,
    borderRadius: 999,
    backgroundColor: theme.isDark
      ? 'rgba(0, 0, 0, 0.48)'
      : theme.effects.isLiquid
        ? 'rgba(0, 106, 103, 0.22)'
        : 'rgba(0, 74, 72, 0.20)',
  },
  tabBarShadowTight: {
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: -6,
    height: 30,
    borderRadius: 999,
    backgroundColor: theme.isDark
      ? 'rgba(0, 0, 0, 0.58)'
      : theme.effects.isLiquid
        ? 'rgba(0, 106, 103, 0.28)'
        : 'rgba(0, 74, 72, 0.24)',
  },
  tabBarSurface: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 38,
    backgroundColor: theme.isDark
      ? theme.effects.tabBarSurface
      : theme.effects.isLiquid
        ? 'rgba(255, 255, 255, 0.96)'
        : '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.isDark
      ? theme.effects.glassBorderStrong
      : theme.effects.isLiquid
        ? 'rgba(0, 106, 103, 0.24)'
        : 'rgba(0, 106, 103, 0.18)',
  },
  tabBarSheen: {
    position: 'absolute',
    top: 2,
    left: 18,
    right: 18,
    height: 22,
    borderRadius: 999,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSheen : 'transparent',
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    overflow: 'visible',
    zIndex: 2,
  },
  activeTabFill: {
    position: 'absolute',
    top: 5,
    left: '50%',
    marginLeft: -23,
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.isDark ? theme.colors.primaryLight : theme.colors.primary,
  },
  tabContent: {
    position: 'relative',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: '100%',
  },
  tabIcon: {
    marginTop: 2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textInverse,
  },
  dotSpacer: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  fabSlot: {
    width: 68,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 3,
  },
  fabButton: {
    position: 'relative',
    top: -16,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surfaceElevated,
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
} as const);
