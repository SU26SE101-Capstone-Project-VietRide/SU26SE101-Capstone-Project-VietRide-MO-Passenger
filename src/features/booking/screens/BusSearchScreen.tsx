/**
 * BusSearchScreen — Landing screen of the booking flow
 *
 * Features: From/To inputs with swap, date & passenger pickers,
 * "Search Buses" CTA, Popular Routes, Recent Searches.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { AmbientGlow, SearchForm, RouteCard, RecentSearchCard } from '../components';
import { useBookingStore } from '../store/useBookingStore';
import { MOCK_POPULAR_ROUTES, MOCK_RECENT_SEARCHES } from '../data/mockData';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { BookingStackParamList } from '@app/navigation/types';
import { ProfileHeader } from '@shared/components';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'SearchRoutes'>;

interface RouteItem {
  id: string;
  from: string;
  to: string;
  price: string;
}

interface RecentItem {
  id: string;
  route: string;
  date: string;
}

const parseRouteString = (route: string): { from: string; to: string } => {
  const parts = route.split(/\s+to\s+/i);
  return { from: parts[0]?.trim() || '', to: parts[1]?.trim() || '' };
};

export function BusSearchScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const user = useAuthStore((state) => state.user);
  const fullName = user?.fullName || 'Viết Thông';
  const { searchParams, swapCities, setSearchParams } = useBookingStore();

  const handleSearch = useCallback(() => {
    navigation.navigate('RouteResults', {
      departureId: searchParams.from || 'Hanoi',
      destinationId: searchParams.to || 'Sapa',
      date: searchParams.date,
    });
  }, [navigation, searchParams]);

  const navigateToRoute = useCallback(
    (from: string, to: string, date?: string) => {
      setSearchParams({ from, to, date: date || searchParams.date });
      navigation.navigate('RouteResults', {
        departureId: from,
        destinationId: to,
        date: date || searchParams.date,
      });
    },
    [navigation, setSearchParams, searchParams.date],
  );

  const handlePopularPress = useCallback(
    (item: { from: string; to: string }) => {
      navigateToRoute(item.from, item.to);
    },
    [navigateToRoute],
  );

  const handleRecentPress = useCallback(
    (item: { route: string; date: string }) => {
      const { from, to } = parseRouteString(item.route);
      navigateToRoute(from, to, item.date);
    },
    [navigateToRoute],
  );

  // Picker callbacks
  const openCityPicker = useCallback(
    (mode: 'from' | 'to') => {
      navigation.navigate('CityPicker', { mode });
    },
    [navigation],
  );

  const openDatePicker = useCallback(() => {
    navigation.navigate('DatePicker');
  }, [navigation]);

  const openPassengersPicker = useCallback(() => {
    navigation.navigate('PassengersPicker', {
      current: typeof searchParams.passengers === 'number' ? searchParams.passengers : 1,
    });
  }, [navigation, searchParams.passengers]);

  const renderRouteItem = ({ item }: { item: RouteItem }) => (
    <RouteCard
      from={item.from}
      to={item.to}
      price={item.price}
      onPress={() => handlePopularPress(item)}
    />
  );

  const renderRecentItem = ({ item }: { item: RecentItem }) => (
    <RecentSearchCard
      route={item.route}
      date={item.date}
      onPress={() => handleRecentPress(item)}
    />
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <AmbientGlow />

      <ProfileHeader
        userName={fullName}
        greeting="Xin chào,"
        onNotificationPress={() => {}}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Form — with real picker callbacks */}
        <SearchForm
          from={searchParams.from}
          to={searchParams.to}
          date={searchParams.date}
          passengers={searchParams.passengers}
          onFromPress={() => openCityPicker('from')}
          onToPress={() => openCityPicker('to')}
          onDatePress={openDatePicker}
          onPassengersPress={openPassengersPicker}
          onSwapPress={swapCities}
          onSearchPress={handleSearch}
        />

        {/* Popular Routes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Routes</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See all →</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MOCK_POPULAR_ROUTES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.horizontalList}
          renderItem={renderRouteItem}
        />

        {/* Recent Searches */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>
          Recent Searches
        </Text>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MOCK_RECENT_SEARCHES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.horizontalList}
          renderItem={renderRecentItem}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#E6F4F3',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 100,
    zIndex: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  seeAllButton: {
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  horizontalList: {
    gap: spacing.lg,
    paddingRight: spacing.lg,
  },
});
