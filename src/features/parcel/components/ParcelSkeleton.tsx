import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { spacing, borderRadius } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import { motionTokens, useMotion } from '@shared/motion';
import type { AppTheme } from '@shared/theme';

interface ParcelSkeletonProps {
  type?: 'station' | 'shipment' | 'summary';
  count?: number;
}

export function ParcelSkeleton({ type = 'station', count = 3 }: ParcelSkeletonProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const { reduceMotion } = useMotion();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    cancelAnimation(opacity);

    if (reduceMotion) {
      opacity.value = 0.7;
      return;
    }

    opacity.value = 0.4;
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: motionTokens.duration.emphasis * 2 }),
        withTiming(0.4, { duration: motionTokens.duration.emphasis * 2 }),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const renderStationSkeleton = (index: number) => (
    <Animated.View key={`station-${index}`} style={[styles.card, animatedStyle]}>
      <View style={styles.stationIconStub} />
      <View style={styles.stationContentStub}>
        <View style={styles.titleStub} />
        <View style={styles.addressLineStub} />
        <View style={styles.addressLineStubShort} />
        <View style={styles.metaRowStub}>
          <View style={styles.distanceStub} />
          <View style={styles.badgeStub} />
        </View>
      </View>
      <View style={styles.selectionStub} />
    </Animated.View>
  );

  const renderShipmentSkeleton = (index: number) => (
    <Animated.View
      key={`shipment-${index}`}
      style={[styles.shipmentCard, animatedStyle]}
    >
      <View style={styles.shipmentIconStub} />
      <View style={styles.shipmentInfo}>
        <View style={styles.shipmentTitleRow}>
          <View style={styles.shipmentDestStub} />
          <View style={styles.shipmentBadgeStub} />
        </View>
        <View style={styles.shipmentSubstub} />
      </View>
    </Animated.View>
  );

  const renderSummarySkeleton = () => (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={[styles.titleStub, styles.summaryTitleStub]} />
      <View style={styles.routeItemStub}>
        <View style={styles.circleStub} />
        <View style={styles.routeTextStub} />
      </View>
      <View style={styles.dividerStub} />
      <View style={styles.routeItemStub}>
        <View style={styles.circleStub} />
        <View style={styles.routeTextStub} />
      </View>
      <View style={styles.dividerStub} />
      <View style={styles.metaRowStub}>
        <View style={styles.badgeStub} />
        <View style={styles.badgeStub} />
      </View>
    </Animated.View>
  );

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.container}
    >
      {type === 'station' ? Array.from({ length: count }).map((_, i) => renderStationSkeleton(i)) : null}
      {type === 'shipment' ? Array.from({ length: count }).map((_, i) => renderShipmentSkeleton(i)) : null}
      {type === 'summary' ? renderSummarySkeleton() : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    width: '100%',
  },
  card: {
    alignItems: 'flex-start',
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurface
      : theme.colors.surface,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 112,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
    position: 'relative',
    overflow: 'hidden',
  },
  stationIconStub: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.skeleton,
    borderRadius: borderRadius.md,
  },
  stationContentStub: {
    flex: 1,
    minWidth: 0,
  },
  titleStub: {
    width: '65%',
    height: 18,
    backgroundColor: theme.colors.skeleton,
    borderRadius: borderRadius.xs,
  },
  summaryTitleStub: {
    width: '50%',
    marginBottom: spacing.lg,
  },
  selectionStub: {
    width: 24,
    height: 24,
    backgroundColor: theme.colors.skeleton,
    borderRadius: borderRadius.full,
  },
  addressLineStub: {
    width: '95%',
    height: 14,
    backgroundColor: theme.colors.skeleton,
    borderRadius: borderRadius.xs,
    marginBottom: spacing.xs,
  },
  addressLineStubShort: {
    width: '60%',
    height: 14,
    backgroundColor: theme.colors.skeleton,
    borderRadius: borderRadius.xs,
    marginBottom: spacing.md,
  },
  metaRowStub: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  distanceStub: {
    width: 44,
    height: 12,
    backgroundColor: theme.colors.skeleton,
    borderRadius: borderRadius.xs,
  },
  badgeStub: {
    width: 80,
    height: 24,
    backgroundColor: theme.colors.skeleton,
    borderRadius: borderRadius.sm,
  },
  shipmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurface
      : theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  shipmentIconStub: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.skeleton,
    marginRight: spacing.md,
  },
  shipmentInfo: {
    flex: 1,
  },
  shipmentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  shipmentDestStub: {
    width: '50%',
    height: 16,
    backgroundColor: theme.colors.skeleton,
    borderRadius: borderRadius.xs,
  },
  shipmentBadgeStub: {
    width: 70,
    height: 20,
    backgroundColor: theme.colors.skeleton,
    borderRadius: borderRadius.full,
  },
  shipmentSubstub: {
    width: '80%',
    height: 12,
    backgroundColor: theme.colors.skeleton,
    borderRadius: borderRadius.xs,
  },
  routeItemStub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  circleStub: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.skeleton,
  },
  routeTextStub: {
    width: '70%',
    height: 16,
    backgroundColor: theme.colors.skeleton,
    borderRadius: borderRadius.xs,
  },
  dividerStub: {
    width: 2,
    height: 20,
    backgroundColor: theme.colors.skeleton,
    marginLeft: 5,
  },
});
