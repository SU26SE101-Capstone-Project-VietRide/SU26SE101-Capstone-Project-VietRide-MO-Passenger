import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';

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
  icon = '📍',
}: StopOptionProps): React.JSX.Element {
  const isDisabled = status === 'disabled';

  return (
    <TouchableOpacity
      activeOpacity={isDisabled ? 1 : 0.7}
      onPress={() => !isDisabled && onPress()}
      style={[
        styles.pointCard,
        isSelected && styles.pointCardSelected,
        isDisabled && styles.pointCardDisabled,
      ]}
    >
      {/* Icon */}
      <View
        style={[
          styles.pointIcon,
          isDisabled && styles.pointIconDisabled,
        ]}
      >
        <Text style={styles.pointIconText}>
          {isDisabled ? '🚫' : icon}
        </Text>
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
          <Text style={styles.pointTime}>{time}</Text>
        ) : null}
        {refundAmount ? (
          <View style={styles.refundRow}>
            <Text style={styles.refundIcon}>💰</Text>
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
          {isSelected && <View style={styles.radioDot} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pointCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pointCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  pointCardDisabled: {
    opacity: 0.5,
  },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  pointIconDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  pointIconText: {
    fontSize: 16,
  },
  pointInfo: {
    flex: 1,
  },
  pointName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  pointNameDisabled: {
    color: colors.textTertiary,
  },
  pointAddress: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: fontSizes.sm * 1.6,
    marginBottom: spacing.xs,
  },
  pointTime: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  refundIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  refundText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.success,
  },
  disabledReason: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});
