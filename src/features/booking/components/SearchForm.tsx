/** SearchForm — From/To/Date/Passengers selectors + Search CTA
 *
 * Visual style: matches Parcel home selectors (surfaceAlt bg, rounded, mint accents)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  MapPin,
  ArrowsDownUp,
  CalendarBlank,
  User,
  MagnifyingGlass,
} from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

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
}: SearchFormProps): React.JSX.Element => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Book a Trip</Text>

    {/* From */}
    <Text style={styles.fieldLabel}>From</Text>
    <TouchableOpacity style={styles.selectorField} onPress={onFromPress} activeOpacity={0.8}>
      <MapPin size={20} color={colors.primary} weight="bold" />
      <Text style={from ? styles.selectorText : styles.selectorPlaceholder}>
        {from || 'Select origin city'}
      </Text>
    </TouchableOpacity>

    {/* To + Swap */}
    <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>To</Text>
    <View style={styles.toRow}>
      <TouchableOpacity style={[styles.selectorField, { flex: 1 }]} onPress={onToPress} activeOpacity={0.8}>
        <MapPin size={18} color={colors.primary} weight="bold" />
        <Text style={to ? styles.selectorText : styles.selectorPlaceholder} numberOfLines={1}>
          {to || 'Select destination'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSwapPress} style={styles.swapBtn} activeOpacity={0.7}>
        <ArrowsDownUp size={18} color={colors.primary} weight="bold" />
      </TouchableOpacity>
    </View>

    {/* Date & Passengers */}
    <View style={styles.metaRow}>
      <TouchableOpacity style={styles.metaField} onPress={onDatePress} activeOpacity={0.8}>
        <CalendarBlank size={16} color={colors.primary} weight="fill" />
        <Text style={styles.metaText} numberOfLines={1}>{date || 'Select date'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.metaField} onPress={onPassengersPress} activeOpacity={0.8}>
        <User size={16} color={colors.primary} weight="fill" />
        <Text style={styles.metaText} numberOfLines={1}>
          {typeof passengers === 'number' ? `${passengers} Passenger${passengers > 1 ? 's' : ''}` : '1 Passenger'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Search CTA */}
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onSearchPress}
      style={styles.searchButton}
    >
      <Text style={styles.searchButtonText}>Search Buses</Text>
      <MagnifyingGlass size={18} color={colors.textInverse} weight="bold" />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.xl,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.xxl,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    paddingLeft: 2,
  },
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.2,
    borderColor: colors.divider,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  selectorText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  selectorPlaceholder: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
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
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
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
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.2,
    borderColor: colors.divider,
    borderRadius: 16,
    height: 44,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  metaText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 48,
    marginTop: spacing.xl,
    gap: spacing.xs,
    ...shadows.sm,
  },
  searchButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
});
