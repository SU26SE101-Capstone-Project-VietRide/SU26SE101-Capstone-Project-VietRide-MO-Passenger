import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  User,
  Gear,
  ClockCounterClockwise,
  Question,
  SignOut,
  CaretRight,
  Phone,
  DownloadSimple,
  UploadSimple,
} from 'phosphor-react-native';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { CUSTOM_TAB_BAR_BASE_HEIGHT } from '@shared/components/CustomTabBar';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { ProfileStackParamList } from '@app/navigation/types';

type ProfileNavProp = NativeStackNavigationProp<ProfileStackParamList>;
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
  const displayName = user?.fullName ?? (isGuest ? 'Guest traveler' : 'VietRide Passenger');
  const displayPhone = user?.phone ?? (isGuest ? 'Sign in to save trips and wallet' : 'No phone number');
  const displayInitial = displayName.charAt(0).toUpperCase();
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

  const handleTopUp = useCallback(() => {
    if (!handleRequireAccount()) {
      return;
    }

    navigation.navigate('TopUp');
  }, [handleRequireAccount, navigation]);

  const handleDeposit = useCallback(() => {
    if (!handleRequireAccount()) {
      return;
    }

    // Deposit acts the same as Top Up
    navigation.navigate('TopUp');
  }, [handleRequireAccount, navigation]);

  const handleWithdraw = useCallback(() => {
    if (!handleRequireAccount()) {
      return;
    }

    navigation.navigate('Withdraw');
  }, [handleRequireAccount, navigation]);

  const handleHistory = useCallback(() => {
    if (!handleRequireAccount()) {
      return;
    }

    navigation.navigate('Wallet'); // Keep history in Wallet screen for now
  }, [handleRequireAccount, navigation]);

  const profileMenuItems = [
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
    {
      id: 'booking-history',
      title: t('profile.history', 'History'),
      icon: ClockCounterClockwise,
      onPress: () => navigation.navigate('BookingHistory' as any, { initialTab: 'ticket' }),
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
        navigation.navigate('Chatbot' as any);
      },
    },
  ];

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Scrollable Container */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomTabClearance }]}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ bottom: bottomTabClearance }}
      >
        {/* Title Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{t('nav.profile', 'Profile')}</Text>
        </View>

        {/* User Card Bento Wrapper */}
        <View style={styles.profileCard}>
          <View style={styles.profileInfoSection}>
            <View style={styles.avatarWrapper}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>
                    {displayInitial}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.namePhoneWrapper}>
              <Text style={styles.fullNameText}>{displayName}</Text>
              <View style={styles.phoneRow}>
                <Phone size={14} color={theme.colors.textSecondary} style={styles.phoneIcon} />
                <Text style={styles.phoneText}>{displayPhone}</Text>
              </View>
            </View>
          </View>

          {/* Divider line */}
          <View style={styles.cardDivider} />

          <View style={styles.walletSection}>
            <View style={styles.walletHeader}>
              <View style={styles.walletBalanceContainer}>
                <Text style={styles.walletTitle}>{t('profile.walletBalance', 'Wallet Balance')}</Text>
                <View style={styles.walletAmountRow}>
                  <Text style={styles.walletBalanceAmount}>{isGuest ? '--' : '425'}</Text>
                  <Text style={styles.walletCurrencySymbol}>{isGuest ? '' : 'K ₫'}</Text>
                </View>
              </View>
              <Pressable
                onPress={handleTopUp}
                style={({ pressed }) => [styles.walletTopUpButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.walletTopUpText}>Top Up</Text>
              </Pressable>
            </View>

            <View style={styles.walletActions}>
              <Pressable style={styles.walletActionBtn} onPress={handleDeposit}>
                <View style={styles.walletIconBg}>
                  <DownloadSimple size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.walletActionText}>{t('profile.deposit', 'Deposit')}</Text>
              </Pressable>

              <Pressable style={styles.walletActionBtn} onPress={handleWithdraw}>
                <View style={styles.walletIconBg}>
                  <UploadSimple size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.walletActionText}>{t('profile.withdraw', 'Withdraw')}</Text>
              </Pressable>

              <Pressable style={styles.walletActionBtn} onPress={handleHistory}>
                <View style={styles.walletIconBg}>
                  <ClockCounterClockwise size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.walletActionText}>{t('profile.history', 'History')}</Text>
              </Pressable>
            </View>
          </View>
        </View>

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
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialsAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: theme.colors.primary,
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
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: spacing.md,
  },
  walletSection: {
    paddingTop: spacing.xs,
    width: '100%',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.md,
  },
  walletBalanceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  walletTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  walletAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  walletBalanceAmount: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: theme.colors.textPrimary,
  },
  walletCurrencySymbol: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textSecondary,
    marginLeft: spacing.xxs,
  },
  walletTopUpButton: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTopUpText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.primaryDark,
  },
  walletActions: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  walletActionBtn: {
    alignItems: 'center',
    flex: 1,
  },
  walletIconBg: {
    backgroundColor: theme.colors.primaryFaded,
    borderRadius: borderRadius.lg,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletActionText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
    marginTop: 6,
    textAlign: 'center',
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
