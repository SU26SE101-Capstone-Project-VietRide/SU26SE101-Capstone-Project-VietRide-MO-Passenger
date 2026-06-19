import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft, MapPin, MagnifyingGlass, ArrowRight, Fire } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BookingStackParamList } from '@app/navigation/types';
import { MOCK_POPULAR_ROUTES } from '../data/mockData';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'PopularRoutes'>;

// Extended list of popular routes for a richer View All experience
const ALL_POPULAR_ROUTES = [
  ...MOCK_POPULAR_ROUTES,
  {
    id: 'route-3',
    from: 'Hanoi',
    to: 'Sapa',
    price: 'From 320k VND',
    gradientColors: ['#0A7EA4', '#2AC1BC'],
  },
  {
    id: 'route-4',
    from: 'HCMC',
    to: 'Da Lat',
    price: 'From 280k VND',
    gradientColors: ['#2AC1BC', '#38B2D8'],
  },
  {
    id: 'route-5',
    from: 'Da Nang',
    to: 'Hue',
    price: 'From 150k VND',
    gradientColors: ['#FF9F43', '#FF6B6B'],
  },
  {
    id: 'route-6',
    from: 'HCMC',
    to: 'Vung Tau',
    price: 'From 180k VND',
    gradientColors: ['#4E54C8', '#8F94FB'],
  },
  {
    id: 'route-7',
    from: 'Hanoi',
    to: 'Hai Phong',
    price: 'From 120k VND',
    gradientColors: ['#11998E', '#38EF7D'],
  },
  {
    id: 'route-8',
    from: 'Da Nang',
    to: 'Nha Trang',
    price: 'From 350k VND',
    gradientColors: ['#F857A6', '#FF5858'],
  },
];

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.xl * 2 - spacing.md) / 2;

export function PopularRoutesScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const { setSearchParams } = useBookingStore();
  const [query, setQuery] = useState('');
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_POPULAR_ROUTES;
    return ALL_POPULAR_ROUTES.filter(
      (route) =>
        route.from.toLowerCase().includes(q) || route.to.toLowerCase().includes(q)
    );
  }, [query]);

  const handleRoutePress = useCallback(
    (item: typeof ALL_POPULAR_ROUTES[0]) => {
      setSearchParams({ from: item.from, to: item.to });
      // Navigate to the next step in booking flow (DatePicker or CreateTicketBooking)
      navigation.navigate('CreateTicketBooking');
    },
    [navigation, setSearchParams]
  );

  const renderRouteCard = ({ item }: { item: typeof ALL_POPULAR_ROUTES[0] }) => {
    const startColor = item.gradientColors?.[0] || '#2AC1BC';
    const endColor = item.gradientColors?.[1] || '#2AC1BC';

    return (
      <Pressable
        onPress={() => handleRoutePress(item)}
        style={({ pressed }) => [styles.cardContainer, pressed ? styles.pressed : null]}
      >
        <View style={styles.cardGradientWrapper}>
          <Svg height="100" width="100%">
            <Defs>
              <LinearGradient id={`grad-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={startColor} stopOpacity={0.85} />
                <Stop offset="100%" stopColor={endColor} stopOpacity={0.55} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#grad-${item.id})`} />
          </Svg>
          <View style={styles.badge}>
            <Fire size={12} color={theme.colors.textInverse} weight="fill" />
            <Text style={styles.badgeText}>Popular</Text>
          </View>
          <View style={styles.cardIcon}>
            <MapPin size={24} color={theme.colors.textInverse} weight="bold" />
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.routeRow}>
            <Text style={styles.cityName} numberOfLines={1}>
              {item.from}
            </Text>
            <ArrowRight size={14} color={theme.colors.textSecondary} weight="bold" />
            <Text style={styles.cityName} numberOfLines={1}>
              {item.to}
            </Text>
          </View>
          <Text style={styles.priceText}>{item.price}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      {/* Decorative Mint Green Glow */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="popularGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.primaryLight} stopOpacity={theme.isDark ? 0.18 : 0.14} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#popularGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backBtn, pressed ? styles.pressed : null]}
          >
            <ArrowLeft size={20} color={theme.colors.primary} weight="bold" />
          </Pressable>
          <Text style={styles.headerTitle}>Popular Routes</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search bar */}
        <View style={styles.searchBox}>
          <MagnifyingGlass size={18} color={theme.colors.textTertiary} weight="bold" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search routes or cities..."
            placeholderTextColor={theme.colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>

        {/* Grid List */}
        <FlatList
          data={filteredRoutes}
          keyExtractor={(item) => item.id}
          renderItem={renderRouteCard}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No routes match your search</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    ...theme.components.headerButton,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.effects.isLiquid ? theme.effects.fieldSurface : theme.colors.surface,
    borderWidth: 1.2,
    borderColor: theme.effects.isLiquid ? theme.effects.fieldBorder : theme.colors.divider,
    ...theme.effects.cardShadow,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  listContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardContainer: {
    width: CARD_WIDTH,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    overflow: 'hidden',
    ...theme.effects.cardShadow,
  },
  cardGradientWrapper: {
    height: 100,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    gap: 4,
  },
  badgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.textInverse,
  },
  cardIcon: {
    position: 'absolute',
    alignSelf: 'center',
  },
  cardContent: {
    padding: spacing.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cityName: {
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  priceText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textTertiary,
  },
});
