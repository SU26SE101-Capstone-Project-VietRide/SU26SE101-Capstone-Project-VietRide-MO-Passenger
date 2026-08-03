import React, { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapPinLine, PencilSimple, Van } from 'phosphor-react-native';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import type { ShuttlePickupDraft } from '../types';
import { SectionCard } from './SectionCard';

export type ShuttleServiceStatus =
  | 'loading'
  | 'available'
  | 'unavailable'
  | 'error';

interface ShuttleServiceCardProps {
  status: ShuttleServiceStatus;
  value: ShuttlePickupDraft | null;
  stationName?: string;
  unavailableReason?: string;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onRetry?: () => void;
}

export const ShuttleServiceCard = memo(function ShuttleServiceCardComponent({
  status,
  value,
  stationName,
  unavailableReason,
  onToggle,
  onEdit,
  onRetry,
}: ShuttleServiceCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isAvailable = status === 'available';
  const isEnabled = Boolean(value);
  const switchTrackColors = useMemo(
    () => ({
      false: theme.colors.divider,
      true: theme.colors.primaryFaded,
    }),
    [theme.colors.divider, theme.colors.primaryFaded],
  );

  return (
    <SectionCard testID="shuttle-service-card" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <Van size={22} color={theme.colors.primary} weight="duotone" />
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{t('booking.shuttle.title')}</Text>
          <Text style={styles.subtitle}>
            {t('booking.shuttle.requestToStation', {
              station: stationName || t('booking.shuttle.departureStation'),
            })}
          </Text>
        </View>
        {status === 'loading' ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <Switch
            accessibilityLabel={t('booking.shuttle.requestAccessibility')}
            accessibilityHint={t('booking.shuttle.requestHint')}
            value={isEnabled}
            disabled={!isAvailable}
            onValueChange={onToggle}
            trackColor={switchTrackColors}
            thumbColor={isEnabled ? theme.colors.primary : theme.colors.textTertiary}
            ios_backgroundColor={theme.colors.divider}
          />
        )}
      </View>

      {isAvailable ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {t('booking.shuttle.arrangementNotice')}
          </Text>
        </View>
      ) : null}

      {isEnabled && value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('booking.shuttle.editAddress')}
          onPress={onEdit}
          style={({ pressed }) => [
            styles.addressRow,
            pressed ? styles.pressed : null,
          ]}
        >
          <MapPinLine size={20} color={theme.colors.primary} weight="duotone" />
          <View style={styles.addressCopy}>
            <Text style={styles.addressLabel}>{t('booking.shuttle.pickupAddress')}</Text>
            <Text style={styles.addressText} numberOfLines={3}>{value.address}</Text>
            <Text style={styles.addressStatus}>{t('booking.shuttle.savedAwaitingArrangement')}</Text>
          </View>
          <View style={styles.editIcon}>
            <PencilSimple size={15} color={theme.colors.primary} weight="bold" />
          </View>
        </Pressable>
      ) : null}

      {status === 'unavailable' ? (
        <Text style={styles.unavailableText}>
          {unavailableReason || t('booking.shuttle.unavailable')}
        </Text>
      ) : null}

      {status === 'error' ? (
        <View style={styles.errorRow}>
          <Text style={styles.unavailableText}>
            {t('booking.shuttle.verificationFailed')}
          </Text>
          {onRetry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('booking.shuttle.retryAvailability')}
              onPress={onRetry}
              hitSlop={8}
            >
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </SectionCard>
  );
});

const createStyles = (theme: AppTheme) => ({
  card: {
    marginTop: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xxs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  notice: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primaryFaded,
  },
  noticeText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  addressRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.contentSurfaceSoft,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
  },
  addressCopy: {
    flex: 1,
    minWidth: 0,
  },
  addressLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  addressText: {
    marginTop: spacing.xxs,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  addressStatus: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  editIcon: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: {
    flex: 1,
    marginTop: spacing.md,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  retryText: {
    paddingVertical: spacing.sm,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
