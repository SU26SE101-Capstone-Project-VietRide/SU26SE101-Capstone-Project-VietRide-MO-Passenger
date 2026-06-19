import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { FileText, TShirt, DotsThreeCircle, Check } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

export type PackageSize = 'small' | 'medium' | 'large';

export interface PackageSizeSelectorProps {
  packageSize: PackageSize;
  onSelect: (size: PackageSize) => void;
}

const SIZE_OPTIONS: { key: PackageSize; label: string; sub: string; Icon: React.ElementType }[] = [
  { key: 'small', label: 'Small', sub: '25x25 cm', Icon: FileText },
  { key: 'medium', label: 'Medium', sub: '45x45 cm', Icon: TShirt },
  { key: 'large', label: 'Large', sub: '55x55 cm', Icon: DotsThreeCircle },
];

export const PackageSizeSelector = memo(function PackageSizeSelector({
  packageSize,
  onSelect,
}: PackageSizeSelectorProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <>
      <Text style={styles.formLabel}>Package Size</Text>
      <View style={styles.sizeCardRow}>
        {SIZE_OPTIONS.map(({ key, label, sub, Icon }) => {
          const active = packageSize === key;
          return (
            <Pressable
              key={key}
              style={({ pressed }) => [
                styles.sizeCard,
                active && styles.sizeCardActive,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => onSelect(key)}
            >
              {active && (
                <View style={styles.checkedCircle}>
                  <Check size={10} color={theme.colors.textInverse} weight="bold" />
                </View>
              )}
              <Icon size={28} color={active ? theme.colors.primary : theme.colors.textSecondary} />
              <Text style={[styles.sizeTitle, active && styles.sizeTitleActive]}>{label}</Text>
              <Text style={[styles.sizeSub, active && styles.sizeSubActive]}>{sub}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
});

const createStyles = (theme: AppTheme) => ({
  formLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
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
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    position: 'relative',
  },
  sizeCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  checkedCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    marginTop: spacing.xs,
  },
  sizeTitleActive: {
    color: theme.colors.primary,
  },
  sizeSub: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  sizeSubActive: {
    color: theme.colors.primary,
  },
});
