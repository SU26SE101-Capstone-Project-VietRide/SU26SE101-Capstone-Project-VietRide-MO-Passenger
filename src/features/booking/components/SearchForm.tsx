/** SearchForm — From/To/Date/Passengers selectors + Search CTA
 *
 * Visual style: matches Parcel home selectors (surfaceAlt bg, rounded, mint accents)
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  MapPin,
  ArrowsDownUp,
  CalendarBlank,
  User,
  MagnifyingGlass,
} from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface SearchFormProps {
  from?: string;
  to?: string;
  date: string;
  passengers: number | string;
  onFromPress?: () => void;
  onToPress?: () => void;
  onDatePress?: () => void;
  onPassengersPress?: () => void;
  onSwapPress?: () => void;
  onSearchPress?: () => void;
}

export const SearchForm = ({
  from,
  to,
  date,
  passengers,
  onFromPress,
  onToPress,
  onDatePress,
  onPassengersPress,
  onSwapPress,
  onSearchPress,
}: SearchFormProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Book a Trip</Text>

    {/* From */}
      <Text style={styles.fieldLabel}>From</Text>
      <Pressable style={styles.selectorField} onPress={onFromPress}>
        <MapPin size={20} color={theme.colors.primary} weight="bold" />
        <Text style={from ? styles.selectorText : styles.selectorPlaceholder}>
          {from || 'Select origin city'}
        </Text>
      </Pressable>

    {/* To + Swap */}
      <Text style={[styles.fieldLabel, styles.fieldLabelWithTopMargin]}>To</Text>
      <View style={styles.toRow}>
        <Pressable style={[styles.selectorField, styles.selectorFieldGrow]} onPress={onToPress}>
          <MapPin size={18} color={theme.colors.primary} weight="bold" />
          <Text style={to ? styles.selectorText : styles.selectorPlaceholder} numberOfLines={1}>
            {to || 'Select destination'}
          </Text>
        </Pressable>
        <Pressable onPress={onSwapPress} style={styles.swapBtn}>
          <ArrowsDownUp size={18} color={theme.colors.primary} weight="bold" />
        </Pressable>
      </View>

    {/* Date & Passengers */}
      <View style={styles.metaRow}>
        <Pressable style={styles.metaField} onPress={onDatePress}>
          <CalendarBlank size={16} color={theme.colors.primary} weight="fill" />
          <Text style={styles.metaText} numberOfLines={1}>{date || 'Select date'}</Text>
        </Pressable>
        <Pressable style={styles.metaField} onPress={onPassengersPress}>
          <User size={16} color={theme.colors.primary} weight="fill" />
          <Text style={styles.metaText} numberOfLines={1}>
            {typeof passengers === 'number' ? `${passengers} Passenger${passengers > 1 ? 's' : ''}` : '1 Passenger'}
          </Text>
        </Pressable>
      </View>

    {/* Search CTA */}
      <Pressable
        onPress={onSearchPress}
        style={({ pressed }) => [styles.searchButton, pressed ? styles.pressed : null]}
      >
        <Text style={styles.searchButtonText}>Search Buses</Text>
        <MagnifyingGlass size={18} color={theme.colors.textInverse} weight="bold" />
      </Pressable>
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
  card: {
    ...theme.components.elevatedCard,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.divider,
    borderRadius: 28,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
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
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surfaceElevated,
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
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
