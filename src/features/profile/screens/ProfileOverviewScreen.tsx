import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Scroll,
} from 'phosphor-react-native';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import {
  useFloatingTabBarContentInset,
  useTabBarScrollBehavior,
  useThemedStyles,
} from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { UserAvatar } from '@shared/components';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type {
  MainTabParamList,
  ProfileStackParamList,
  RootStackParamList,
} from '@app/navigation/types';
import { FinancialFeatureNotice } from '../components/FinancialFeatureNotice';
import { appConfig } from '@shared/constants/config';
import { isProfileWalletEntryPointEnabled } from '../config/financialCapabilities';

type ProfileNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;
export function ProfileOverviewScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<ProfileNavProp>();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const bottomTabClearance = useFloatingTabBarContentInset();
  const displayName = user?.fullName ?? t('profile.passengerName');
  const displayPhone = user?.phone ?? t('profile.phoneUnavailable');
  const isVerified = user?.status === 'ACTIVE';

  const handleLogout = useCallback(async () => {
    Alert.alert(
      t('auth.logout'),
      t('profile.logoutConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  }, [logout, t]);

  const profileMenuItems = useMemo(() => [
    {
      id: 'edit-profile',
      title: t('profile.editProfile'),
      icon: User,
      onPress: () => navigation.navigate('EditProfile'),
    },
    ...(isProfileWalletEntryPointEnabled() ? [{
      id: 'wallet',
      title: t('profile.wallet'),
      icon: Wallet,
      onPress: () => navigation.navigate('Wallet'),
    }] : []),
    {
      id: 'booking-history',
      title: t('profile.history'),
      icon: ClockCounterClockwise,
      onPress: () => navigation.navigate('BookingHistory', { initialTab: 'ticket' }),
    },
    {
      id: 'settings',
      title: t('profile.settings'),
      icon: Gear,
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'policies',
      title: t('profile.policies'),
      icon: Scroll,
      onPress: () => navigation.navigate('PolicyList'),
    },
    {
      id: 'help-support',
      title: t('profile.helpSupport'),
      icon: Question,
      onPress: () => {
        // Chatbot helper navigation (registered at root level)
        navigation.navigate('Chatbot');
      },
    },
  ], [navigation, t]);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.transparent}
        translucent
      />

      {/* Scrollable Container */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomTabClearance },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ bottom: bottomTabClearance }}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      >
        {/* Title Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        </View>

        {/* User Card Bento Wrapper */}
        <View style={styles.profileCard}>
          <View style={styles.profileInfoSection}>
            <View style={styles.avatarWrapper}>
              <UserAvatar url={user?.avatarUrl} name={displayName} size={64} />
            </View>
            <View style={styles.namePhoneWrapper}>
              <View style={styles.nameVerifyRow} testID="profile-name-row">
                <Text
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  style={styles.fullNameText}
                  testID="profile-display-name"
                >
                  {displayName}
                </Text>
                <View style={styles.verifyBadgeSlot} testID="profile-verification-badge">
                  {isVerified ? (
                    <CheckCircle
                      size={18}
                      color={theme.colors.success}
                      weight="fill"
                    />
                  ) : (
                    <WarningCircle
                      size={18}
                      color={theme.colors.warning}
                      weight="fill"
                    />
                  )}
                </View>
              </View>
              <View style={styles.phoneRow}>
                <Phone size={14} color={theme.colors.textSecondary} style={styles.phoneIcon} />
                <Text style={styles.phoneText}>{displayPhone}</Text>
              </View>
              {!isVerified && user?.email ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.verifyAccount')}
                  onPress={() => navigation.navigate('OTPVerification', {
                    email: user.email ?? '',
                    purpose: 'REGISTRATION',
                    fromProfile: true,
                  })}
                  style={({ pressed }) => [styles.verifyButton, pressed ? styles.pressed : null]}
                >
                  <WarningCircle size={14} color={theme.colors.warning} weight="bold" />
                  <Text style={styles.verifyButtonText}>{t('profile.verifyAccount')}</Text>
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
                accessibilityRole="button"
                accessibilityLabel={item.title}
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
          accessibilityRole="button"
          accessibilityLabel={t('auth.logout')}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed ? styles.pressed : null,
          ]}
          onPress={handleLogout}
        >
          <SignOut size={20} color={theme.colors.error} weight="bold" />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </Pressable>

        <Text style={styles.versionText}>
          {t('profile.appVersion', { version: appConfig.appVersion })}
        </Text>
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
    minWidth: 0,
  },
  fullNameText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
    flexShrink: 1,
    minWidth: 0,
  },
  nameVerifyRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.xs,
  },
  verifyBadgeSlot: {
    width: 18,
    height: 18,
    flexShrink: 0,
    marginLeft: spacing.xs,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  verifyButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.warningLight,
    borderRadius: borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    alignSelf: 'flex-start' as const,
  },
  verifyButtonText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.warning,
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
  logoutText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.error,
    marginLeft: spacing.sm,
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
