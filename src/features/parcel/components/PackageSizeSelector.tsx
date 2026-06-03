import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FileText, TShirt, DotsThreeCircle, Check } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';

export type PackageSize = 'small' | 'medium' | 'large';

export interface PackageSizeSelectorProps {
  packageSize: PackageSize;
  onSelect: (size: PackageSize) => void;
}

const SIZE_OPTIONS: { key: PackageSize; label: string; sub: string; Icon: React.ElementType }[] = [
  { key: 'small', label: 'Small', sub: 'Docs / Envelopes', Icon: FileText },
  { key: 'medium', label: 'Medium', sub: 'Box / Clothes', Icon: TShirt },
  { key: 'large', label: 'Large', sub: 'Luggage / Heavy', Icon: DotsThreeCircle },
];

export const PackageSizeSelector = memo(function PackageSizeSelector({
  packageSize,
  onSelect,
}: PackageSizeSelectorProps): React.JSX.Element {
  return (
    <>
      <Text style={styles.formLabel}>Package Size</Text>
      <View style={styles.sizeCardRow}>
        {SIZE_OPTIONS.map(({ key, label, sub, Icon }) => {
          const active = packageSize === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.sizeCard, active && styles.sizeCardActive]}
              onPress={() => onSelect(key)}
              activeOpacity={0.8}
            >
              <View style={styles.checkedCircle}>
                {active && <Check size={10} color={colors.textInverse} weight="bold" />}
              </View>
              <Icon size={28} color={active ? colors.primary : colors.textSecondary} />
              <Text style={[styles.sizeTitle, active && styles.sizeTitleActive]}>{label}</Text>
              <Text style={[styles.sizeSub, active && styles.sizeSubActive]}>{sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  formLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sizeCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sizeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.divider,
    position: 'relative',
  },
  sizeCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#E6F7F6',
  },
  checkedCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  sizeTitleActive: {
    color: colors.primary,
  },
  sizeSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
  },
  sizeSubActive: {
    color: colors.primary,
  },
});
