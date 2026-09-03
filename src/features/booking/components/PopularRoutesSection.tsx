import React, { memo, useCallback, useMemo } from 'react';
import {
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowRight, MapPin, Star } from 'phosphor-react-native';
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
import { favoriteRouteId, type FavoriteRouteInput } from '../hooks/useFavoriteRoutes';

interface PopularRoutesSectionProps {
  routes: readonly PopularRouteShortcut[];
  isLoading?: boolean;
  hasError?: boolean;
  onRoutePress: (originCode: string, destinationCode: string) => void;
  onViewAll?: () => void;
  favoriteRouteIds?: readonly string[];
  onToggleFavorite?: (route: FavoriteRouteInput) => void;
}

interface PopularRouteCardProps extends PopularRouteShortcut {
  isFavorite: boolean;
  onPress: (originCode: string, destinationCode: string) => void;
  onToggleFavorite?: (route: FavoriteRouteInput) => void;
}

const PopularRouteCard = memo(function PopularRouteCardComponent({
  originCode,
  originName,
  destinationCode,
  destinationName,
  isFavorite,
  onPress,
  onToggleFavorite,
}: PopularRouteCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => {
    onPress(originCode, destinationCode);
  }, [destinationCode, onPress, originCode]);
  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite?.({
      originCode,
      originName,
      destinationCode,
      destinationName,
    });
  }, [destinationCode, destinationName, onToggleFavorite, originCode, originName]);

  return (
    <View style={styles.cardShell}>
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
      {onToggleFavorite ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFavorite
            ? t('booking.favorites.removeAccessibility', { origin: originName, destination: destinationName })
            : t('booking.favorites.addAccessibility', { origin: originName, destination: destinationName })}
          accessibilityState={{ selected: isFavorite }}
          hitSlop={6}
          onPress={handleToggleFavorite}
          style={({ pressed }) => [styles.favoriteButton, pressed ? styles.pressed : null]}
        >
          <Star
            size={17}
            color={isFavorite ? theme.colors.warningForeground : theme.colors.textTertiary}
            weight={isFavorite ? 'fill' : 'regular'}
          />
        </Pressable>
      ) : null}
    </View>
  );
});

const keyExtractor = (item: PopularRouteShortcut): string => item.id;

const PopularRouteSkeleton = memo(function PopularRouteSkeleton(): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.skeletonRow} accessibilityElementsHidden>
      {[0, 1].map(index => (
        <View key={`popular-route-skeleton-${index}`} style={styles.skeletonCard}>
          <View style={[styles.skeletonBlock, styles.skeletonIcon]} />
          <View style={[styles.skeletonBlock, styles.skeletonRoute]} />
          <View style={[styles.skeletonBlock, styles.skeletonHelper]} />
        </View>
      ))}
    </View>
  );
});

export const PopularRoutesSection = memo(function PopularRoutesSectionComponent({
  routes,
  isLoading = false,
  hasError = false,
  onRoutePress,
  onViewAll,
  favoriteRouteIds = [],
  onToggleFavorite,
}: PopularRoutesSectionProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { fontScale } = useWindowDimensions();
  const listFrameStyle = useMemo(
    () => ({ height: Math.ceil(126 * Math.max(1, fontScale)) }),
    [fontScale],
  );
  const favoriteIdSet = useMemo(() => new Set(favoriteRouteIds), [favoriteRouteIds]);
  const renderItem = useCallback(({ item }: ListRenderItemInfo<PopularRouteShortcut>) => (
    <PopularRouteCard
      id={item.id}
      originCode={item.originCode}
      originName={item.originName}
      destinationCode={item.destinationCode}
      destinationName={item.destinationName}
      isFavorite={favoriteIdSet.has(favoriteRouteId(item.originCode, item.destinationCode))}
      onPress={onRoutePress}
      onToggleFavorite={onToggleFavorite}
    />
  ), [favoriteIdSet, onRoutePress, onToggleFavorite]);

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
          style={[styles.skeletonFrame, listFrameStyle]}
          accessibilityLabel={t('booking.routes.loadingAccessibility')}
        >
          <PopularRouteSkeleton />
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
  skeletonFrame: {
    marginHorizontal: -spacing.xl,
    overflow: 'hidden' as const,
  },
  skeletonRow: {
    flexDirection: 'row' as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  skeletonCard: {
    width: 236,
    minHeight: 104,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  skeletonBlock: {
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.skeleton,
  },
  skeletonIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
  },
  skeletonRoute: {
    width: '78%' as const,
    height: 15,
  },
  skeletonHelper: {
    width: '52%' as const,
    height: 11,
  },
  stateBox: {
    minHeight: 126,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.contentSurfaceSoft,
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
  cardShell: {
    width: 236,
    minHeight: 104,
    marginRight: spacing.md,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.contentSurface,
  },
  card: {
    flex: 1,
    minHeight: 104,
    padding: spacing.md,
    paddingRight: 48,
    gap: spacing.sm,
  },
  favoriteButton: {
    position: 'absolute' as const,
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    backgroundColor: theme.effects.contentSurfaceSoft,
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
