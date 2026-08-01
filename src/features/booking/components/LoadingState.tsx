/**
 * LoadingState - Skeleton route cards for booking fetches.
 *
 * Keeps the results area stable while the booking API is resolving.
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

interface LoadingStateProps {
  /** Optional custom loading text (default: "Finding the best routes…") */
  text?: string;
}

const skeletonCards = [0, 1, 2] as const;

export const LoadingState = ({ text }: LoadingStateProps): React.JSX.Element => {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <View style={styles.copyBlock}>
          <Text style={styles.title}>{text ?? t('booking.states.findingRoutes')}</Text>
          <Text style={styles.subtitle}>{t('booking.states.checkingSeatsAndFares')}</Text>
        </View>
      </View>

      {skeletonCards.map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonTopRow}>
            <View style={styles.skeletonPill} />
            <View style={styles.skeletonPrice} />
          </View>

          <View style={styles.skeletonRouteRow}>
            <View style={styles.skeletonTimeBlock}>
              <View style={styles.skeletonTime} />
              <View style={styles.skeletonLineShort} />
            </View>

            <View style={styles.skeletonTrackWrap}>
              <View style={styles.skeletonTrack} />
              <View style={styles.skeletonBubble} />
            </View>

            <View style={[styles.skeletonTimeBlock, styles.skeletonTimeBlockRight]}>
              <View style={styles.skeletonTime} />
              <View style={styles.skeletonLineShort} />
            </View>
          </View>

          <View style={styles.skeletonBottomRow}>
            <View style={styles.skeletonLineMedium} />
            <View style={styles.skeletonSeatPill} />
          </View>
        </View>
      ))}
    </View>
  );
};

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  copyBlock: {
    flex: 1,
  },
  skeletonCard: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  skeletonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  skeletonPill: {
    width: 112,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.skeleton,
  },
  skeletonPrice: {
    width: 64,
    height: 22,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.skeletonHighlight,
  },
  skeletonRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  skeletonTimeBlock: {
    flex: 1,
  },
  skeletonTimeBlockRight: {
    alignItems: 'flex-end',
  },
  skeletonTime: {
    width: 58,
    height: 22,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.skeletonHighlight,
    marginBottom: spacing.xs,
  },
  skeletonLineShort: {
    width: 72,
    height: 12,
    borderRadius: borderRadius.xs,
    backgroundColor: theme.colors.skeleton,
  },
  skeletonTrackWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  skeletonTrack: {
    width: '100%',
    height: 3,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.skeleton,
  },
  skeletonBubble: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.skeletonHighlight,
  },
  skeletonBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: spacing.md,
  },
  skeletonLineMedium: {
    width: 148,
    height: 14,
    borderRadius: borderRadius.xs,
    backgroundColor: theme.colors.skeleton,
  },
  skeletonSeatPill: {
    width: 84,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.skeletonHighlight,
  },
});
