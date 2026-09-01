import React, { memo } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ArrowsDownUp,
  MapPin,
  PencilSimple,
  X,
} from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

export interface RouteEditModalProps {
  visible: boolean;
  onClose: () => void;
  fromCity: string;
  toCity: string;
  onEditFrom: () => void;
  onEditTo: () => void;
  onSwap: () => void;
}

function RouteEditModalComponent({
  visible,
  onClose,
  fromCity,
  toCity,
  onEditFrom,
  onEditTo,
  onSwap,
}: RouteEditModalProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const handleEditFrom = () => {
    onClose();
    onEditFrom();
  };

  const handleEditTo = () => {
    onClose();
    onEditTo();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={e => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.sheetTitle}>
                {t('parcel.route.editRouteTitle', {
                  defaultValue: 'Tùy chỉnh tuyến gửi hàng',
                })}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {t('parcel.route.editRouteDescription', {
                  defaultValue: 'Chọn khu vực bạn muốn thay đổi hoặc đảo chiều gửi - nhận',
                })}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <X size={20} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          {/* Cards & Swap Section */}
          <View style={styles.cardsContainer}>
            {/* Origin Card */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('parcel.route.changeOrigin', { defaultValue: 'Đổi khu vực gửi' })}: ${fromCity}`}
              onPress={handleEditFrom}
              style={({ pressed }) => [
                styles.locationCard,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.locationIconBox}>
                <MapPin size={18} color={theme.colors.primary} weight="fill" />
              </View>
              <View style={styles.locationInfoCol}>
                <Text style={styles.locationLabel}>
                  {t('parcel.route.from', { defaultValue: 'TỪ' })} ({t('home.parcel.from', { defaultValue: 'Khu vực gửi' })})
                </Text>
                <Text style={styles.locationName} numberOfLines={1}>
                  {fromCity || t('home.parcel.selectOrigin')}
                </Text>
              </View>
              <View style={styles.editActionBadge}>
                <Text style={styles.editActionText}>
                  {t('common.save', { defaultValue: 'Đổi' })}
                </Text>
                <PencilSimple size={12} color={theme.colors.primary} weight="bold" />
              </View>
            </Pressable>

            {/* Swap Button Divider */}
            <View style={styles.swapDividerRow}>
              <View style={styles.dividerLine} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('parcel.route.swap', { defaultValue: 'Đổi chiều gửi / nhận' })}
                onPress={onSwap}
                style={({ pressed }) => [
                  styles.swapButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <ArrowsDownUp size={16} color={theme.colors.primary} weight="bold" />
                <Text style={styles.swapButtonText}>
                  {t('parcel.route.swap', { defaultValue: 'Đổi chiều gửi / nhận' })}
                </Text>
              </Pressable>
              <View style={styles.dividerLine} />
            </View>

            {/* Destination Card */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('parcel.route.changeDestination', { defaultValue: 'Đổi khu vực nhận' })}: ${toCity}`}
              onPress={handleEditTo}
              style={({ pressed }) => [
                styles.locationCard,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={[styles.locationIconBox, styles.destinationIconBox]}>
                <MapPin size={18} color={theme.colors.accent} weight="fill" />
              </View>
              <View style={styles.locationInfoCol}>
                <Text style={[styles.locationLabel, styles.destinationLabel]}>
                  {t('parcel.route.to', { defaultValue: 'ĐẾN' })} ({t('home.parcel.to', { defaultValue: 'Khu vực nhận' })})
                </Text>
                <Text style={styles.locationName} numberOfLines={1}>
                  {toCity || t('home.parcel.selectDestination')}
                </Text>
              </View>
              <View style={styles.editActionBadge}>
                <Text style={styles.editActionText}>
                  {t('common.save', { defaultValue: 'Đổi' })}
                </Text>
                <PencilSimple size={12} color={theme.colors.primary} weight="bold" />
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const RouteEditModal = memo(RouteEditModalComponent);

const createStyles = (theme: AppTheme) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  sheetTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  sheetSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: fontSizes.xs * 1.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  cardsContainer: {
    gap: spacing.sm,
  },
  locationCard: {
    ...theme.components.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    gap: spacing.sm,
  },
  locationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationIconBox: {
    backgroundColor: theme.colors.accentLight ?? theme.colors.surfaceAlt,
  },
  locationInfoCol: {
    flex: 1,
    gap: 2,
  },
  locationLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  destinationLabel: {
    color: theme.colors.accent,
  },
  locationName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  editActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.primaryFaded,
  },
  editActionText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 1,
    color: theme.colors.primary,
  },
  swapDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: spacing.sm,
  },
  swapButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 1,
    color: theme.colors.primary,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
