/**
 * DropOffSheet — Bottom sheet for editing drop-off point
 *
 * Shows a modal with drag handle, warning message, scrollable list
 * of drop-off points (current, available, disabled), and a confirm CTA.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { DropOffPoint } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DropOffSheetProps {
  visible: boolean;
  onClose: () => void;
  points: DropOffPoint[];
  currentPointId: string;
  onConfirm: (point: DropOffPoint) => void;
}

export function DropOffSheet({
  visible,
  onClose,
  points,
  currentPointId,
  onConfirm,
}: DropOffSheetProps): React.JSX.Element {
  const [selectedId, setSelectedId] = useState(currentPointId);

  const handleConfirm = () => {
    const point = points.find((p) => p.id === selectedId);
    if (point) onConfirm(point);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* Drag Handle */}
          <View style={styles.dragHandleRow}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Drop-off Point</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Warning */}
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Only downgrade allowed. Price difference will be refunded to
              VietRide Wallet immediately.
            </Text>
          </View>

          {/* Section Label */}
          <Text style={styles.sectionLabel}>SELECT NEW POINT</Text>

          {/* Points List */}
          <ScrollView
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            {points.map((point) => {
              const isCurrent = point.id === currentPointId;
              const isSelected = point.id === selectedId;
              const isDisabled = point.status === 'disabled';

              return (
                <TouchableOpacity
                  key={point.id}
                  activeOpacity={isDisabled ? 1 : 0.7}
                  onPress={() => !isDisabled && setSelectedId(point.id)}
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
                      {isDisabled ? '🚫' : '📍'}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={styles.pointInfo}>
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>CURRENT</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.pointName,
                        isDisabled && styles.pointNameDisabled,
                      ]}
                    >
                      {point.name}
                    </Text>
                    <Text style={styles.pointAddress}>{point.address}</Text>
                    {point.time ? (
                      <Text style={styles.pointTime}>{point.time}</Text>
                    ) : null}
                    {point.refundAmount ? (
                      <View style={styles.refundRow}>
                        <Text style={styles.refundIcon}>💰</Text>
                        <Text style={styles.refundText}>
                          Refund: {point.refundAmount.toLocaleString('vi-VN')} VND
                        </Text>
                      </View>
                    ) : null}
                    {point.disabledReason ? (
                      <Text style={styles.disabledReason}>
                        {point.disabledReason}
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
            })}
          </ScrollView>

          {/* Confirm CTA */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleConfirm}
            style={styles.confirmButton}
          >
            <Text style={styles.confirmText}>Confirm Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 30, 66, 0.54)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: spacing.xxxl,
  },
  dragHandleRow: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  dragHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  warningIcon: {
    fontSize: 18,
    marginRight: spacing.md,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    lineHeight: fontSizes.sm * 1.6,
  },
  sectionLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    letterSpacing: 1,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  listContainer: {
    maxHeight: SCREEN_HEIGHT * 0.4,
    paddingHorizontal: spacing.xl,
  },
  pointCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.xxl,
    marginBottom: spacing.md,
  },
  pointCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(10, 126, 164, 0.04)',
  },
  pointCardDisabled: {
    opacity: 0.5,
  },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(10, 126, 164, 0.08)',
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
  currentBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  currentBadgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: colors.textInverse,
    letterSpacing: 0.5,
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
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  confirmText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textInverse,
  },
});
