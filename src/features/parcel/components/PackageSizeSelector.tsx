import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  TShirt,
  DotsThreeCircle,
  Check,
} from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import {
  formatParcelDimensions,
  PARCEL_PACKAGE_SIZE_OPTIONS,
} from '../config/parcelPackage';
import type { ParcelSize } from '../types';

export interface PackageSizeSelectorProps {
  packageSize: ParcelSize;
  onSelect: (size: ParcelSize) => void;
}

const SIZE_ICONS: Record<ParcelSize, React.ElementType> = {
  small: FileText,
  medium: TShirt,
  large: DotsThreeCircle,
};

export const PackageSizeSelector = memo(function PackageSizeSelectorComponent({
  packageSize,
  onSelect,
}: PackageSizeSelectorProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return (
    <>
      <Text style={styles.formLabel}>{t('parcel.packageSize.title')}</Text>
      <View style={styles.sizeCardRow}>
        {PARCEL_PACKAGE_SIZE_OPTIONS.map(({ size, labelKey, dimensions }) => {
          const active = packageSize === size;
          const Icon = SIZE_ICONS[size];
          const label = t(labelKey);
          return (
            <Pressable
              key={size}
              style={({ pressed }) => [
                styles.sizeCard,
                active && styles.sizeCardActive,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => onSelect(size)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${label}, ${formatParcelDimensions(
                dimensions,
              )}`}
            >
              {active && (
                <View style={styles.checkedCircle}>
                  <Check
                    size={10}
                    color={theme.colors.textInverse}
                    weight="bold"
                  />
                </View>
              )}
              <Icon
                size={28}
                color={
                  active ? theme.colors.primary : theme.colors.textSecondary
                }
              />
              <Text
                style={[styles.sizeTitle, active && styles.sizeTitleActive]}
              >
                {label}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.sizeSub, active && styles.sizeSubActive]}
              >
                {formatParcelDimensions(dimensions)}
              </Text>
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
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
    position: 'relative',
    minWidth: 0,
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
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  sizeSubActive: {
    color: theme.colors.primary,
  },
});
