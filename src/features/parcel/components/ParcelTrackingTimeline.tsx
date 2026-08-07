import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Truck } from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import type { ParcelMilestone } from '../utils/parcelTracking';

interface ParcelTrackingTimelineProps {
  milestones: readonly ParcelMilestone[];
}

const MilestoneRow = memo(function MilestoneRowComponent({
  title,
  description,
  time,
  status,
  isLast,
}: {
  title: string;
  description: string;
  time: string | null;
  status: ParcelMilestone['status'];
  isLast: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isCompleted = status === 'completed';
  const isActive = status === 'active';

  return (
    <View style={styles.timelineRow}>
      <View style={styles.nodeColumn}>
        <View
          style={[
            styles.nodeCircle,
            isCompleted ? styles.nodeCompleted : null,
            isActive ? styles.nodeActive : null,
          ]}
        >
          {isCompleted ? (
            <CheckCircle size={18} color={theme.colors.success} weight="fill" />
          ) : isActive ? (
            <Truck size={12} color={theme.colors.textInverse} weight="fill" />
          ) : (
            <View style={styles.nodePendingDot} />
          )}
        </View>
        {!isLast ? (
          <View
            style={[
              styles.timelineLine,
              isCompleted ? styles.timelineLineCompleted : null,
            ]}
          />
        ) : null}
      </View>

      <View style={styles.timelineContent}>
        <Text
          style={[
            styles.timelineTitle,
            isActive ? styles.timelineTitleActive : null,
            status === 'pending' ? styles.timelineTitlePending : null,
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text style={styles.timelineDescription} numberOfLines={3}>
          {description}
        </Text>
        {time ? (
          <Text style={styles.timelineTime} numberOfLines={1}>
            {time}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

/**
 * Parcel lifecycle timeline. Pure presentation — milestones built via
 * `buildParcelMilestones` (no fetch here).
 */
export const ParcelTrackingTimeline = memo(function ParcelTrackingTimelineComponent({
  milestones,
}: ParcelTrackingTimelineProps): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.timelineCard} accessibilityRole="summary">
      <Text style={styles.cardHeading}>{t('parcel.tracking.timelineTitle')}</Text>
      <Text style={styles.cardDescription}>
        {t('parcel.tracking.timelineDescription')}
      </Text>
      <View style={styles.timelineContainer}>
        {milestones.map((item, index) => (
          <MilestoneRow
            key={item.id}
            title={t(item.titleKey)}
            description={t(item.descriptionKey)}
            time={item.time}
            status={item.status}
            isLast={index === milestones.length - 1}
          />
        ))}
      </View>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  timelineCard: {
    ...theme.components.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  cardDescription: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.35,
    color: theme.colors.textSecondary,
  },
  timelineContainer: {
    marginTop: spacing.md,
  },
  timelineRow: {
    flexDirection: 'row' as const,
  },
  nodeColumn: {
    width: 28,
    alignItems: 'center' as const,
  },
  nodeCircle: {
    width: 22,
    height: 22,
    zIndex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 11,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  nodeCompleted: {
    backgroundColor: 'transparent' as const,
  },
  nodeActive: {
    backgroundColor: theme.colors.primary,
  },
  nodePendingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.textDisabled,
  },
  timelineLine: {
    position: 'absolute' as const,
    top: 22,
    bottom: -6,
    width: 2,
    backgroundColor: theme.colors.border,
  },
  timelineLineCompleted: {
    backgroundColor: theme.colors.success,
  },
  timelineContent: {
    flex: 1,
    minWidth: 0,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
  },
  timelineTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  timelineTitleActive: {
    color: theme.colors.primary,
  },
  timelineTitlePending: {
    color: theme.colors.textTertiary,
  },
  timelineDescription: {
    marginTop: 2,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.3,
    color: theme.colors.textSecondary,
  },
  timelineTime: {
    marginTop: 4,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
});
