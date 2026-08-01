import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Switch,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Bell,
  CaretRight,
  Info,
  LockKey,
  Palette,
  ShieldCheck,
  Translate,
} from 'phosphor-react-native';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useAppStore } from '@shared/store/useAppStore';
import type { ProfileStackParamList } from '@app/navigation/types';

type SettingsNavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'Settings'
>;

export function SettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<SettingsNavigationProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const setLocaleStore = useAppStore((state) => state.setLocale);
  const localeStore = useAppStore((state) => state.locale);

  // States for toggles
  const [tripNotif, setTripNotif] = useState(true);
  const [parcelNotif, setParcelNotif] = useState(true);
  const [promoNotif, setPromoNotif] = useState(false);

  const handleLanguageChange = useCallback((lang: 'en' | 'vi') => {
    setLocaleStore(lang);
  }, [setLocaleStore]);
  const handleVietnameseLanguage = useCallback(
    () => handleLanguageChange('vi'),
    [handleLanguageChange],
  );
  const handleEnglishLanguage = useCallback(
    () => handleLanguageChange('en'),
    [handleLanguageChange],
  );
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleThemeSettings = useCallback(
    () => navigation.navigate('ThemeSettings'),
    [navigation],
  );
  const handleSecuritySettings = useCallback(
    () => navigation.navigate('SecuritySettings'),
    [navigation],
  );
  const switchTrackColors = useMemo(
    () => ({
      false: theme.colors.border,
      true: theme.colors.primaryLight,
    }),
    [theme.colors.border, theme.colors.primaryLight],
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Navigation Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t('settings.title')}</Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      >
        {/* Section 1: Language Settings */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Translate size={18} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>{t('settings.language.title')}</Text>
          </View>

          <View style={styles.card}>
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={t('settings.language.vietnamese')}
              accessibilityState={{ checked: localeStore === 'vi' }}
              style={[
                styles.languageRow,
                localeStore === 'vi' ? styles.activeLanguageRow : null,
              ]}
              onPress={handleVietnameseLanguage}
            >
              <View style={styles.languageTextContainer}>
                <Text style={styles.languageLabel}>{t('settings.language.vietnamese')}</Text>
                <Text style={styles.languageSubLabel}>
                  {t('settings.language.vietnameseDescription')}
                </Text>
              </View>
              {localeStore === 'vi' ? (
                <View style={styles.radioCheck} />
              ) : null}
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={t('settings.language.english')}
              accessibilityState={{ checked: localeStore === 'en' }}
              style={[
                styles.languageRow,
                localeStore === 'en' ? styles.activeLanguageRow : null,
              ]}
              onPress={handleEnglishLanguage}
            >
              <View style={styles.languageTextContainer}>
                <Text style={styles.languageLabel}>{t('settings.language.english')}</Text>
                <Text style={styles.languageSubLabel}>
                  {t('settings.language.englishDescription')}
                </Text>
              </View>
              {localeStore === 'en' ? (
                <View style={styles.radioCheck} />
              ) : null}
            </Pressable>
          </View>
        </View>

        {/* Section: Appearance */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Palette size={18} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>{t('settings.appearance.title')}</Text>
          </View>

          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settings.appearance.themeTitle')}
              style={({ pressed }) => [styles.settingRow, pressed ? styles.pressed : null]}
              onPress={handleThemeSettings}
            >
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings.appearance.themeTitle')}</Text>
                <Text style={styles.settingDesc}>
                  {t('settings.appearance.themeDescription')}
                </Text>
              </View>
              <CaretRight size={16} color={theme.colors.textTertiary} weight="bold" />
            </Pressable>
          </View>
        </View>

        {/* Section: Security */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <LockKey size={18} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>{t('settings.security.title')}</Text>
          </View>

          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settings.security.accountTitle')}
              style={({ pressed }) => [styles.settingRow, pressed ? styles.pressed : null]}
              onPress={handleSecuritySettings}
            >
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings.security.accountTitle')}</Text>
                <Text style={styles.settingDesc}>
                  {t('settings.security.accountDescription')}
                </Text>
              </View>
              <CaretRight size={16} color={theme.colors.textTertiary} weight="bold" />
            </Pressable>
          </View>
        </View>

        {/* Section 2: Push Notifications */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Bell size={18} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>{t('settings.notifications.title')}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {t('settings.notifications.tripUpdates')}
                </Text>
                <Text style={styles.settingDesc}>
                  {t('settings.notifications.tripUpdatesDescription')}
                </Text>
              </View>
              <Switch
                accessibilityLabel={t('settings.notifications.tripUpdates')}
                value={tripNotif}
                onValueChange={setTripNotif}
                trackColor={switchTrackColors}
                thumbColor={tripNotif ? theme.colors.primary : theme.colors.divider}
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {t('settings.notifications.parcelAlerts')}
                </Text>
                <Text style={styles.settingDesc}>
                  {t('settings.notifications.parcelAlertsDescription')}
                </Text>
              </View>
              <Switch
                accessibilityLabel={t('settings.notifications.parcelAlerts')}
                value={parcelNotif}
                onValueChange={setParcelNotif}
                trackColor={switchTrackColors}
                thumbColor={parcelNotif ? theme.colors.primary : theme.colors.divider}
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {t('settings.notifications.promotions')}
                </Text>
                <Text style={styles.settingDesc}>
                  {t('settings.notifications.promotionsDescription')}
                </Text>
              </View>
              <Switch
                accessibilityLabel={t('settings.notifications.promotions')}
                value={promoNotif}
                onValueChange={setPromoNotif}
                trackColor={switchTrackColors}
                thumbColor={promoNotif ? theme.colors.primary : theme.colors.divider}
              />
            </View>
          </View>
        </View>

        {/* Section 3: Privacy & About */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <ShieldCheck size={18} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>{t('settings.legal.title')}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.legalRow}>
              <View style={styles.legalTextContainer}>
                <Text style={styles.settingLabel}>{t('settings.legal.terms')}</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.legalRow}>
              <View style={styles.legalTextContainer}>
                <Text style={styles.settingLabel}>{t('settings.legal.privacy')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Support Note */}
        <View style={styles.supportNote}>
          <Info size={16} color={theme.colors.textTertiary} style={styles.supportNoteIcon} />
          <Text style={styles.supportNoteText}>
            {t('settings.securityNote')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: spacing.xxl,
  },
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIcon: {
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    borderRadius: borderRadius.lg,
    ...theme.effects.cardShadow,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    overflow: 'hidden',
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.colors.transparent,
  },
  activeLanguageRow: {
    backgroundColor: theme.colors.primaryFaded,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  languageSubLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  radioCheck: {
    width: 14,
    height: 14,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: spacing.lg,
  },
  settingLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  settingDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  legalTextContainer: {
    flex: 1,
  },
  supportNote: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  supportNoteIcon: {
    marginRight: spacing.sm,
  },
  supportNoteText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    flex: 1,
    lineHeight: 15,
  },
  pressed: {
    opacity: 0.82,
  },
} as const);
