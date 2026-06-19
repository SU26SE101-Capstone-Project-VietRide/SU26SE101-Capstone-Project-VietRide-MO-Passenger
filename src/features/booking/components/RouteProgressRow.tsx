/**
 * RouteProgressRow — Departure code/time + progress bar + Arrival code/time
 *
 * Used in SeatSelectionScreen route card and TripCard.
 */

import React, { memo } from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Bus } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface RouteProgressRowProps {
  departureCode: string;
  departureTime: string;
  departureName?: string;
  arrivalCode: string;
  arrivalTime: string;
  arrivalName?: string;
  durationHours?: number;
  /** Custom icon for the center bubble. Defaults to a Bus icon. */
  busIcon?: React.ReactNode;
  style?: ViewStyle;
}

export const RouteProgressRow = memo(function RouteProgressRow({
  departureCode,
  departureTime,
  departureName,
  arrivalCode,
  arrivalTime,
  arrivalName,
  durationHours,
  busIcon,
  style,
}: RouteProgressRowProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const centerIcon = busIcon ?? <Bus size={14} weight="fill" color={theme.colors.primary} />;
  return (
    <View style={[styles.routeCard, style]}>
      <View style={styles.routeEndpoint}>
        <Text style={styles.routeCode}>{departureCode}</Text>
        <Text style={styles.routeTime}>{departureTime}</Text>
        {departureName ? (
          <Text style={styles.routeName}>{departureName}</Text>
        ) : null}
      </View>

      <View style={styles.routeCenter}>
        <View style={styles.routeLine}>
          <View style={styles.routeLineBar} />
          <View style={styles.routeIconBubble}>
            {centerIcon}
          </View>
        </View>
        {durationHours != null ? (
          <Text style={styles.routeDuration}>{durationHours}h</Text>
        ) : null}
      </View>

      <View style={[styles.routeEndpoint, styles.routeEndpointRight]}>
        <Text style={styles.routeCode}>{arrivalCode}</Text>
        <Text style={styles.routeTime}>{arrivalTime}</Text>
        {arrivalName ? (
          <Text style={[styles.routeName, styles.routeNameRight]}>
            {arrivalName}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  routeCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  routeEndpoint: {
    flex: 1,
  },
  routeEndpointRight: {
    alignItems: 'flex-end',
  },
  routeCode: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
  routeTime: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  routeName: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginTop: spacing.xs / 2,
  },
  routeNameRight: {
    textAlign: 'right',
  },
  routeCenter: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 96,
  },
  routeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.divider,
  },
  routeIconBubble: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    left: '50%',
    marginLeft: -14,
  },
  routeDuration: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
});
