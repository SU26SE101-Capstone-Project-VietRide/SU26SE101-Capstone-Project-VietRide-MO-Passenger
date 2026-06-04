import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  MapPin,
  ArrowsDownUp,
  CalendarBlank,
  User,
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
  <View style={styles.searchCard}>
    <Text style={styles.searchTitle}>Find Your Bus</Text>

    {/* From Input */}
    <View style={styles.inputRow}>
      <View style={styles.inputIcon}>
        <MapPin size={16} weight="fill" color={colors.primary} />
      </View>
      <TouchableOpacity style={styles.inputField} onPress={onFromPress}>
        <Text style={from ? styles.inputValue : styles.inputPlaceholder}>
          {from || 'From (e.g. Hanoi)'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Swap Button */}
    <View style={styles.swapRow}>
      <View style={styles.swapLine} />
      <TouchableOpacity onPress={onSwapPress} style={styles.swapButton}>
        <ArrowsDownUp size={18} weight="bold" color={colors.primary} />
      </TouchableOpacity>
      <View style={styles.swapLine} />
    </View>

    {/* To Input */}
    <View style={styles.inputRow}>
      <View style={styles.inputIcon}>
        <MapPin size={16} weight="fill" color={colors.primary} />
      </View>
      <TouchableOpacity style={styles.inputField} onPress={onToPress}>
        <Text style={to ? styles.inputValue : styles.inputPlaceholder}>
          {to || 'To (e.g. Sapa)'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Date & Passengers row */}
    <View style={styles.datePassRow}>
      <TouchableOpacity style={styles.halfInput} onPress={onDatePress}>
        <View style={styles.halfInputIconWrapper}>
          <CalendarBlank size={14} weight="fill" color={colors.primary} />
        </View>
        <Text style={styles.halfInputText}>{date}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.halfInput} onPress={onPassengersPress}>
        <View style={styles.halfInputIconWrapper}>
          <User size={14} weight="fill" color={colors.primary} />
        </View>
        <Text style={styles.halfInputText}>{passengers} Pass</Text>
      </TouchableOpacity>
    </View>

    {/* Search CTA */}
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onSearchPress}
      style={styles.searchButton}
    >
      <Text style={styles.searchButtonText}>Search Buses</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  searchCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.xl,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.xxl,
  },
  searchTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.2,
    borderColor: colors.divider,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputIcon: {
    width: 24,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputField: {
    flex: 1,
    justifyContent: 'center',
  },
  inputPlaceholder: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
  },
  inputValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  swapLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
    ...shadows.sm,
  },
  datePassRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  halfInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.2,
    borderColor: colors.divider,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  halfInputIconWrapper: {
    marginRight: spacing.sm,
    width: 18,
    alignItems: 'center',
  },
  halfInputText: {
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
    gap: spacing.xs,
    ...shadows.sm,
    marginTop: spacing.xl,
  },
  searchButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
});
