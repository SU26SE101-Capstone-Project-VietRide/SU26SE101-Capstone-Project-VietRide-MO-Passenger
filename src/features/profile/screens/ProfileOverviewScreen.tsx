import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import {
  User,
  Gear,
  ClockCounterClockwise,
  Question,
  SignOut,
  CaretRight,
  Phone,
  CheckCircle,
  WarningCircle,
  Wallet,
} from 'phosphor-react-native';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { CUSTOM_TAB_BAR_BASE_HEIGHT } from '@shared/components/CustomTabBar';
import { UserAvatar } from '@shared/components';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type {
  MainTabParamList,
  ProfileStackParamList,
  RootStackParamList,
} from '@app/navigation/types';
import { FinancialFeatureNotice } from '../components/FinancialFeatureNotice';
import { isProfileWalletEntryPointEnabled } from '../config/financialCapabilities';

type ProfileNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;
const PROFILE_BOTTOM_CONTENT_GAP = spacing.huge;

export function ProfileOverviewScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<ProfileNavProp>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const isGuest = useAuthStore((state) => state.isGuest);
  const logout = useAuthStore((state) => state.logout);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const displayName = user?.fullName ?? (isGuest ? 'Guest traveler' : 'VietRide Passenger');
  const displayPhone = user?.phone ?? (isGuest ? 'Sign in to save your trips' : 'No phone number');
  const isVerified = user?.status === 'ACTIVE';
  const bottomTabClearance =
    CUSTOM_TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, spacing.sm) + PROFILE_BOTTOM_CONTENT_GAP;

  const handleRequireAccount = useCallback(() => {
    if (!isGuest) {
      return true;
    }

    Alert.alert(
      'Sign in required',
      'Please sign in or create an account to use this feature.',
      [
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: 'Sign in',
          onPress: async () => {
            await logout();
          },
        },
      ],
    );

    return false;
  }, [isGuest, logout, t]);

  const handleLogout = useCallback(async () => {
    if (isGuest) {
      await logout();
      return;
    }

    Alert.alert(
      t('auth.logout', 'Log Out'),
      t('profile.logoutConfirm', 'Are you sure you want to log out of VietRide?'),
      [
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: t('auth.logout', 'Log Out'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  }, [isGuest, logout, t]);

  const profileMenuItems = useMemo(() => [
    {
      id: 'edit-profile',
      title: t('profile.editProfile', 'Edit Profile'),
      icon: User,
      onPress: () => {
        if (handleRequireAccount()) {
          navigation.navigate('EditProfile');
        }
      },
    },
    ...(isProfileWalletEntryPointEnabled() && !isGuest ? [{
      id: 'wallet',
      title: 'Wallet',
      icon: Wallet,
      onPress: () => navigation.navigate('Wallet'),
    }] : []),
    {
      id: 'booking-history',
      title: t('profile.history', 'History'),
      icon: ClockCounterClockwise,
      onPress: () => navigation.navigate('BookingHistory', { initialTab: 'ticket' }),
    },
    {
      id: 'settings',
      title: t('profile.settings', 'Settings'),
      icon: Gear,
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'help-support',
      title: t('profile.helpSupport', 'Help & Support'),
      icon: Question,
      onPress: () => {
        // Chatbot helper navigation (registered at root level)
        navigation.navigate('Chatbot');
      },
    },
  ], [handleRequireAccount, isGuest, navigation, t]);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Scrollable Container */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomTabClearance }]}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ bottom: bottomTabClearance }}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      >
        {/* Title Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{t('nav.profile', 'Profile')}</Text>
        </View>

        {/* User Card Bento Wrapper */}
        <View style={styles.profileCard}>
          <View style={styles.profileInfoSection}>
            <View style={styles.avatarWrapper}>
              <UserAvatar url={user?.avatarUrl} name={displayName} size={64} />
            </View>
            <View style={styles.namePhoneWrapper}>
              <View style={styles.nameVerifyRow}>
                <Text style={styles.fullNameText}>{displayName}</Text>
                {!isGuest ? (
                  isVerified ? (
                    <CheckCircle size={18} color={theme.colors.success ?? '#22C55E'} weight="fill" style={styles.verifyBadge} />
                  ) : (
                    <WarningCircle size={18} color="#F59E0B" weight="fill" style={styles.verifyBadge} />
                  )
                ) : null}
              </View>
              <View style={styles.phoneRow}>
                <Phone size={14} color={theme.colors.textSecondary} style={styles.phoneIcon} />
                <Text style={styles.phoneText}>{displayPhone}</Text>
              </View>
              {!isGuest && !isVerified && user?.email ? (
                <Pressable
                  onPress={() => navigation.navigate('OTPVerification', {
                    email: user.email ?? '',
                    purpose: 'REGISTRATION',
                    fromProfile: true,
                  })}
                  style={({ pressed }) => [styles.verifyButton, pressed ? styles.pressed : null]}
                >
                  <WarningCircle size={14} color="#F59E0B" weight="bold" />
                  <Text style={styles.verifyButtonText}>Verify Account</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

        </View>

        {!isProfileWalletEntryPointEnabled() ? <FinancialFeatureNotice /> : null}

        <View style={styles.menuContainer}>
          {profileMenuItems.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === profileMenuItems.length - 1;
            return (
              <Pressable
                key={item.id}
                style={[
                  styles.menuItem,
                  isFirst && styles.firstMenuItem,
                  isLast && styles.lastMenuItem,
                ]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <item.icon size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                </View>
                <CaretRight size={16} color={theme.colors.textTertiary} weight="bold" />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            isGuest ? styles.signInButton : null,
            pressed ? styles.pressed : null,
          ]}
          onPress={handleLogout}
        >
          <SignOut size={20} color={isGuest ? theme.colors.primary : theme.colors.error} weight="bold" />
          <Text style={[styles.logoutText, isGuest ? styles.signInText : null]}>
            {isGuest ? 'Sign in / Register' : t('auth.logout', 'Log Out')}
          </Text>
        </Pressable>

        <Text style={styles.versionText}>VietRide Passenger • v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeContainer: {
    ...theme.components.screen,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  headerContainer: {
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: theme.colors.textPrimary,
  },
  profileCard: {
    ...theme.components.elevatedCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  profileInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  namePhoneWrapper: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  fullNameText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
    marginBottom: spacing.xs,
  },
  nameVerifyRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  verifyBadge: {
    marginLeft: spacing.xs,
  },
  verifyButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    alignSelf: 'flex-start' as const,
  },
  verifyButtonText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: '#D97706',
    marginLeft: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneIcon: {
    marginRight: spacing.xs,
  },
  phoneText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  menuContainer: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  firstMenuItem: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuItemTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.components.dangerButton,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  signInButton: {
    ...theme.components.secondaryButton,
  },
  logoutText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.error,
    marginLeft: spacing.sm,
  },
  signInText: {
    color: theme.colors.primary,
  },
  versionText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
