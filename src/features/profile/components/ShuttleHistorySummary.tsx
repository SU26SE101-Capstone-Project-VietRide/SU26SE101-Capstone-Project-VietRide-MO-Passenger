import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Van } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import type { BookingHistoryShuttleRequest } from '../types';

interface ShuttleHistorySummaryProps {
  requests: readonly BookingHistoryShuttleRequest[];
}

export const ShuttleHistorySummary = memo(function ShuttleHistorySummaryComponent({
  requests,
}: ShuttleHistorySummaryProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  if (requests.length === 0) return null;

  // BE orders history by request time. Group only for the passenger-facing
  // journey so pickup is read before drop-off, preserving BE order per group.
  const orderedRequests = [
    ...requests.filter(request => request.direction === 'INBOUND_TO_STATION'),
    ...requests.filter(request => request.direction === 'OUTBOUND_FROM_STATION'),
  ];

  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.headingRow}>
        <Van size={17} color={theme.colors.primary} weight="duotone" />
        <Text style={styles.heading}>{t('bookingHistory.shuttle.title')}</Text>
      </View>
      {orderedRequests.map((request) => (
        <View
          key={`${request.direction}:${request.requestedAt}`}
          style={styles.request}
        >
          <View style={styles.labelRow}>
            <Text style={styles.direction}>
              {request.direction === 'INBOUND_TO_STATION'
                ? t('bookingHistory.shuttle.inbound')
                : t('bookingHistory.shuttle.outbound')}
            </Text>
            <Text
              style={request.isActive ? styles.activeStatus : styles.cancelledStatus}
            >
              {request.isActive
                ? t('bookingHistory.shuttle.active')
                : t('bookingHistory.shuttle.cancelled')}
            </Text>
          </View>
          <Text style={styles.address} numberOfLines={2}>
            {request.address}
          </Text>
        </View>
      ))}
    </View>
  );
});

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surfaceAlt,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  request: {
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  direction: {
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  activeStatus: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.success,
  },
  cancelledStatus: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  address: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.4,
    color: theme.colors.textSecondary,
  },
});
