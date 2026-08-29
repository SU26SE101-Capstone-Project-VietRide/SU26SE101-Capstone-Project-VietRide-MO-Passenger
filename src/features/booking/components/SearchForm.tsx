/** SearchForm — From/To/Date/Passengers selectors + Search CTA
 *
 * Visual style: matches Parcel home selectors (surfaceAlt bg, rounded, mint accents)
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  ArrowsDownUp,
  CalendarBlank,
  MagnifyingGlass,
} from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { PassengerCountInput } from './PassengerCountInput';

interface SearchFormProps {
  from?: string;
  to?: string;
  date: string;
  passengers: number;
  onFromPress?: () => void;
  onToPress?: () => void;
  onDatePress?: () => void;
  onPassengersChange: (value: number) => void;
  onSwapPress?: () => void;
  onSearchPress?: () => void;
  searchDisabled?: boolean;
}

export const SearchForm = ({
  from,
  to,
  date,
  passengers,
  onFromPress,
  onToPress,
  onDatePress,
  onPassengersChange,
  onSwapPress,
  onSearchPress,
  searchDisabled = false,
}: SearchFormProps): React.JSX.Element => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('booking.searchForm.title')}</Text>

    {/* From */}
      <Text style={styles.fieldLabel}>{t('booking.searchForm.departureLabel')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('booking.searchForm.selectDeparture')}
        style={styles.selectorField}
        onPress={onFromPress}
      >
        <MapPin size={20} color={theme.colors.primary} weight="bold" />
        <Text style={from ? styles.selectorText : styles.selectorPlaceholder}>
          {from || t('booking.searchForm.locationPlaceholder')}
        </Text>
      </Pressable>

    {/* To + Swap */}
      <Text style={[styles.fieldLabel, styles.fieldLabelWithTopMargin]}>
        {t('booking.searchForm.destinationLabel')}
      </Text>
      <View style={styles.toRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('booking.searchForm.selectDestination')}
          style={[styles.selectorField, styles.selectorFieldGrow]}
          onPress={onToPress}
        >
          <MapPin size={18} color={theme.colors.primary} weight="bold" />
          <Text style={to ? styles.selectorText : styles.selectorPlaceholder} numberOfLines={1}>
            {to || t('booking.searchForm.locationPlaceholder')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('booking.searchForm.swapLocations')}
          onPress={onSwapPress}
          style={styles.swapBtn}
        >
          <ArrowsDownUp size={18} color={theme.colors.primary} weight="bold" />
        </Pressable>
      </View>

    {/* Date & Passengers */}
      <View style={styles.metaRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('booking.searchForm.selectDate')}
          style={styles.metaField}
          onPress={onDatePress}
        >
          <CalendarBlank size={16} color={theme.colors.primary} weight="fill" />
          <Text style={styles.metaText} numberOfLines={1}>
            {date || t('booking.searchForm.datePlaceholder')}
          </Text>
        </Pressable>
        <PassengerCountInput value={passengers} onChange={onPassengersChange} />
      </View>

    {/* Search CTA */}
      <Pressable
        onPress={onSearchPress}
        disabled={searchDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: searchDisabled }}
        style={({ pressed }) => [
          styles.searchButton,
          searchDisabled ? styles.searchButtonDisabled : null,
          pressed && !searchDisabled ? styles.pressed : null,
        ]}
      >
        <Text style={styles.searchButtonText}>{t('booking.searchForm.searchAction')}</Text>
        <MagnifyingGlass size={18} color={theme.colors.textInverse} weight="bold" />
      </Pressable>
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
  card: {
    ...theme.components.elevatedCard,
    borderRadius: 28,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: theme.colors.textPrimary,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xs,
    paddingLeft: 2,
  },
  fieldLabelWithTopMargin: {
    marginTop: spacing.md,
  },
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.components.field,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  selectorFieldGrow: {
    flex: 1,
  },
  selectorText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  selectorPlaceholder: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textTertiary,
  },
  toRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swapBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.effects.contentBorderStrong,
    backgroundColor: theme.effects.contentSurface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.effects.cardShadow,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  metaField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.components.field,
    borderRadius: 16,
    height: 44,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  metaText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.components.primaryButton,
    borderRadius: 16,
    height: 48,
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  searchButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
  searchButtonDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
