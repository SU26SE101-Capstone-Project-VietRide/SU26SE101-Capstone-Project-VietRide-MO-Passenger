import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ClockCounterClockwise,
  DeviceMobile,
  Key,
  ShieldCheck,
  WarningCircle,
} from 'phosphor-react-native';

import type { ProfileStackParamList } from '@app/navigation/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import {
  useFloatingTabBarContentInset,
  useTabBarScrollBehavior,
  useThemedStyles,
} from '@shared/hooks';
import { borderRadius, fontFamilies, fontSizes, spacing } from '@shared/theme';
import type { AppTheme } from '@shared/theme';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { PROFILE_SECURITY_CAPABILITIES } from '../config/securityCapabilities';

type ProfileNavProp = NativeStackNavigationProp<ProfileStackParamList>;

export function SecurityScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<ProfileNavProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const bottomTabClearance = useFloatingTabBarContentInset();
  const user = useAuthStore((state) => state.user);
  const platformLabel = Platform.select({
    ios: 'iOS',
    android: 'Android',
    default: t('security.mobilePlatform'),
  });
  const accountStatus = useMemo(() => {
    switch (user?.status) {
      case 'ACTIVE':
        return t('security.status.active');
      case 'PENDING_EMAIL_VERIFICATION':
        return t('security.status.pendingEmailVerification');
      case 'PENDING_INITIAL_PASSWORD':
        return t('security.status.pendingInitialPassword');
      case 'LOCKED':
        return t('security.status.locked');
      default:
        return t('security.status.unknown');
    }
  }, [t, user?.status]);
  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t('security.title')}</Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomTabClearance },
        ]}
        scrollIndicatorInsets={{ bottom: bottomTabClearance }}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <ShieldCheck size={28} color={theme.colors.primary} weight="fill" />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>{t('security.heroTitle')}</Text>
            <Text style={styles.heroText}>
              {t('security.heroDescription')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('security.accountSection')}</Text>
          <View style={styles.card}>
            <InfoRow
              label={t('security.loginEmail')}
              value={user?.email || t('common.notAvailable')}
            />
            <View style={styles.rowDivider} />
            <InfoRow label={t('security.accountStatus')} value={accountStatus} />
            <View style={styles.rowDivider} />
            <Pressable
              style={[styles.actionRow, styles.disabledAction]}
              disabled={!PROFILE_SECURITY_CAPABILITIES.changePassword}
              accessibilityRole="button"
              accessibilityState={{
                disabled: !PROFILE_SECURITY_CAPABILITIES.changePassword,
              }}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <View style={styles.actionLeft}>
                <View style={styles.actionIcon}>
                  <Key size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionLabel}>{t('security.changePassword.title')}</Text>
                  <Text style={styles.actionDesc}>
                    {t('security.changePassword.unavailableDescription')}
                  </Text>
                </View>
              </View>
              <Text style={styles.unavailableLabel}>{t('security.unavailable')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('security.currentDeviceSection')}</Text>
          <View style={styles.card}>
            <View style={styles.deviceRow}>
              <View style={styles.deviceIcon}>
                <DeviceMobile size={22} color={theme.colors.primary} weight="fill" />
              </View>
              <View style={styles.deviceCopy}>
                <Text style={styles.deviceTitle}>
                  {t('security.deviceName', { platform: platformLabel })}
                </Text>
                <Text style={styles.deviceMeta}>{t('security.currentSession')}</Text>
              </View>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>{t('security.active')}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('security.signedInDevicesSection')}</Text>
          <View style={styles.card}>
            <View style={styles.emptyState}>
              <WarningCircle size={24} color={theme.colors.warning} weight="fill" />
              <Text style={styles.emptyTitle}>{t('security.sessionsUnavailableTitle')}</Text>
              <Text style={styles.emptyText}>
                {t('security.sessionsUnavailableDescription')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('security.recentLoginsSection')}</Text>
          <View style={styles.card}>
            <View style={styles.emptyState}>
              <ClockCounterClockwise size={24} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>{t('security.activityUnavailableTitle')}</Text>
              <Text style={styles.emptyText}>
                {t('security.activityUnavailableDescription')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  topBarRightPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  heroCard: {
    ...theme.components.elevatedCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
    marginRight: spacing.md,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  heroText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  infoLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginBottom: spacing.xxs,
  },
  infoValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  disabledAction: {
    opacity: 0.72,
  },
  actionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
    marginRight: spacing.md,
  },
  actionCopy: {
    flex: 1,
  },
  actionLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  actionDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: spacing.xxs,
  },
  unavailableLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginLeft: spacing.sm,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
    marginRight: spacing.md,
  },
  deviceCopy: {
    flex: 1,
  },
  deviceTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  deviceMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: spacing.xxs,
  },
  liveBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: theme.colors.primaryFaded,
  },
  liveBadgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
