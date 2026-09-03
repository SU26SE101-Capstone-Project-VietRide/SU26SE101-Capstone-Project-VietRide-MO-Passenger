import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, MagnifyingGlass, MapPin, Star, X } from 'phosphor-react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { BookingStackParamList } from '@app/navigation/types';
import { normalizeLocationSearchText } from '@features/location/utils/locationSearch';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { showSnackbar } from '@shared/store/useSnackbarStore';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import type { PopularRouteShortcut } from '../data/popularRoutes';
import { useBookingDiscovery } from '../hooks/useBookingDiscovery';
import { favoriteRouteId } from '../hooks/useFavoriteRoutes';
import { DEFAULT_BOOKING_ENTRY_INTENT } from '../utils/bookingDiscovery';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'PopularRoutes'>;
type PopularRoutesRouteProp = RouteProp<BookingStackParamList, 'PopularRoutes'>;

interface PopularRouteRowProps {
  destinationCode: string;
  destinationName: string;
  isFavorite: boolean;
  onPress: (originCode: string, destinationCode: string) => void;
  onToggleFavorite: (
    originCode: string,
    originName: string,
    destinationCode: string,
    destinationName: string,
  ) => void;
  originCode: string;
  originName: string;
}

const PopularRouteRow = memo(function PopularRouteRowComponent({
  destinationCode,
  destinationName,
  isFavorite,
  onPress,
  onToggleFavorite,
  originCode,
  originName,
}: PopularRouteRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => {
    onPress(originCode, destinationCode);
  }, [destinationCode, onPress, originCode]);
  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite(originCode, originName, destinationCode, destinationName);
  }, [destinationCode, destinationName, onToggleFavorite, originCode, originName]);

  return (
    <View style={styles.routeCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('booking.routes.routeAccessibility', {
          origin: originName,
          destination: destinationName,
        })}
        onPress={handlePress}
        style={({ pressed }) => [styles.routeMain, pressed ? styles.pressed : null]}
      >
        <View style={styles.routeIcon}>
          <MapPin size={20} color={theme.colors.primary} weight="fill" />
        </View>
        <View style={styles.routeCopy}>
          <Text style={styles.routeName} numberOfLines={1}>{originName}</Text>
          <Text style={styles.routeHint} numberOfLines={1}>
            {t('booking.routes.toDestination', { destination: destinationName })}
          </Text>
        </View>
        <ArrowRight size={18} color={theme.colors.textTertiary} weight="bold" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(
          isFavorite
            ? 'booking.favorites.removeAccessibility'
            : 'booking.favorites.addAccessibility',
          { origin: originName, destination: destinationName },
        )}
        accessibilityState={{ selected: isFavorite }}
        hitSlop={6}
        onPress={handleToggleFavorite}
        style={({ pressed }) => [styles.favoriteButton, pressed ? styles.pressed : null]}
      >
        <Star
          size={19}
          color={isFavorite ? theme.colors.warningForeground : theme.colors.textTertiary}
          weight={isFavorite ? 'fill' : 'regular'}
        />
      </Pressable>
    </View>
  );
});

const keyExtractor = (item: PopularRouteShortcut): string => item.id;

export function PopularRoutesScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<PopularRoutesRouteProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState('');
  const {
    popularRoutes,
    popularRoutesLoading,
    popularRoutesError,
    favoriteRoutes,
    applyPopularRoute,
    toggleFavoriteRoute,
  } = useBookingDiscovery();
  const favoriteRouteIds = useMemo(
    () => new Set(favoriteRoutes.map(item => item.id)),
    [favoriteRoutes],
  );

  const filteredRoutes = useMemo(() => {
    const normalizedQuery = normalizeLocationSearchText(query);
    if (!normalizedQuery) return popularRoutes;

    return popularRoutes.filter((routeItem) => (
      normalizeLocationSearchText(routeItem.originName).includes(normalizedQuery)
      || normalizeLocationSearchText(routeItem.destinationName).includes(normalizedQuery)
    ));
  }, [popularRoutes, query]);

  const handleRoutePress = useCallback((originCode: string, destinationCode: string) => {
    if (applyPopularRoute(originCode, destinationCode) !== 'applied') return;
    navigation.navigate('DatePicker', {
      mode: 'departure',
      next: 'search',
      intent: route.params?.intent ?? DEFAULT_BOOKING_ENTRY_INTENT,
    });
  }, [applyPopularRoute, navigation, route.params?.intent]);

  const handleToggleFavorite = useCallback((
    originCode: string,
    originName: string,
    destinationCode: string,
    destinationName: string,
  ) => {
    toggleFavoriteRoute({
      originCode,
      originName,
      destinationCode,
      destinationName,
    }).then(result => {
      if (result === 'invalid') return;
      if (result === 'storage_error') {
        showSnackbar({ message: t('booking.favorites.storageError'), tone: 'error' });
        return;
      }
      showSnackbar({
        message: result === 'added'
          ? t('booking.favorites.saved')
          : t('booking.favorites.removed'),
        tone: result === 'added' ? 'success' : 'neutral',
      });
    });
  }, [t, toggleFavoriteRoute]);

  const renderRoute = useCallback(({ item }: ListRenderItemInfo<PopularRouteShortcut>) => (
    <PopularRouteRow
      destinationCode={item.destinationCode}
      destinationName={item.destinationName}
      isFavorite={favoriteRouteIds.has(favoriteRouteId(item.originCode, item.destinationCode))}
      onPress={handleRoutePress}
      onToggleFavorite={handleToggleFavorite}
      originCode={item.originCode}
      originName={item.originName}
    />
  ), [favoriteRouteIds, handleRoutePress, handleToggleFavorite]);

  const emptyMessage = popularRoutesLoading
    ? t('booking.routes.finding')
    : popularRoutesError
      ? t('booking.routes.unavailableLater')
      : query.trim()
        ? t('booking.routes.noSearchMatches')
        : t('booking.routes.areaEmpty');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={navigation.goBack}
          style={({ pressed }) => [styles.headerButton, pressed ? styles.pressed : null]}
        >
          <ArrowLeft size={20} color={theme.colors.primary} weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('booking.routes.popularTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBox}>
        <MagnifyingGlass size={18} color={theme.colors.textTertiary} weight="bold" />
        <TextInput
          accessibilityLabel={t('booking.routes.searchAccessibility')}
          style={styles.searchInput}
          placeholder={t('booking.routes.searchPlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.clear')}
            hitSlop={8}
            onPress={() => setQuery('')}
            style={({ pressed }) => pressed ? styles.pressed : null}
          >
            <X size={17} color={theme.colors.textSecondary} weight="bold" />
          </Pressable>
        ) : null}
      </View>

      <FlashList
        data={filteredRoutes}
        keyExtractor={keyExtractor}
        renderItem={renderRoute}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={popularRoutesLoading ? (
          <View
            style={styles.skeletonList}
            accessibilityRole="summary"
            accessibilityLabel={t('booking.routes.loadingAccessibility')}
          >
            {[0, 1, 2, 3].map(index => (
              <View key={index} style={styles.skeletonCard}>
                <View style={[styles.skeletonBlock, styles.skeletonIcon]} />
                <View style={styles.skeletonCopy}>
                  <View style={[styles.skeletonBlock, styles.skeletonTitle]} />
                  <View style={[styles.skeletonBlock, styles.skeletonSubtitle]} />
                </View>
                <View style={[styles.skeletonBlock, styles.skeletonAction]} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerButton: {
    ...theme.components.headerButton,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  headerSpacer: {
    width: 44,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: theme.effects.fieldBorder,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.fieldSurface,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  routeCard: {
    minHeight: 80,
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.contentBorderStrong,
    borderRadius: borderRadius.xl,
    backgroundColor: theme.effects.contentSurfaceElevated,
    overflow: 'hidden' as const,
  },
  routeMain: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.md,
  },
  favoriteButton: {
    width: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderLeftWidth: 1,
    borderLeftColor: theme.effects.contentBorder,
  },
  routeIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  routeCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  routeName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  routeHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  skeletonList: { gap: spacing.md },
  skeletonCard: {
    minHeight: 80,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  skeletonBlock: {
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.skeleton,
  },
  skeletonIcon: { width: 42, height: 42, borderRadius: borderRadius.full },
  skeletonCopy: { flex: 1, gap: spacing.sm },
  skeletonTitle: { width: '54%' as const, height: 15 },
  skeletonSubtitle: { width: '72%' as const, height: 12 },
  skeletonAction: { width: 20, height: 20, borderRadius: borderRadius.full },
  emptyState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    color: theme.colors.textSecondary,
  },
  pressed: {
    opacity: 0.82,
  },
});
