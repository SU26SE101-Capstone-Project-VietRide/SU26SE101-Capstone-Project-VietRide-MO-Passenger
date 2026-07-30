import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText, TShirt, DeviceMobile, BowlFood, DotsThreeCircle } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

export interface CategoryChipsProps {
  value: string;
  onChange: (category: string) => void;
}

const CATEGORIES: { key: string; labelKey: string; Icon: React.ElementType }[] = [
  { key: 'Documents', labelKey: 'parcel.categories.documents', Icon: FileText },
  { key: 'Clothing', labelKey: 'parcel.categories.clothing', Icon: TShirt },
  { key: 'Electronics', labelKey: 'parcel.categories.electronics', Icon: DeviceMobile },
  { key: 'Food', labelKey: 'parcel.categories.food', Icon: BowlFood },
  { key: 'Others', labelKey: 'parcel.categories.others', Icon: DotsThreeCircle },
];

export const CategoryChips = memo(function CategoryChipsComponent({
  value,
  onChange,
}: CategoryChipsProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.chipRow}>
      {CATEGORIES.map(({ key, labelKey, Icon }) => {
        const active = value === key;
        const label = t(labelKey);
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={label}
            style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed ? styles.pressed : null]}
            onPress={() => onChange(key)}
          >
            <Icon size={16} color={active ? theme.colors.textInverse : theme.colors.textSecondary} />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
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
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  chipText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.textInverse,
    fontFamily: fontFamilies.semiBold,
  },
});
