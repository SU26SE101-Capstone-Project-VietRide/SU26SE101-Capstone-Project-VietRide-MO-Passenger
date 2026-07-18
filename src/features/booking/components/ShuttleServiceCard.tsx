import React, { memo } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';
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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isAvailable = status === 'available';
  const isEnabled = Boolean(value);

  return (
    <SectionCard testID="shuttle-service-card" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <Van size={22} color={theme.colors.primary} weight="duotone" />
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Shuttle pickup</Text>
          <Text style={styles.subtitle}>
            Request a ride to {stationName || 'the departure station'}
          </Text>
        </View>
        {status === 'loading' ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <Switch
            accessibilityLabel="Request Shuttle pickup"
            accessibilityHint="Adds an optional pickup request for this trip"
            value={isEnabled}
            disabled={!isAvailable}
            onValueChange={onToggle}
            trackColor={{
              false: theme.colors.divider,
              true: theme.colors.primaryFaded,
            }}
            thumbColor={isEnabled ? theme.colors.primary : theme.colors.textTertiary}
            ios_backgroundColor={theme.colors.divider}
          />
        )}
      </View>

      {isAvailable ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            This sends a request only. The operator will arrange and confirm the Shuttle later.
          </Text>
        </View>
      ) : null}

      {isEnabled && value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit Shuttle pickup address"
          onPress={onEdit}
          style={({ pressed }) => [
            styles.addressRow,
            pressed ? styles.pressed : null,
          ]}
        >
          <MapPinLine size={20} color={theme.colors.primary} weight="duotone" />
          <View style={styles.addressCopy}>
            <Text style={styles.addressLabel}>Pickup address</Text>
            <Text style={styles.addressText} numberOfLines={3}>{value.address}</Text>
            <Text style={styles.addressStatus}>Request saved · awaiting arrangement</Text>
          </View>
          <View style={styles.editIcon}>
            <PencilSimple size={15} color={theme.colors.primary} weight="bold" />
          </View>
        </Pressable>
      ) : null}

      {status === 'unavailable' ? (
        <Text style={styles.unavailableText}>
          {unavailableReason || 'Shuttle pickup is unavailable for this boarding point.'}
        </Text>
      ) : null}

      {status === 'error' ? (
        <View style={styles.errorRow}>
          <Text style={styles.unavailableText}>
            Shuttle availability could not be verified. You can still board normally.
          </Text>
          {onRetry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry Shuttle availability"
              onPress={onRetry}
              hitSlop={8}
            >
              <Text style={styles.retryText}>Retry</Text>
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
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
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
