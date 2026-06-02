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
  Trophy,
  Phone,
} from 'phosphor-react-native';

import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { ProfileStackParamList } from '@app/navigation/types';

type ProfileNavProp = NativeStackNavigationProp<ProfileStackParamList>;

export function ProfileOverviewScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<ProfileNavProp>();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  // Mock loyalty points & member tier
  const loyaltyPoints = 580;
  const loyaltyTier = 'Gold';

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

  const profileMenuItems = [
    {
      id: 'edit-profile',
      title: t('profile.editProfile', 'Edit Profile'),
      icon: User,
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      id: 'booking-history',
      title: t('profile.bookingHistory', 'Booking History'),
      icon: ClockCounterClockwise,
      onPress: () => navigation.navigate('BookingHistory'),
    },
    {
      id: 'saved-payments',
      title: t('profile.savedPayments', 'Saved Payments'),
      icon: CreditCard,
      onPress: () => navigation.navigate('SavedPayments' as any),
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Scrollable Container */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
                    {user?.fullName?.charAt(0).toUpperCase() || 'V'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.namePhoneWrapper}>
              <Text style={styles.fullNameText}>{user?.fullName || 'Viết Thông'}</Text>
              <View style={styles.phoneRow}>
                <Phone size={14} color={colors.textSecondary} style={styles.phoneIcon} />
                <Text style={styles.phoneText}>{user?.phone || '+84 987 654 321'}</Text>
              </View>
            </View>
          </View>

          {/* Divider line */}
          <View style={styles.cardDivider} />

          {/* Loyalty Points Card section */}
          <View style={styles.loyaltySection}>
            <View style={styles.loyaltyHeader}>
              <View style={styles.tierBadge}>
                <Trophy size={16} color={colors.accent} weight="fill" />
                <Text style={styles.tierText}>{loyaltyTier} Member</Text>
              </View>
              <Text style={styles.pointsText}>
                {loyaltyPoints} <Text style={styles.pointsLabel}>pts</Text>
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: '58%' }]} />
              </View>
              <Text style={styles.progressLabel}>
                {1000 - loyaltyPoints} points to Platinum
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Options Group */}
        <View style={styles.menuContainer}>
          {profileMenuItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index === 0 && styles.firstMenuItem,
                  index === profileMenuItems.length - 1 && styles.lastMenuItem,
                ]}
                onPress={item.onPress}
                activeOpacity={0.6}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <IconComponent size={20} color={colors.primary} weight="regular" />
                  </View>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                </View>
                <CaretRight size={18} color={colors.textTertiary} weight="bold" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <SignOut size={20} color={colors.error} weight="regular" />
          <Text style={styles.logoutText}>{t('auth.logout', 'Log Out')}</Text>
        </TouchableOpacity>

        {/* Footnote */}
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
    paddingBottom: spacing.xxl,
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
  loyaltySection: {
    paddingTop: spacing.xs,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tierText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.accentDark,
    marginLeft: spacing.xs,
  },
  pointsText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  pointsLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  progressContainer: {
    width: '100%',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
  },
  progressLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
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
