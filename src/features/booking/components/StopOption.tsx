import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Coins, MapPinLine, WarningCircle } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface StopOptionProps {
  id: string;
  name: string;
  address: string;
  time: string;
  status: 'current' | 'available' | 'disabled';
  refundAmount?: number;
  disabledReason?: string;
  isSelected: boolean;
  onPress: () => void;
  icon?: string;
}

export function StopOption({
  name,
  address,
  time,
  status,
  refundAmount,
  disabledReason,
  isSelected,
  onPress,
}: StopOptionProps): React.JSX.Element {
  const isDisabled = status === 'disabled';
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={() => !isDisabled && onPress()}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      style={({ pressed }) => [
        styles.pointCard,
        isSelected && styles.pointCardSelected,
        isDisabled && styles.pointCardDisabled,
        pressed && !isDisabled && styles.pointCardPressed,
      ]}
    >
      {/* Icon */}
      <View
        style={[
          styles.pointIcon,
          isSelected && styles.pointIconSelected,
          isDisabled && styles.pointIconDisabled,
        ]}
      >
        {isDisabled ? (
          <WarningCircle size={20} weight="duotone" color={theme.colors.textTertiary} />
        ) : (
          <MapPinLine size={20} weight={isSelected ? 'fill' : 'duotone'} color={isSelected ? theme.colors.textInverse : theme.colors.primary} />
        )}
      </View>

      {/* Info */}
      <View style={styles.pointInfo}>
        <Text
          style={[
            styles.pointName,
            isDisabled && styles.pointNameDisabled,
          ]}
        >
          {name}
        </Text>
        <Text style={styles.pointAddress}>{address}</Text>
        {time ? (
          <View style={styles.timePill}>
            <Text style={styles.pointTime}>{time}</Text>
          </View>
        ) : null}
        {refundAmount != null ? (
          <View style={styles.refundRow}>
            <Coins size={14} weight="bold" color={theme.colors.success} />
            <Text style={styles.refundText}>
              Refund: {refundAmount.toLocaleString('vi-VN')} VND
            </Text>
          </View>
        ) : null}
        {disabledReason ? (
          <Text style={styles.disabledReason}>
            {disabledReason}
          </Text>
        ) : null}
      </View>

      {/* Radio */}
      {!isDisabled && (
        <View
          style={[
            styles.radio,
            isSelected && styles.radioSelected,
          ]}
        >
          {isSelected ? <View style={styles.radioDot} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) => ({
  pointCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pointCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  pointCardDisabled: {
    opacity: 0.5,
  },
  pointCardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  pointIcon: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pointIconSelected: {
    backgroundColor: theme.colors.primary,
  },
  pointIconDisabled: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
  },
  pointInfo: {
    flex: 1,
    minWidth: 0,
  },
  pointName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    lineHeight: fontSizes.md * 1.35,
  },
  pointNameDisabled: {
    color: theme.colors.textTertiary,
  },
  pointAddress: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: fontSizes.sm * 1.45,
    marginTop: spacing.xs,
  },
  timePill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  pointTime: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  refundText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.success,
  },
  disabledReason: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    marginTop: 1,
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
});
