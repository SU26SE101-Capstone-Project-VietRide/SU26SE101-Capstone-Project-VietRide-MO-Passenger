import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { ArrowRight, Star } from 'phosphor-react-native';
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
import type { FavoriteRoute } from '../hooks/useFavoriteRoutes';

interface FavoriteRoutesSectionProps {
  routes: readonly FavoriteRoute[];
  onRoutePress: (routeId: string) => void;
  onRemove: (routeId: string) => void;
}

interface FavoriteRouteCardProps {
  id: string;
  originName: string;
  destinationName: string;
  onPress: (routeId: string) => void;
  onRemove: (routeId: string) => void;
}

const FavoriteRouteCard = memo(function FavoriteRouteCard({
  id,
  originName,
  destinationName,
  onPress,
  onRemove,
}: FavoriteRouteCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => onPress(id), [id, onPress]);
  const handleRemove = useCallback(() => onRemove(id), [id, onRemove]);

  return (
    <View style={styles.cardShell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('booking.favorites.openAccessibility', {
          origin: originName,
          destination: destinationName,
        })}
        onPress={handlePress}
        style={({ pressed }) => [styles.cardMain, pressed ? styles.pressed : null]}
      >
        <View style={styles.starBadge}>
          <Star size={17} color={theme.colors.warningForeground} weight="fill" />
        </View>
        <View style={styles.routeCopy}>
          <Text style={styles.routeText} numberOfLines={1}>{originName}</Text>
          <ArrowRight size={14} color={theme.colors.textTertiary} weight="bold" />
          <Text style={styles.routeText} numberOfLines={1}>{destinationName}</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('booking.favorites.removeAccessibility', {
          origin: originName,
          destination: destinationName,
        })}
        hitSlop={8}
        onPress={handleRemove}
        style={({ pressed }) => [styles.removeButton, pressed ? styles.pressed : null]}
      >
        <Star size={16} color={theme.colors.warningForeground} weight="fill" />
      </Pressable>
    </View>
  );
});

const keyExtractor = (item: FavoriteRoute): string => item.id;

export const FavoriteRoutesSection = memo(function FavoriteRoutesSection({
  routes,
  onRoutePress,
  onRemove,
}: FavoriteRoutesSectionProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { fontScale } = useWindowDimensions();
  const listFrameStyle = useMemo(
    () => ({ height: Math.ceil(88 * Math.max(1, fontScale)) }),
    [fontScale],
  );
  const renderItem = useCallback(({ item }: ListRenderItemInfo<FavoriteRoute>) => (
    <FavoriteRouteCard
      id={item.id}
      originName={item.originName}
      destinationName={item.destinationName}
      onPress={onRoutePress}
      onRemove={onRemove}
    />
  ), [onRemove, onRoutePress]);

  if (routes.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headingBlock}>
        <Text style={styles.sectionTitle}>{t('booking.favorites.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('booking.favorites.subtitle')}</Text>
      </View>
      <View style={[styles.listFrame, listFrameStyle]}>
        <FlashList
          horizontal
          data={routes as FavoriteRoute[]}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  section: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  headingBlock: {
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
  listFrame: {
    marginHorizontal: -spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
  },
  cardShell: {
    width: 254,
    minHeight: 72,
    marginRight: spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    overflow: 'hidden' as const,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
    backgroundColor: theme.effects.contentSurface,
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingVertical: spacing.md,
  },
  starBadge: {
    width: 34,
    height: 34,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.warningLight,
  },
  routeCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  routeText: {
    flexShrink: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  removeButton: {
    width: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.warningLight,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
});
