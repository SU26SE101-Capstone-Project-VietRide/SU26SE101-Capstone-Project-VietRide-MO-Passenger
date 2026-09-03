import React, { memo, useCallback, useMemo } from 'react';
import {
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowRight, ClockCounterClockwise, Star, X } from 'phosphor-react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';

import type { RecentSearch } from '../hooks/useRecentSearches';
import { favoriteRouteId, type FavoriteRouteInput } from '../hooks/useFavoriteRoutes';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

interface RecentSearchesSectionProps {
  searches: readonly RecentSearch[];
  error: string | null;
  isLoading?: boolean;
  onSearchPress: (searchId: string) => void;
  onClear: () => void;
  favoriteRouteIds?: readonly string[];
  onToggleFavorite?: (route: FavoriteRouteInput) => void;
}

interface RecentSearchCardProps {
  id: string;
  fromCode: string;
  fromName: string;
  toCode: string;
  toName: string;
  date: string;
  passengers: number;
  isFavorite: boolean;
  onPress: (id: string) => void;
  onToggleFavorite?: (route: FavoriteRouteInput) => void;
}

const RecentSearchCard = memo(function RecentSearchCardComponent({
  id,
  fromCode,
  fromName,
  toCode,
  toName,
  date,
  passengers,
  isFavorite,
  onPress,
  onToggleFavorite,
}: RecentSearchCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => onPress(id), [id, onPress]);
  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite?.({
      originCode: fromCode,
      originName: fromName,
      destinationCode: toCode,
      destinationName: toName,
    });
  }, [fromCode, fromName, onToggleFavorite, toCode, toName]);

  return (
    <View style={styles.cardShell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('booking.recentSearches.routeAccessibility', {
          origin: fromName,
          destination: toName,
          date,
        })}
        onPress={handlePress}
        style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      >
        <View style={styles.routeRow}>
          <ClockCounterClockwise size={18} color={theme.colors.primary} />
          <Text style={styles.routeText} numberOfLines={1}>{fromName}</Text>
          <ArrowRight size={14} color={theme.colors.textTertiary} />
          <Text style={styles.routeText} numberOfLines={1}>{toName}</Text>
        </View>
        <Text style={styles.meta}>
          {t('booking.recentSearches.meta', { date, count: passengers })}
        </Text>
      </Pressable>
      {onToggleFavorite ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFavorite
            ? t('booking.favorites.removeAccessibility', { origin: fromName, destination: toName })
            : t('booking.favorites.addAccessibility', { origin: fromName, destination: toName })}
          accessibilityState={{ selected: isFavorite }}
          onPress={handleToggleFavorite}
          hitSlop={6}
          style={({ pressed }) => [styles.favoriteButton, pressed ? styles.pressed : null]}
        >
          <Star
            size={16}
            color={isFavorite ? theme.colors.warningForeground : theme.colors.textTertiary}
            weight={isFavorite ? 'fill' : 'regular'}
          />
        </Pressable>
      ) : null}
    </View>
  );
});

const keyExtractor = (item: RecentSearch): string => item.id;

const RecentSearchSkeleton = memo(function RecentSearchSkeleton(): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.skeletonRow} accessibilityElementsHidden>
      {[0, 1].map(index => (
        <View key={`recent-search-skeleton-${index}`} style={styles.skeletonCard}>
          <View style={[styles.skeletonBlock, styles.skeletonRoute]} />
          <View style={[styles.skeletonBlock, styles.skeletonMeta]} />
        </View>
      ))}
    </View>
  );
});

export const RecentSearchesSection = memo(function RecentSearchesSectionComponent({
  searches,
  error,
  isLoading = false,
  onSearchPress,
  onClear,
  favoriteRouteIds = [],
  onToggleFavorite,
}: RecentSearchesSectionProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { fontScale } = useWindowDimensions();
  const listFrameStyle = useMemo(
    () => ({ height: Math.ceil(96 * Math.max(1, fontScale)) }),
    [fontScale],
  );
  const favoriteIdSet = useMemo(() => new Set(favoriteRouteIds), [favoriteRouteIds]);
  const renderItem = useCallback(({ item }: ListRenderItemInfo<RecentSearch>) => (
    <RecentSearchCard
      id={item.id}
      fromCode={item.fromCode}
      fromName={item.fromName}
      toCode={item.toCode}
      toName={item.toName}
      date={item.date}
      passengers={item.passengers}
      isFavorite={favoriteIdSet.has(favoriteRouteId(item.fromCode, item.toCode))}
      onPress={onSearchPress}
      onToggleFavorite={onToggleFavorite}
    />
  ), [favoriteIdSet, onSearchPress, onToggleFavorite]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{t('booking.recentSearches.title')}</Text>
        {searches.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('booking.recentSearches.clearAccessibility')}
            onPress={onClear}
            style={({ pressed }) => [styles.clearButton, pressed ? styles.pressed : null]}
          >
            <X size={14} color={theme.colors.textSecondary} />
            <Text style={styles.clearText}>{t('booking.recentSearches.clear')}</Text>
          </Pressable>
        ) : null}
      </View>
      {isLoading ? (
        <View
          style={[styles.skeletonFrame, listFrameStyle]}
          accessibilityLabel={t('booking.recentSearches.loadingAccessibility')}
        >
          <RecentSearchSkeleton />
        </View>
      ) : error ? (
        <View style={[styles.stateBox, listFrameStyle]}>
          <Text style={styles.errorText}>{t('booking.recentSearches.storageError')}</Text>
        </View>
      ) : searches.length > 0 ? (
        <View style={[styles.listFrame, listFrameStyle]}>
          <FlashList
            horizontal
            data={searches as RecentSearch[]}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      ) : (
        <View style={[styles.stateBox, listFrameStyle]}>
          <Text style={styles.stateText}>{t('booking.recentSearches.empty')}</Text>
        </View>
      )}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  section: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  clearText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
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
    gap: spacing.md,
  },
  skeletonCard: {
    width: 260,
    minHeight: 78,
    padding: spacing.md,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  skeletonBlock: {
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.skeleton,
  },
  skeletonRoute: {
    width: '82%' as const,
    height: 14,
  },
  skeletonMeta: {
    width: '58%' as const,
    height: 11,
  },
  stateBox: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.contentSurfaceSoft,
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
  },
  cardShell: {
    width: 260,
    minHeight: 78,
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
    minHeight: 78,
    padding: spacing.md,
    paddingRight: 46,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  favoriteButton: {
    position: 'absolute' as const,
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  routeText: {
    flexShrink: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  meta: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  pressed: {
    opacity: 0.82,
  },
});
