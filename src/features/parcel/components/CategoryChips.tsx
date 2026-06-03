import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FileText, TShirt, DeviceMobile, BowlFood, DotsThreeCircle } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';

export interface CategoryChipsProps {
  value: string;
  onChange: (category: string) => void;
}

const CATEGORIES: { key: string; label: string; Icon: React.ElementType }[] = [
  { key: 'Documents', label: 'Documents', Icon: FileText },
  { key: 'Clothing', label: 'Clothing', Icon: TShirt },
  { key: 'Electronics', label: 'Electronics', Icon: DeviceMobile },
  { key: 'Food', label: 'Food', Icon: BowlFood },
  { key: 'Others', label: 'Others', Icon: DotsThreeCircle },
];

export const CategoryChips = memo(function CategoryChips({
  value,
  onChange,
}: CategoryChipsProps): React.JSX.Element {
  return (
    <View style={styles.chipRow}>
      {CATEGORIES.map(({ key, label, Icon }) => {
        const active = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(key)}
            activeOpacity={0.7}
          >
            <Icon size={16} color={active ? colors.textInverse : colors.textSecondary} />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontFamily: fontFamilies.semiBold,
  },
});
