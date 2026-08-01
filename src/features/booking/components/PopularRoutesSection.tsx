import React, { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowRight, MapPin } from 'phosphor-react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
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
import type { PopularRouteShortcut } from '../data/popularRoutes';

interface PopularRoutesSectionProps {
  routes: readonly PopularRouteShortcut[];
  isLoading?: boolean;
  hasError?: boolean;
  onRoutePress: (originCode: string, destinationCode: string) => void;
  onViewAll?: () => void;
}

interface PopularRouteCardProps extends PopularRouteShortcut {
  onPress: (originCode: string, destinationCode: string) => void;
}

const PopularRouteCard = memo(function PopularRouteCardComponent({
  originCode,
  originName,
  destinationCode,
  destinationName,
  onPress,
}: PopularRouteCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => {
    onPress(originCode, destinationCode);
  }, [destinationCode, onPress, originCode]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('booking.routes.routeAccessibility', {
        origin: originName,
        destination: destinationName,
      })}
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.iconBadge}>
        <MapPin size={18} color={theme.colors.primary} weight="fill" />
      </View>
      <View style={styles.routeRow}>
        <Text style={styles.city} numberOfLines={1}>{originName}</Text>
        <ArrowRight size={15} color={theme.colors.textTertiary} weight="bold" />
        <Text style={styles.city} numberOfLines={1}>{destinationName}</Text>
      </View>
      <Text style={styles.helper}>{t('booking.routes.tapToPlan')}</Text>
    </Pressable>
  );
});

const keyExtractor = (item: PopularRouteShortcut): string => item.id;

export const PopularRoutesSection = memo(function PopularRoutesSectionComponent({
  routes,
  isLoading = false,
  hasError = false,
  onRoutePress,
  onViewAll,
}: PopularRoutesSectionProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { fontScale } = useWindowDimensions();
  const listFrameStyle = useMemo(
    () => ({ height: Math.ceil(126 * Math.max(1, fontScale)) }),
    [fontScale],
  );
  const renderItem = useCallback(({ item }: ListRenderItemInfo<PopularRouteShortcut>) => (
    <PopularRouteCard
      id={item.id}
      originCode={item.originCode}
      originName={item.originName}
      destinationCode={item.destinationCode}
      destinationName={item.destinationName}
      onPress={onRoutePress}
    />
  ), [onRoutePress]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headingBlock}>
          <Text style={styles.sectionTitle}>{t('booking.routes.popularTitle')}</Text>
          <Text style={styles.sectionSubtitle}>{t('booking.routes.popularSubtitle')}</Text>
        </View>
        {onViewAll ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('booking.routes.viewAllAccessibility')}
            onPress={onViewAll}
            hitSlop={8}
            style={({ pressed }) => [styles.viewAllButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.viewAllText}>{t('booking.routes.viewAll')}</Text>
            <ArrowRight size={14} color={theme.colors.primary} weight="bold" />
          </Pressable>
        ) : null}
      </View>
      {isLoading ? (
        <View
          style={[styles.stateBox, listFrameStyle]}
          accessibilityLabel={t('booking.routes.loadingAccessibility')}
        >
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateText}>{t('booking.routes.loading')}</Text>
        </View>
      ) : hasError ? (
        <View style={[styles.stateBox, listFrameStyle]}>
          <Text style={styles.stateTitle}>{t('booking.routes.unavailableTitle')}</Text>
          <Text style={styles.stateText}>{t('booking.routes.unavailableDescription')}</Text>
        </View>
      ) : routes.length === 0 ? (
        <View style={[styles.stateBox, listFrameStyle]}>
          <Text style={styles.stateTitle}>{t('booking.routes.emptyTitle')}</Text>
          <Text style={styles.stateText}>{t('booking.routes.emptyDescription')}</Text>
        </View>
      ) : (
        <View style={[styles.listFrame, listFrameStyle]}>
          <FlashList
            horizontal
            data={routes as PopularRouteShortcut[]}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  section: {
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headingBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  viewAllButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  viewAllText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  listFrame: {
    marginHorizontal: -spacing.xl,
  },
  stateBox: {
    minHeight: 126,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.effects.glassBorder,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.glassSurface,
  },
  stateTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  stateText: {
    textAlign: 'center' as const,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  card: {
    width: 236,
    minHeight: 104,
    marginRight: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: theme.effects.glassBorder,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.glassSurfaceStrong,
  },
  iconBadge: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  city: {
    flexShrink: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  helper: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  pressed: {
    opacity: 0.82,
  },
});
