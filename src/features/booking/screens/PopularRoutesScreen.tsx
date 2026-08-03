import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, MagnifyingGlass, MapPin } from 'phosphor-react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { BookingStackParamList } from '@app/navigation/types';
import { normalizeLocationSearchText } from '@features/location/utils/locationSearch';
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
import { useBookingDiscovery } from '../hooks/useBookingDiscovery';
import { DEFAULT_BOOKING_ENTRY_INTENT } from '../utils/bookingDiscovery';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'PopularRoutes'>;
type PopularRoutesRouteProp = RouteProp<BookingStackParamList, 'PopularRoutes'>;

interface PopularRouteRowProps {
  route: PopularRouteShortcut;
  onPress: (originCode: string, destinationCode: string) => void;
}

const PopularRouteRow = memo(function PopularRouteRowComponent({
  route,
  onPress,
}: PopularRouteRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => {
    onPress(route.originCode, route.destinationCode);
  }, [onPress, route.destinationCode, route.originCode]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('booking.routes.routeAccessibility', {
        origin: route.originName,
        destination: route.destinationName,
      })}
      onPress={handlePress}
      style={({ pressed }) => [styles.routeCard, pressed ? styles.pressed : null]}
    >
      <View style={styles.routeIcon}>
        <MapPin size={20} color={theme.colors.primary} weight="fill" />
      </View>
      <View style={styles.routeCopy}>
        <Text style={styles.routeName} numberOfLines={1}>{route.originName}</Text>
        <Text style={styles.routeHint}>
          {t('booking.routes.toDestination', { destination: route.destinationName })}
        </Text>
      </View>
      <ArrowRight size={18} color={theme.colors.textTertiary} weight="bold" />
    </Pressable>
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
    applyPopularRoute,
    saveCurrentSearch,
  } = useBookingDiscovery();

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
    saveCurrentSearch().catch(() => undefined);
    navigation.navigate('CreateTicketBooking', {
      intent: route.params?.intent ?? DEFAULT_BOOKING_ENTRY_INTENT,
    });
  }, [applyPopularRoute, navigation, route.params?.intent, saveCurrentSearch]);

  const renderRoute = useCallback(({ item }: ListRenderItemInfo<PopularRouteShortcut>) => (
    <PopularRouteRow route={item} onPress={handleRoutePress} />
  ), [handleRoutePress]);

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
      </View>

      <FlashList
        data={filteredRoutes}
        keyExtractor={keyExtractor}
        renderItem={renderRoute}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
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
    width: 40,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.contentBorderStrong,
    borderRadius: borderRadius.xl,
    backgroundColor: theme.effects.contentSurfaceElevated,
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
