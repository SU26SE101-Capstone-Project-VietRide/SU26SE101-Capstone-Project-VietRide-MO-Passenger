import React, { useMemo } from 'react';
import {
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
  Key,
  CaretRight,
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

type ProfileNavProp = NativeStackNavigationProp<ProfileStackParamList>;

export function SecurityScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<ProfileNavProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const bottomTabClearance = useFloatingTabBarContentInset();
  const user = useAuthStore((state) => state.user);
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
              style={styles.actionRow}
              accessibilityRole="button"
              accessibilityLabel={t('security.changePassword.title')}
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <View style={styles.actionLeft}>
                <View style={styles.actionIcon}>
                  <Key size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionLabel}>{t('security.changePassword.title')}</Text>
                  <Text style={styles.actionDesc}>
                    {t('security.changePassword.description')}
                  </Text>
                </View>
              </View>
              <CaretRight size={18} color={theme.colors.textTertiary} weight="bold" />
            </Pressable>
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
    borderBottomColor: theme.effects.isLiquid ? theme.effects.contentBorder : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
  },
  backButton: {
    width: 44,
    height: 44,
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
    width: 44,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
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
    backgroundColor: theme.effects.isLiquid ? theme.effects.contentBorder : theme.colors.divider,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
});
