/**
 * BusSearchScreen — Landing screen of the booking flow
 *
 * Features: From/To inputs with swap, date & passenger pickers,
 * "Search Buses" CTA, Popular Routes, Recent Searches.
 *
 * Refactored: shared SearchForm, RouteCard, RecentSearchCard extracted.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { AmbientGlow, AppHeader, SearchForm, RouteCard, RecentSearchCard } from '../components';
import { useBookingStore } from '../store/useBookingStore';
import { MOCK_POPULAR_ROUTES, MOCK_RECENT_SEARCHES } from '../data/mockData';
import type { BookingStackParamList } from '@app/navigation/types';

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

export function BusSearchScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const { searchParams, swapCities } = useBookingStore();

  const handleSearch = useCallback(() => {
    navigation.navigate('RouteResults', {
      departureId: searchParams.from || 'Hanoi',
      destinationId: searchParams.to || 'Sapa',
      date: searchParams.date,
    });
  }, [navigation, searchParams]);

  const renderRouteItem = ({ item }: { item: RouteItem }) => (
    <RouteCard from={item.from} to={item.to} price={item.price} />
  );

  const renderRecentItem = ({ item }: { item: RecentItem }) => (
    <RecentSearchCard route={item.route} date={item.date} />
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <AmbientGlow />

      <AppHeader
        title="Buy Tickets"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <View style={styles.greetingText}>
            <Text style={styles.greetingHeadline}>Hello! 👋</Text>
            <Text style={styles.greetingSubtitle}>
              Where are we speeding{'\n'}off to today?
            </Text>
          </View>
          <View style={styles.avatarPlaceholder} />
        </View>

        {/* Search Form — extracted component */}
        <SearchForm
          from={searchParams.from}
          to={searchParams.to}
          date={searchParams.date}
          passengers={searchParams.passengers}
          onFromPress={() => {}}
          onToPress={() => {}}
          onDatePress={() => {}}
          onPassengersPress={() => {}}
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

        <FlatList<RouteItem>
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MOCK_POPULAR_ROUTES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.horizontalList}
          scrollEnabled={false}
          renderItem={renderRouteItem}
        />

        {/* Recent Searches */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>
          Recent Searches
        </Text>

        <FlatList<RecentItem>
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MOCK_RECENT_SEARCHES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.horizontalList}
          scrollEnabled={false}
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
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  greetingText: {
    flex: 1,
  },
  greetingHeadline: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  greetingSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    lineHeight: fontSizes.lg * 1.5,
  },
  avatarPlaceholder: {
    width: 121,
    height: 121,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceAlt,
    marginLeft: spacing.lg,
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
