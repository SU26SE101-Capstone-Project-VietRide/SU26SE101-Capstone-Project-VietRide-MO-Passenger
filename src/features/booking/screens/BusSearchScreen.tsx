/** BusSearchScreen — Landing screen of the booking flow
 *
 * Visual style: matches Parcel home (gradient bg, mascot, mint palette, card surfaces)
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, ArrowRight } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { ProfileHeader } from '@shared/components';
import { SearchForm, RouteCard, RecentSearchCard } from '../components';
import { useBookingStore } from '../store/useBookingStore';
import { MOCK_POPULAR_ROUTES, MOCK_RECENT_SEARCHES } from '../data/mockData';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { BookingStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'SearchRoutes'>;

const catMascotImage = require('@assets/images/image 1.png');

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
      const parts = item.route.split(/\s+to\s+/i);
      const from = parts[0]?.trim() || '';
      const to = parts[1]?.trim() || '';
      navigateToRoute(from, to, item.date);
    },
    [navigateToRoute],
  );

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

  const renderRouteItem = ({ item }: { item: { id: string; from: string; to: string; price: string } }) => (
    <RouteCard from={item.from} to={item.to} price={item.price} onPress={() => handlePopularPress(item)} />
  );

  const renderRecentItem = ({ item }: { item: { id: string; route: string; date: string } }) => (
    <RecentSearchCard route={item.route} date={item.date} onPress={() => handleRecentPress(item)} />
  );

  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="400" width="100%">
          <Defs>
            <LinearGradient id="busGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.12} />
              <Stop offset="60%" stopColor="#2AC1BC" stopOpacity={0.04} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#busGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header */}
          <ProfileHeader
            userName={fullName}
            greeting="Xin chào,"
            onNotificationPress={() => {}}
          />

          {/* Welcome section with mascot */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeTextColumn}>
              <Text style={styles.welcomeTitle}>Hello! 👋</Text>
              <Text style={styles.welcomeSubtitle}>Where are we going today?</Text>
            </View>
            <View style={styles.mascotContainer}>
              <Image source={catMascotImage} style={styles.mascotImage} resizeMode="contain" />
            </View>
          </View>

          {/* Search Form */}
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
            <TouchableOpacity activeOpacity={0.6}>
              <Text style={styles.viewAllText}>See all</Text>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
          </View>

          <View style={styles.recentList}>
            {MOCK_RECENT_SEARCHES.map((item) => (
              <RecentSearchCard
                key={item.id}
                route={item.route}
                date={item.date}
                onPress={() => handleRecentPress(item)}
              />
            ))}
          </View>

          {/* Bottom spacer */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E6F4F3',
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    zIndex: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 100,
    zIndex: 5,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.lg,
    paddingRight: spacing.xs,
  },
  welcomeTextColumn: {
    flex: 1.4,
  },
  welcomeTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 34,
    color: colors.textPrimary,
    lineHeight: 38,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 18,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  mascotContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  mascotImage: {
    width: 96,
    height: 96,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  viewAllText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  horizontalList: {
    gap: spacing.lg,
    paddingRight: spacing.lg,
  },
  recentList: {
    gap: spacing.sm,
  },
});
