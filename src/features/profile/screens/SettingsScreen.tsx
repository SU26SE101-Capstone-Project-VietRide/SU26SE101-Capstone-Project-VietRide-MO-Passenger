import React, { useState, useCallback } from 'react';
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

export function SettingsScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const setLocaleStore = useAppStore((state) => state.setLocale);
  const localeStore = useAppStore((state) => state.locale);

  // States for toggles
  const [tripNotif, setTripNotif] = useState(true);
  const [parcelNotif, setParcelNotif] = useState(true);
  const [promoNotif, setPromoNotif] = useState(false);

  // Current active language code
  const currentLanguage = i18n.language || localeStore;

  const handleLanguageChange = useCallback((lang: 'en' | 'vi') => {
    i18n.changeLanguage(lang);
    setLocaleStore(lang);
  }, [i18n, setLocaleStore]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Navigation Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t('profile.settings', 'Settings')}</Text>
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
            <Text style={styles.sectionTitle}>{t('profile.language', 'Language')}</Text>
          </View>

          <View style={styles.card}>
            <Pressable
              style={[
                styles.languageRow,
                currentLanguage.startsWith('vi') ? styles.activeLanguageRow : null,
              ]}
              onPress={() => handleLanguageChange('vi')}
            >
              <View style={styles.languageTextContainer}>
                <Text style={styles.languageLabel}>Tiếng Việt</Text>
                <Text style={styles.languageSubLabel}>Vietnamese</Text>
              </View>
              {currentLanguage.startsWith('vi') ? (
                <View style={styles.radioCheck} />
              ) : null}
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              style={[
                styles.languageRow,
                currentLanguage.startsWith('en') ? styles.activeLanguageRow : null,
              ]}
              onPress={() => handleLanguageChange('en')}
            >
              <View style={styles.languageTextContainer}>
                <Text style={styles.languageLabel}>English</Text>
                <Text style={styles.languageSubLabel}>Tiếng Anh</Text>
              </View>
              {currentLanguage.startsWith('en') ? (
                <View style={styles.radioCheck} />
              ) : null}
            </Pressable>
          </View>
        </View>

        {/* Section: Appearance */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Palette size={18} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Appearance</Text>
          </View>

          <View style={styles.card}>
            <Pressable
              style={styles.settingRow}
              onPress={() => navigation.navigate('ThemeSettings')}
            >
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Theme & Visuals</Text>
                <Text style={styles.settingDesc}>Choose Light or Dark Liquid Glass mode</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Section: Security */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <LockKey size={18} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Security</Text>
          </View>

          <View style={styles.card}>
            <Pressable
              style={styles.settingRow}
              onPress={() => navigation.navigate('SecuritySettings')}
            >
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Account Security</Text>
                <Text style={styles.settingDesc}>
                  Change password, check signed-in devices and recent logins
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
            <Text style={styles.sectionTitle}>{t('profile.notifications', 'Notifications')}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {t('profile.tripUpdates', 'Trip Updates')}
                </Text>
                <Text style={styles.settingDesc}>
                  {t('profile.tripUpdatesDesc', 'Alerts on departures, delays, and arrivals')}
                </Text>
              </View>
              <Switch
                value={tripNotif}
                onValueChange={setTripNotif}
                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                thumbColor={tripNotif ? theme.colors.primary : theme.colors.divider}
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {t('profile.parcelAlerts', 'Parcel Alerts')}
                </Text>
                <Text style={styles.settingDesc}>
                  {t('profile.parcelAlertsDesc', 'Status changes of shipped and received packages')}
                </Text>
              </View>
              <Switch
                value={parcelNotif}
                onValueChange={setParcelNotif}
                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                thumbColor={parcelNotif ? theme.colors.primary : theme.colors.divider}
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {t('profile.specialOffers', 'Promotions & Offers')}
                </Text>
                <Text style={styles.settingDesc}>
                  {t('profile.specialOffersDesc', 'Receive vouchers, loyalty points and campaign alerts')}
                </Text>
              </View>
              <Switch
                value={promoNotif}
                onValueChange={setPromoNotif}
                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                thumbColor={promoNotif ? theme.colors.primary : theme.colors.divider}
              />
            </View>
          </View>
        </View>

        {/* Section 3: Privacy & About */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <ShieldCheck size={18} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>{t('profile.privacyAbout', 'About & Legal')}</Text>
          </View>

          <View style={styles.card}>
            <Pressable style={styles.legalRow}>
              <View style={styles.legalTextContainer}>
                <Text style={styles.settingLabel}>{t('profile.terms', 'Terms of Service')}</Text>
              </View>
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable style={styles.legalRow}>
              <View style={styles.legalTextContainer}>
                <Text style={styles.settingLabel}>{t('profile.privacyPolicy', 'Privacy Policy')}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Support Note */}
        <View style={styles.supportNote}>
          <Info size={16} color={theme.colors.textTertiary} style={styles.supportNoteIcon} />
          <Text style={styles.supportNoteText}>
            VietRide uses end-to-end encryption for security. All data stays local to your phone.
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
    backgroundColor: 'transparent',
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
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
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
});
