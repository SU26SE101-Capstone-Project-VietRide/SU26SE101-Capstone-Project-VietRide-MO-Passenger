import React, { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowRight, ClockCounterClockwise, X } from 'phosphor-react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';

import type { RecentSearch } from '../hooks/useRecentSearches';
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
}

interface RecentSearchCardProps {
  id: string;
  fromName: string;
  toName: string;
  date: string;
  passengers: number;
  onPress: (id: string) => void;
}

const RecentSearchCard = memo(function RecentSearchCardComponent({
  id,
  fromName,
  toName,
  date,
  passengers,
  onPress,
}: RecentSearchCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => onPress(id), [id, onPress]);

  return (
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
  );
});

const keyExtractor = (item: RecentSearch): string => item.id;

export const RecentSearchesSection = memo(function RecentSearchesSectionComponent({
  searches,
  error,
  isLoading = false,
  onSearchPress,
  onClear,
}: RecentSearchesSectionProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { fontScale } = useWindowDimensions();
  const listFrameStyle = useMemo(
    () => ({ height: Math.ceil(96 * Math.max(1, fontScale)) }),
    [fontScale],
  );
  const renderItem = useCallback(({ item }: ListRenderItemInfo<RecentSearch>) => (
    <RecentSearchCard
      id={item.id}
      fromName={item.fromName}
      toName={item.toName}
      date={item.date}
      passengers={item.passengers}
      onPress={onSearchPress}
    />
  ), [onSearchPress]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{t('booking.recentSearches.title')}</Text>
        {searches.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('booking.recentSearches.clearAccessibility')}
            onPress={onClear}
            style={styles.clearButton}
          >
            <X size={14} color={theme.colors.textSecondary} />
            <Text style={styles.clearText}>{t('booking.recentSearches.clear')}</Text>
          </Pressable>
        ) : null}
      </View>
      {isLoading ? (
        <View
          style={[styles.stateBox, listFrameStyle]}
          accessibilityLabel={t('booking.recentSearches.loadingAccessibility')}
        >
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateText}>{t('booking.recentSearches.loading')}</Text>
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
    minHeight: 32,
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
  card: {
    width: 260,
    minHeight: 78,
    marginRight: spacing.md,
    padding: spacing.md,
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.contentSurface,
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
