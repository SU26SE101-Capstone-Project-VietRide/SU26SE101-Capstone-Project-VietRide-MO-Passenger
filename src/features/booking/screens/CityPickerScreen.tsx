/** CityPicker — chọn thành phố (dùng cho From và To).
 * Chọn xong set vào Zustand store rồi goBack về BusSearchScreen.
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft, Bus, MapPin, MagnifyingGlass } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { BookingStackParamList } from '@app/navigation/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { RouteProp } from '@react-navigation/native';
import { useLocations } from '@features/location/hooks/useLocations';
import type { Location } from '@features/location/types/location';
import { normalizeLocationSearchText } from '../utils/searchParams';
import { useStationSearch } from '@features/trip/hooks/useStationSearch';
import type { StationSearchResult } from '@features/trip/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'CityPicker'>;
type CityPickerRouteProp = RouteProp<BookingStackParamList, 'CityPicker'>;

const locationKeyExtractor = (item: Location) => item.id;
const stationKeyExtractor = (item: StationSearchResult) => item.id;

export function CityPickerScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<CityPickerRouteProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { searchParams, setSearchParams } = useBookingStore();
  const { data: locations = [], isLoading, isError, isFetching, refetch } = useLocations();
  const mode = route.params.mode;
  const [query, setQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [debouncedStationQuery, setDebouncedStationQuery] = useState('');
  const {
    data: stations = [],
    isLoading: isLoadingStations,
    isError: isStationError,
    isFetching: isFetchingStations,
    refetch: refetchStations,
  } = useStationSearch(selectedLocation, debouncedStationQuery);
  const isDebouncingStationSearch = Boolean(
    selectedLocation
    && query.trim()
    && query.trim() !== debouncedStationQuery,
  );
  const visibleStations = isDebouncingStationSearch ? [] : stations;
  const oppositeLocationCode = mode === 'from'
    ? searchParams.destinationLocationCode
    : searchParams.originLocationCode;
  const oppositeStationId = mode === 'from'
    ? searchParams.destinationStationId
    : searchParams.originStationId;

  useEffect(() => {
    if (!selectedLocation || !query.trim()) {
      setDebouncedStationQuery('');
      return;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedStationQuery(query.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedLocation]);

  const filteredLocations = useMemo(() => {
    const activeLocations = locations.filter((location) => location.isActive);
    const normalizedQuery = normalizeLocationSearchText(query);
    if (!normalizedQuery) {
      return activeLocations;
    }

    return activeLocations.filter((location) => {
      return normalizeLocationSearchText(location.name).includes(normalizedQuery)
        || normalizeLocationSearchText(location.code).includes(normalizedQuery);
    });
  }, [locations, query]);

  const onSelectLocation = useCallback(
    (location: Location) => {
      if (location.code === oppositeLocationCode) {
        return;
      }

      if (mode === 'from') {
        setSearchParams({
          from: location.name,
          originLocationCode: location.code,
          originStationId: '',
          originStationName: '',
        });
      } else {
        setSearchParams({
          to: location.name,
          destinationLocationCode: location.code,
          destinationStationId: '',
          destinationStationName: '',
        });
      }
      setSelectedLocation(location);
      setQuery('');
    },
    [mode, oppositeLocationCode, setSearchParams],
  );

  const onSelectStation = useCallback(
    (station: StationSearchResult) => {
      if (!selectedLocation || station.id === oppositeStationId) {
        return;
      }

      if (mode === 'from') {
        setSearchParams({
          from: selectedLocation.name,
          originLocationCode: selectedLocation.code,
          originStationId: station.id,
          originStationName: station.name,
        });
      } else {
        setSearchParams({
          to: selectedLocation.name,
          destinationLocationCode: selectedLocation.code,
          destinationStationId: station.id,
          destinationStationName: station.name,
        });
      }
      navigation.goBack();
    },
    [mode, navigation, oppositeStationId, selectedLocation, setSearchParams],
  );

  const onSelectAnyStation = useCallback(() => {
    if (!selectedLocation) {
      return;
    }

    if (mode === 'from') {
      setSearchParams({
        from: selectedLocation.name,
        originLocationCode: selectedLocation.code,
        originStationId: '',
        originStationName: '',
      });
    } else {
      setSearchParams({
        to: selectedLocation.name,
        destinationLocationCode: selectedLocation.code,
        destinationStationId: '',
        destinationStationName: '',
      });
    }
    navigation.goBack();
  }, [mode, navigation, selectedLocation, setSearchParams]);

  const renderLocation = useCallback(
    ({ item }: { item: Location }) => {
      const isUnavailable = item.code === oppositeLocationCode;
      const typeLabel = item.type === 'MUNICIPALITY' ? 'Municipality' : 'Province';

      return (
        <Pressable
          style={({ pressed }) => [
            styles.item,
            isUnavailable ? styles.itemDisabled : null,
            pressed && !isUnavailable ? styles.pressed : null,
          ]}
          onPress={() => onSelectLocation(item)}
          disabled={isUnavailable}
          accessibilityRole="button"
          accessibilityState={{ disabled: isUnavailable }}
        >
          <View style={styles.itemIcon}>
            <MapPin size={16} color={theme.colors.primary} weight="fill" />
          </View>
          <View style={styles.itemTextWrap}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemRegion}>
              {isUnavailable ? 'Already selected' : `${typeLabel} - ${item.code}`}
            </Text>
          </View>
          <View style={styles.itemArrow}>
            <ArrowLeft
              size={16}
              color={theme.colors.textTertiary}
              weight="bold"
              style={styles.arrowForward}
            />
          </View>
        </Pressable>
      );
    },
    [
      onSelectLocation,
      oppositeLocationCode,
      styles,
      theme.colors.primary,
      theme.colors.textTertiary,
    ],
  );

  const renderStation = useCallback(
    ({ item }: { item: StationSearchResult }) => {
      const isUnavailable = item.id === oppositeStationId;
      const address = item.addressStreet
        || [item.city, item.province].filter(Boolean).join(', ');

      return (
        <Pressable
          style={({ pressed }) => [
            styles.item,
            isUnavailable ? styles.itemDisabled : null,
            pressed && !isUnavailable ? styles.pressed : null,
          ]}
          onPress={() => onSelectStation(item)}
          disabled={isUnavailable}
          accessibilityRole="button"
          accessibilityState={{ disabled: isUnavailable }}
        >
          <View style={styles.itemIcon}>
            <Bus size={16} color={theme.colors.primary} weight="fill" />
          </View>
          <View style={styles.itemTextWrap}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemRegion} numberOfLines={1}>
              {isUnavailable ? 'Already selected' : address}
            </Text>
          </View>
          <View style={styles.itemArrow}>
            <ArrowLeft
              size={16}
              color={theme.colors.textTertiary}
              weight="bold"
              style={styles.arrowForward}
            />
          </View>
        </Pressable>
      );
    },
    [
      onSelectStation,
      oppositeStationId,
      styles,
      theme.colors.primary,
      theme.colors.textTertiary,
    ],
  );

  const locationEmptyState = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.empty}>Loading provinces and cities...</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.empty}>Could not load locations.</Text>
          <Pressable
            onPress={() => refetch()}
            disabled={isFetching}
            style={({ pressed }) => [
              styles.retryButton,
              pressed ? styles.pressed : null,
            ]}
          >
            {isFetching ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.retryText}>Try again</Text>
            )}
          </Pressable>
        </View>
      );
    }

    return <Text style={styles.empty}>No matching locations found.</Text>;
  }, [
    isError,
    isFetching,
    isLoading,
    refetch,
    styles,
    theme.colors.primary,
    theme.colors.textInverse,
  ]);

  const stationEmptyState = useMemo(() => {
    if (!query.trim()) {
      return (
        <Text style={styles.empty}>
          Type a station name to search, or choose any station above.
        </Text>
      );
    }

    if (isDebouncingStationSearch || isLoadingStations) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.empty}>Searching stations...</Text>
        </View>
      );
    }

    if (isStationError) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.empty}>Could not load stations.</Text>
          <Pressable
            onPress={() => refetchStations()}
            disabled={isFetchingStations}
            style={({ pressed }) => [
              styles.retryButton,
              pressed ? styles.pressed : null,
            ]}
          >
            {isFetchingStations ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.retryText}>Try again</Text>
            )}
          </Pressable>
        </View>
      );
    }

    return (
      <Text style={styles.empty}>
        No matching stations found.
      </Text>
    );
  }, [
    isFetchingStations,
    isDebouncingStationSearch,
    isLoadingStations,
    isStationError,
    query,
    refetchStations,
    styles,
    theme.colors.primary,
    theme.colors.textInverse,
  ]);

  const handleBack = useCallback(() => {
    if (selectedLocation) {
      setSelectedLocation(null);
      setQuery('');
      return;
    }
    navigation.goBack();
  }, [navigation, selectedLocation]);

  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="cityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.primaryLight} stopOpacity={theme.isDark ? 0.18 : 0.12} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#cityGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Header with back bubble */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, pressed ? styles.pressed : null]}
          >
            <View style={styles.backBubble}>
              <ArrowLeft size={20} color={theme.colors.primary} weight="bold" />
            </View>
          </Pressable>
          <Text style={styles.headerTitle}>
            {selectedLocation
              ? mode === 'from' ? 'Departure Station' : 'Destination Station'
              : mode === 'from' ? 'Departure Province' : 'Destination Province'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search box */}
        <View style={styles.searchBox}>
          <MagnifyingGlass size={16} color={theme.colors.textTertiary} weight="bold" />
          <TextInput
            style={styles.searchInput}
            placeholder={selectedLocation
              ? `Search stations in ${selectedLocation.name}...`
              : 'Search province or city...'}
            placeholderTextColor={theme.colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
        </View>

        {selectedLocation ? (
          <>
            <Pressable
              onPress={onSelectAnyStation}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.anyStationButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.itemIcon}>
                <MapPin size={16} color={theme.colors.primary} weight="fill" />
              </View>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemName}>Any station in {selectedLocation.name}</Text>
                <Text style={styles.itemRegion}>Show trips from every station</Text>
              </View>
            </Pressable>
            <FlatList
              data={visibleStations}
              keyExtractor={stationKeyExtractor}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={renderStation}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={stationEmptyState}
            />
          </>
        ) : (
          <FlatList
            data={filteredLocations}
            keyExtractor={locationKeyExtractor}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={renderLocation}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={locationEmptyState}
          />
        )}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    ...theme.effects.cardShadow,
  },
  backBubble: {
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.effects.isLiquid ? theme.effects.fieldSurface : theme.colors.surface,
    borderWidth: 1.2,
    borderColor: theme.effects.isLiquid ? theme.effects.fieldBorder : theme.colors.divider,
    ...theme.effects.cardShadow,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  anyStationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  itemRegion: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  itemArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  stateContainer: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  retryButton: {
    minWidth: 112,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  arrowForward: {
    transform: [{ rotate: '180deg' }],
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
