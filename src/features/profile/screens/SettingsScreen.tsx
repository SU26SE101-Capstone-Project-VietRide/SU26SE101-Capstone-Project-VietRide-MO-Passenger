import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bell, Translate, ShieldCheck, Info } from 'phosphor-react-native';

import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useAppStore } from '@shared/store/useAppStore';

export function SettingsScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Navigation Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('profile.settings', 'Settings')}</Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section 1: Language Settings */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Translate size={18} color={colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>{t('profile.language', 'Language')}</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={[
                styles.languageRow,
                currentLanguage.startsWith('vi') && styles.activeLanguageRow,
              ]}
              onPress={() => handleLanguageChange('vi')}
              activeOpacity={0.7}
            >
              <View style={styles.languageTextContainer}>
                <Text style={styles.languageLabel}>Tiếng Việt</Text>
                <Text style={styles.languageSubLabel}>Vietnamese</Text>
              </View>
              {currentLanguage.startsWith('vi') && (
                <View style={styles.radioCheck} />
              )}
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={[
                styles.languageRow,
                currentLanguage.startsWith('en') && styles.activeLanguageRow,
              ]}
              onPress={() => handleLanguageChange('en')}
              activeOpacity={0.7}
            >
              <View style={styles.languageTextContainer}>
                <Text style={styles.languageLabel}>English</Text>
                <Text style={styles.languageSubLabel}>Tiếng Anh</Text>
              </View>
              {currentLanguage.startsWith('en') && (
                <View style={styles.radioCheck} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Push Notifications */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Bell size={18} color={colors.primary} style={styles.sectionIcon} />
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
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={tripNotif ? colors.primary : colors.divider}
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
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={parcelNotif ? colors.primary : colors.divider}
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
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={promoNotif ? colors.primary : colors.divider}
              />
            </View>
          </View>
        </View>

        {/* Section 3: Privacy & About */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <ShieldCheck size={18} color={colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>{t('profile.privacyAbout', 'About & Legal')}</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={styles.legalRow} activeOpacity={0.6}>
              <View style={styles.legalTextContainer}>
                <Text style={styles.settingLabel}>{t('profile.terms', 'Terms of Service')}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity style={styles.legalRow} activeOpacity={0.6}>
              <View style={styles.legalTextContainer}>
                <Text style={styles.settingLabel}>{t('profile.privacyPolicy', 'Privacy Policy')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Note */}
        <View style={styles.supportNote}>
          <Info size={16} color={colors.textTertiary} style={styles.supportNoteIcon} />
          <Text style={styles.supportNoteText}>
            VietRide uses end-to-end encryption for security. All data stays local to your phone.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
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
    color: colors.textPrimary,
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
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  activeLanguageRow: {
    backgroundColor: colors.primaryFaded,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  languageSubLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  radioCheck: {
    width: 14,
    height: 14,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.divider,
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
    color: colors.textPrimary,
  },
  settingDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
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
    color: colors.textTertiary,
    flex: 1,
    lineHeight: 15,
  },
});
