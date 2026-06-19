import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  User,
  Gear,
  CreditCard,
  ClockCounterClockwise,
  Question,
  SignOut,
  CaretRight,
  Phone,
  DownloadSimple,
  UploadSimple,
} from 'phosphor-react-native';

import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { getCardStyle } from '@shared/theme/helpers';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { ProfileStackParamList } from '@app/navigation/types';

type ProfileNavProp = NativeStackNavigationProp<ProfileStackParamList>;

export function ProfileOverviewScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<ProfileNavProp>();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useTheme();
  const isLiquid = theme.variant.startsWith('liquid');

  const handleLogout = useCallback(() => {
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
  }, [logout, t]);

  const handleTopUp = useCallback(() => {
    navigation.navigate('TopUp');
  }, [navigation]);

  const handleDeposit = useCallback(() => {
    // Deposit acts the same as Top Up
    navigation.navigate('TopUp');
  }, [navigation]);

  const handleWithdraw = useCallback(() => {
    navigation.navigate('Withdraw');
  }, [navigation]);

  const handleHistory = useCallback(() => {
    navigation.navigate('Wallet'); // Keep history in Wallet screen for now
  }, [navigation]);

  const profileMenuItems = [
    {
      id: 'edit-profile',
      title: t('profile.editProfile', 'Edit Profile'),
      icon: User,
      onPress: () => navigation.navigate('EditProfile'),
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
    <SafeAreaView style={[styles.safeContainer, isLiquid && { backgroundColor: theme.colors.background }]} edges={['top']}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Scrollable Container */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.headerTitle, { color: theme.isDark ? '#FFF' : colors.textPrimary }]}>{t('nav.profile', 'Profile')}</Text>
        </View>

        {/* User Card Bento Wrapper */}
        <View style={[styles.profileCard, isLiquid && getCardStyle(theme, styles.profileCard)]}>
          <View style={styles.profileInfoSection}>
            <View style={styles.avatarWrapper}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>
                    {user?.fullName?.charAt(0).toUpperCase() || 'V'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.namePhoneWrapper}>
              <Text style={[styles.fullNameText, { color: theme.isDark ? '#FFF' : colors.textPrimary }]}>{user?.fullName || 'Viết Thông'}</Text>
              <View style={styles.phoneRow}>
                <Phone size={14} color={theme.isDark ? '#A0A0A0' : colors.textSecondary} style={styles.phoneIcon} />
                <Text style={[styles.phoneText, { color: theme.isDark ? '#A0A0A0' : colors.textSecondary }]}>{user?.phone || '+84 987 654 321'}</Text>
              </View>
            </View>
          </View>

          {/* Divider line */}
          <View style={[styles.cardDivider, isLiquid && { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.15)' : colors.divider }]} />

          <View style={styles.walletSection}>
            <View style={styles.walletHeader}>
              <View style={styles.walletBalanceContainer}>
                <Text style={[styles.walletTitle, { color: theme.isDark ? '#EBEBF5' : colors.textSecondary }]}>{t('profile.walletBalance', 'Wallet Balance')}</Text>
                <View style={styles.walletAmountRow}>
                  <Text style={[styles.walletBalanceAmount, { color: theme.isDark ? '#FFF' : colors.textPrimary }]}>425</Text>
                  <Text style={[styles.walletCurrencySymbol, { color: theme.isDark ? '#EBEBF5' : colors.textSecondary }]}>K ₫</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleTopUp}
                activeOpacity={0.8}
                style={styles.walletTopUpButton}
              >
                <Text style={styles.walletTopUpText}>Top Up</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.walletActions, isLiquid && { borderTopColor: theme.isDark ? 'rgba(255,255,255,0.15)' : colors.divider }]}>
              <TouchableOpacity style={styles.walletActionBtn} onPress={handleDeposit} activeOpacity={0.7}>
                <View style={[styles.walletIconBg, isLiquid && { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.15)' : colors.primaryFaded }]}>
                  <DownloadSimple size={20} color={theme.isDark ? '#FFF' : colors.primary} />
                </View>
                <Text style={[styles.walletActionText, { color: theme.isDark ? '#FFF' : colors.textPrimary }]}>{t('profile.deposit', 'Deposit')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.walletActionBtn} onPress={handleWithdraw} activeOpacity={0.7}>
                <View style={[styles.walletIconBg, isLiquid && { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.15)' : colors.primaryFaded }]}>
                  <UploadSimple size={20} color={theme.isDark ? '#FFF' : colors.primary} />
                </View>
                <Text style={[styles.walletActionText, { color: theme.isDark ? '#FFF' : colors.textPrimary }]}>{t('profile.withdraw', 'Withdraw')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.walletActionBtn} onPress={handleHistory} activeOpacity={0.7}>
                <View style={[styles.walletIconBg, isLiquid && { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.15)' : colors.primaryFaded }]}>
                  <ClockCounterClockwise size={20} color={theme.isDark ? '#FFF' : colors.primary} />
                </View>
                <Text style={[styles.walletActionText, { color: theme.isDark ? '#FFF' : colors.textPrimary }]}>{t('profile.history', 'History')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.menuContainer, isLiquid && getCardStyle(theme, styles.menuContainer)]}>
          {profileMenuItems.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === profileMenuItems.length - 1;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  isFirst && styles.firstMenuItem,
                  isLast && styles.lastMenuItem,
                  isLiquid && { borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.1)' : colors.divider }
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, isLiquid && { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : colors.primaryFaded }]}>
                    <item.icon size={18} color={theme.isDark ? '#FFF' : colors.primary} />
                  </View>
                  <Text style={[styles.menuItemTitle, { color: theme.isDark ? '#FFF' : colors.textPrimary }]}>{item.title}</Text>
                </View>
                <CaretRight size={16} color={theme.isDark ? '#A0A0A0' : colors.textTertiary} weight="bold" />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, isLiquid && { backgroundColor: theme.isDark ? 'rgba(255,60,60,0.1)' : colors.surface }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <SignOut size={20} color={colors.error} weight="bold" />
          <Text style={styles.logoutText}>{t('auth.logout', 'Log Out')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>VietRide Passenger • v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 130,
  },
  headerContainer: {
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: colors.textPrimary,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
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
    backgroundColor: colors.surfaceAlt,
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
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: colors.primary,
  },
  namePhoneWrapper: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  fullNameText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
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
    color: colors.textSecondary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.divider,
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
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  walletAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  walletBalanceAmount: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: colors.textPrimary,
  },
  walletCurrencySymbol: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginLeft: spacing.xxs,
  },
  walletTopUpButton: {
    backgroundColor: '#2ac1bc',
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTopUpText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: '#004a48',
  },
  walletActions: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
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
    backgroundColor: colors.primaryFaded,
    borderRadius: borderRadius.lg,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletActionText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    marginTop: 6,
    textAlign: 'center',
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
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
    borderBottomColor: colors.divider,
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
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuItemTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
    marginBottom: spacing.xl,
  },
  logoutText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.error,
    marginLeft: spacing.sm,
  },
  versionText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
