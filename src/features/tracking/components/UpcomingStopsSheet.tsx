import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { CaretDown, CaretUp } from 'phosphor-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks/useThemedStyles';
import { motionTokens, useMotion } from '@shared/motion';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { getTrackingMapPalette } from './trackingMapStyles';
import {
  DEFAULT_UPCOMING_SHEET_COLLAPSED_HEIGHT,
  UPCOMING_SHEET_MAX_COLLAPSED_BODY_RATIO,
  getUpcomingStopsSheetLayout,
} from './upcomingStopsSheetModel';

export type UpcomingStopTone =
  | 'default'
  | 'destination'
  | 'next'
  | 'target'
  | 'targetNext';

export interface UpcomingStopSheetItem {
  detail: string;
  id: string;
  label: string;
  name: string;
  sequence?: number;
  tone: UpcomingStopTone;
}

interface UpcomingStopsSheetProps {
  containerHeight: number;
  featuredItems: readonly UpcomingStopSheetItem[];
  footer?: ReactNode;
  items: readonly UpcomingStopSheetItem[];
  onCollapsedHeightChange?: (height: number) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const VELOCITY_SNAP_THRESHOLD = 350;

const markerStyleForTone = (
  tone: UpcomingStopTone,
  styles: ReturnType<typeof createStyles>,
): object => {
  switch (tone) {
    case 'target':
      return styles.markerTarget;
    case 'targetNext':
      return styles.markerTargetNext;
    case 'next':
      return styles.markerNext;
    case 'destination':
      return styles.markerDestination;
    default:
      return styles.markerDefault;
  }
};

const labelStyleForTone = (
  tone: UpcomingStopTone,
  styles: ReturnType<typeof createStyles>,
): object => {
  switch (tone) {
    case 'target':
    case 'targetNext':
      return styles.labelTarget;
    case 'next':
      return styles.labelNext;
    case 'destination':
      return styles.labelDestination;
    default:
      return styles.labelDefault;
  }
};

const markerTextStyleForTone = (
  tone: UpcomingStopTone,
  styles: ReturnType<typeof createStyles>,
): object => {
  switch (tone) {
    case 'target':
    case 'targetNext':
      return styles.markerTextTarget;
    case 'next':
      return styles.markerTextNext;
    case 'default':
      return styles.markerTextDefault;
    default:
      return styles.markerTextInverse;
  }
};

const FeaturedStopCard = React.memo(function FeaturedStopCardComponent({
  compact,
  item,
  styles,
}: {
  compact: boolean;
  item: UpcomingStopSheetItem;
  styles: ReturnType<typeof createStyles>;
}): React.JSX.Element {
  return (
    <View
      style={[styles.featuredCard, compact ? styles.featuredCardCompact : null]}
      accessibilityRole="summary"
    >
      <View
        style={[
          styles.featuredMarker,
          compact ? styles.featuredMarkerCompact : null,
          markerStyleForTone(item.tone, styles),
        ]}
      >
        <Text
          style={[
            styles.featuredMarkerText,
            markerTextStyleForTone(item.tone, styles),
          ]}
          numberOfLines={1}
        >
          {item.sequence ?? '•'}
        </Text>
      </View>
      {compact ? (
        <View style={styles.featuredCompactCopy}>
          <Text
            style={[
              styles.featuredCompactName,
              labelStyleForTone(item.tone, styles),
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.label} · {item.name}
          </Text>
          <Text
            style={[styles.stopDetail, styles.featuredCompactDetail]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.detail}
          </Text>
        </View>
      ) : (
        <View style={styles.featuredCopy}>
          <Text
            style={[styles.stopLabel, labelStyleForTone(item.tone, styles)]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          <Text
            style={styles.featuredName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
          <Text
            style={styles.stopDetail}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.detail}
          </Text>
        </View>
      )}
    </View>
  );
});

const UpcomingStopRow = React.memo(function UpcomingStopRowComponent({
  item,
  styles,
}: {
  item: UpcomingStopSheetItem;
  styles: ReturnType<typeof createStyles>;
}): React.JSX.Element {
  return (
    <View style={styles.stopRow} accessibilityRole="summary">
      <View style={[styles.stopMarker, markerStyleForTone(item.tone, styles)]}>
        <Text
          style={[
            styles.stopMarkerText,
            markerTextStyleForTone(item.tone, styles),
          ]}
          numberOfLines={1}
        >
          {item.sequence ?? '•'}
        </Text>
      </View>
      <View style={styles.stopCopy}>
        <View style={styles.stopHeading}>
          <Text style={styles.stopName} numberOfLines={2} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text
            style={[styles.stopLabel, labelStyleForTone(item.tone, styles)]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </View>
        <Text style={styles.stopDetail} numberOfLines={1} ellipsizeMode="tail">
          {item.detail}
        </Text>
      </View>
    </View>
  );
});

const StopSeparator = React.memo(
  function StopSeparatorComponent(): React.JSX.Element {
    const styles = useThemedStyles(createStyles);
    return <View style={styles.separator} />;
  },
);

export const UpcomingStopsSheet = React.memo(
  function UpcomingStopsSheetComponent({
    containerHeight,
    featuredItems,
    footer,
    items,
    onCollapsedHeightChange,
    onRefresh,
    refreshing,
  }: UpcomingStopsSheetProps): React.JSX.Element {
    const { t } = useTranslation();
    const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(48);
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);
    const { reduceMotion } = useMotion();
    const [expanded, setExpanded] = useState(false);
    const [measuredCollapsedHeight, setMeasuredCollapsedHeight] = useState(
      DEFAULT_UPCOMING_SHEET_COLLAPSED_HEIGHT,
    );
    const { collapsedHeight, collapsedOffset, expandedHeight } = useMemo(
      () =>
        getUpcomingStopsSheetLayout(containerHeight, measuredCollapsedHeight),
      [containerHeight, measuredCollapsedHeight],
    );
    const isCompactPreview =
      containerHeight * UPCOMING_SHEET_MAX_COLLAPSED_BODY_RATIO <
      DEFAULT_UPCOMING_SHEET_COLLAPSED_HEIGHT;
    const translateY = useSharedValue(collapsedOffset);
    const panStartY = useSharedValue(collapsedOffset);

    const commitExpanded = useCallback((nextExpanded: boolean) => {
      setExpanded(nextExpanded);
    }, []);

    useEffect(() => {
      translateY.value = withTiming(expanded ? 0 : collapsedOffset, {
        duration: reduceMotion ? 0 : motionTokens.duration.standard,
      });
    }, [collapsedOffset, expanded, reduceMotion, translateY]);

    const expandedProgress = useDerivedValue(() => {
      if (collapsedOffset <= 0) return expanded ? 1 : 0;
      return 1 - translateY.value / collapsedOffset;
    });
    const sheetAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));
    const expandedAnimatedStyle = useAnimatedStyle(() => ({
      opacity: expandedProgress.value,
    }));
    const collapsedPreviewAnimatedStyle = useAnimatedStyle(() => ({
      opacity: 1 - expandedProgress.value,
    }));

    const panGesture = useMemo(
      () =>
        Gesture.Pan()
          .onBegin(() => {
            panStartY.value = translateY.value;
          })
          .onUpdate(event => {
            const nextValue = panStartY.value + event.translationY;
            translateY.value = Math.max(
              0,
              Math.min(collapsedOffset, nextValue),
            );
          })
          .onEnd(event => {
            const shouldExpand =
              event.velocityY < -VELOCITY_SNAP_THRESHOLD ||
              (event.velocityY <= VELOCITY_SNAP_THRESHOLD &&
                translateY.value < collapsedOffset / 2);
            translateY.value = withTiming(shouldExpand ? 0 : collapsedOffset, {
              duration: reduceMotion ? 0 : motionTokens.duration.standard,
            });
            runOnJS(commitExpanded)(shouldExpand);
          }),
      [collapsedOffset, commitExpanded, panStartY, reduceMotion, translateY],
    );

    const handleToggle = useCallback(() => {
      setExpanded(current => !current);
    }, []);
    const handleCollapsedLayout = useCallback((event: LayoutChangeEvent) => {
      const measuredHeight = Math.ceil(event.nativeEvent.layout.height);
      setMeasuredCollapsedHeight(current =>
        current === measuredHeight ? current : measuredHeight,
      );
    }, []);
    const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
      const measuredHeight = Math.ceil(event.nativeEvent.layout.height);
      setMeasuredHeaderHeight(current =>
        current === measuredHeight ? current : measuredHeight,
      );
    }, []);
    useEffect(() => {
      onCollapsedHeightChange?.(collapsedHeight);
    }, [collapsedHeight, onCollapsedHeightChange]);

    const renderItem = useCallback<ListRenderItem<UpcomingStopSheetItem>>(
      ({ item }) => <UpcomingStopRow item={item} styles={styles} />,
      [styles],
    );
    const keyExtractor = useCallback(
      (item: UpcomingStopSheetItem) => item.id,
      [],
    );
    const listFooter = footer ? (
      <View style={styles.footer}>{footer}</View>
    ) : null;

    return (
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.sheetPosition,
          { height: expandedHeight },
          sheetAnimatedStyle,
        ]}
      >
        <View style={styles.sheetSurface}>
          <View onLayout={handleCollapsedLayout}>
            <GestureDetector gesture={panGesture}>
              <View collapsable={false}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    expanded
                      ? 'tracking.progress.collapseStops'
                      : 'tracking.progress.expandStops',
                  )}
                  accessibilityHint={t(
                    'tracking.progress.sheetAccessibilityHint',
                  )}
                  onLayout={handleHeaderLayout}
                  accessibilityState={{ expanded }}
                  hitSlop={8}
                  onPress={handleToggle}
                  style={({ pressed }) => [
                    styles.sheetHeader,
                    isCompactPreview ? styles.sheetHeaderCompact : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View style={styles.handle} />
                  <Text
                    style={[
                      styles.sheetTitle,
                      isCompactPreview ? styles.sheetTitleCompact : null,
                    ]}
                    numberOfLines={1}
                  >
                    {t('tracking.progress.upcomingStops')}
                  </Text>
                  {expanded ? (
                    <CaretDown
                      size={20}
                      color={theme.colors.textSecondary}
                      weight="bold"
                    />
                  ) : (
                    <CaretUp
                      size={20}
                      color={theme.colors.textSecondary}
                      weight="bold"
                    />
                  )}
                </Pressable>
              </View>
            </GestureDetector>

            <Animated.View
              pointerEvents={expanded ? 'none' : 'auto'}
              accessibilityElementsHidden={expanded}
              importantForAccessibility={
                expanded ? 'no-hide-descendants' : 'auto'
              }
              style={[
                collapsedPreviewAnimatedStyle,
                expanded ? styles.collapsedPreviewHidden : null,
              ]}
            >
              <ScrollView
                horizontal
                contentContainerStyle={[
                  styles.featuredContent,
                  isCompactPreview ? styles.featuredContentCompact : null,
                ]}
                showsHorizontalScrollIndicator={false}
              >
                {featuredItems.map(item => (
                  <FeaturedStopCard
                    key={item.id}
                    compact={isCompactPreview}
                    item={item}
                    styles={styles}
                  />
                ))}
              </ScrollView>
            </Animated.View>
          </View>

          <Animated.View
            pointerEvents={expanded ? 'auto' : 'none'}
            accessibilityElementsHidden={!expanded}
            importantForAccessibility={expanded ? 'yes' : 'no-hide-descendants'}
            style={[
              styles.expandedContent,
              { top: measuredHeaderHeight },
              expandedAnimatedStyle,
            ]}
          >
            <FlashList
              data={items}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              ItemSeparatorComponent={StopSeparator}
              ListFooterComponent={listFooter}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              onRefresh={onRefresh}
              refreshing={refreshing}
              showsVerticalScrollIndicator
            />
          </Animated.View>
        </View>
      </Animated.View>
    );
  },
);

const createStyles = (theme: AppTheme) => {
  const palette = getTrackingMapPalette(theme.isDark);
  return {
    sheetPosition: {
      position: 'absolute' as const,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 40,
    },
    collapsedPreviewHidden: {
      opacity: 0,
    },
    sheetSurface: {
      flex: 1,
      overflow: 'hidden' as const,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      borderCurve: 'continuous' as const,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: theme.effects.isLiquid
        ? theme.effects.glassBorderStrong
        : theme.colors.divider,
      backgroundColor: theme.effects.isLiquid
        ? theme.effects.glassSurfaceStrong
        : theme.colors.surfaceElevated,
      ...theme.effects.cardShadow,
    },
    sheetHeader: {
      minHeight: 48,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    sheetHeaderCompact: {
      minHeight: 28,
      paddingTop: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    handle: {
      width: 30,
      height: 4,
      borderRadius: borderRadius.full,
      backgroundColor: theme.colors.divider,
    },
    sheetTitle: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamilies.bold,
      fontSize: fontSizes.sm,
      color: theme.colors.textPrimary,
    },
    sheetTitleCompact: {
      fontSize: fontSizes.xs,
    },
    featuredContent: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    featuredContentCompact: {
      paddingBottom: spacing.xs,
    },
    featuredCard: {
      width: 228,
      minHeight: 68,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: theme.effects.isLiquid
        ? theme.effects.contentBorder
        : theme.colors.divider,
      borderRadius: borderRadius.lg,
      borderCurve: 'continuous' as const,
      backgroundColor: theme.effects.isLiquid
        ? theme.effects.contentSurfaceSoft
        : theme.colors.surfaceAlt,
    },
    featuredCardCompact: {
      width: 240,
      minHeight: 40,
      padding: spacing.xs,
    },
    featuredMarker: {
      width: 34,
      height: 34,
      flexShrink: 0,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: borderRadius.full,
      borderWidth: 2,
    },
    featuredMarkerText: {
      maxWidth: 28,
      fontFamily: fontFamilies.bold,
      fontSize: fontSizes.xs,
    },
    featuredMarkerCompact: {
      width: 28,
      height: 28,
    },
    featuredCopy: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    featuredName: {
      fontFamily: fontFamilies.semiBold,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      color: theme.colors.textPrimary,
    },
    featuredCompactCopy: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    featuredCompactName: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamilies.semiBold,
      fontSize: fontSizes.xs,
    },
    featuredCompactDetail: {
      flexShrink: 0,
      maxWidth: '42%' as unknown as number,
      fontSize: fontSizes.xs,
    },
    expandedContent: {
      position: 'absolute' as const,
      right: 0,
      bottom: 0,
      left: 0,
      minHeight: 0,
      borderTopWidth: 1,
      borderTopColor: theme.effects.isLiquid
        ? theme.effects.contentBorder
        : theme.colors.divider,
    },
    listContent: {
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    stopRow: {
      minHeight: 64,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    stopMarker: {
      width: 36,
      height: 36,
      flexShrink: 0,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: borderRadius.full,
      borderWidth: 2,
    },
    stopMarkerText: {
      maxWidth: 30,
      fontFamily: fontFamilies.bold,
      fontSize: fontSizes.xs,
    },
    markerTextTarget: {
      color: palette.markerGlyph,
    },
    markerTextNext: {
      color: '#241A06',
    },
    markerTextDefault: {
      color: palette.sequenceText,
    },
    markerTextInverse: {
      color: theme.colors.textInverse,
    },
    stopCopy: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    stopHeading: {
      flexDirection: 'row' as const,
      alignItems: 'baseline' as const,
      gap: spacing.sm,
    },
    stopName: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamilies.semiBold,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      color: theme.colors.textPrimary,
    },
    stopLabel: {
      flexShrink: 0,
      fontFamily: fontFamilies.bold,
      fontSize: fontSizes.xs,
    },
    stopDetail: {
      fontFamily: fontFamilies.medium,
      fontSize: fontSizes.xs,
      lineHeight: 18,
      color: theme.colors.textSecondary,
    },
    markerTarget: {
      borderColor: palette.target,
      backgroundColor: palette.target,
    },
    markerTargetNext: {
      borderColor: palette.next,
      backgroundColor: palette.target,
    },
    markerNext: {
      borderColor: palette.next,
      backgroundColor: palette.next,
    },
    markerDestination: {
      borderColor: palette.destination,
      backgroundColor: palette.destination,
    },
    markerDefault: {
      borderColor: palette.intermediateBorder,
      backgroundColor: palette.intermediate,
    },
    labelTarget: {
      color: palette.target,
    },
    labelNext: {
      color: palette.next,
    },
    labelDestination: {
      color: palette.destination,
    },
    labelDefault: {
      color: theme.colors.textTertiary,
    },
    separator: {
      height: 1,
      marginLeft: 48,
      backgroundColor: theme.effects.isLiquid
        ? theme.effects.contentBorder
        : theme.colors.divider,
    },
    footer: {
      gap: spacing.md,
      paddingTop: spacing.lg,
    },
    pressed: {
      opacity: 0.74,
    },
  };
};
