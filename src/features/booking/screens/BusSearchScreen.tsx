/** BusSearchScreen — Landing screen of the booking flow
 *
 * Visual style: matches Parcel home (gradient bg, mascot, mint palette, card surfaces)
 */

import React, { useCallback, useEffect } from 'react';
import { Alert, View, Text, ScrollView, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fontFamilies, spacing } from '@shared/theme';
import { ProfileHeader } from '@shared/components';
import { PopularRoutesSection, RecentSearchesSection, SearchForm } from '../components';
import { useBookingStore } from '../store/useBookingStore';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { BookingStackParamList } from '@app/navigation/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useShallow } from 'zustand/react/shallow';
import { useBookingDiscovery } from '../hooks/useBookingDiscovery';
import {
  DEFAULT_BOOKING_ENTRY_INTENT,
  initializeBookingEntry,
} from '../utils/bookingDiscovery';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'SearchRoutes'>;
type SearchRouteProp = RouteProp<BookingStackParamList, 'SearchRoutes'>;

const catMascotImage = require('@assets/images/image 1.png');

export function BusSearchScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<SearchRouteProp>();
  const user = useAuthStore((state) => state.user);
  const {
    searchParams,
    swapCities,
    setSearchParams,
    resetFlowPreservingSearch,
    setVoucherCode,
  } = useBookingStore(useShallow((state) => ({
    searchParams: state.searchParams,
    swapCities: state.swapCities,
    setSearchParams: state.setSearchParams,
    resetFlowPreservingSearch: state.resetFlowPreservingSearch,
    setVoucherCode: state.setVoucherCode,
  })));
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const {
    popularRoutes,
    popularRoutesLoading,
    popularRoutesError,
    recentSearches,
    recentSearchError,
    recentSearchesLoading,
    applyPopularRoute,
    applyRecentSearch,
    saveCurrentSearch,
    clearRecentSearches,
  } = useBookingDiscovery();
  const isSearchDisabled = !searchParams.originLocationCode
    || !searchParams.destinationLocationCode
    || searchParams.originLocationCode === searchParams.destinationLocationCode
    || !searchParams.date;
  const entryIntent = route.params?.intent ?? DEFAULT_BOOKING_ENTRY_INTENT;

  useEffect(() => {
    initializeBookingEntry(entryIntent, {
      resetFlowPreservingSearch,
      setVoucherCode,
    });
  }, [entryIntent, resetFlowPreservingSearch, setVoucherCode]);

  const handleSearch = useCallback(() => {
    saveCurrentSearch().catch(() => undefined);
    navigation.navigate('CreateTicketBooking', { intent: entryIntent });
  }, [entryIntent, navigation, saveCurrentSearch]);

  const handlePopularRoutePress = useCallback((originCode: string, destinationCode: string) => {
    if (applyPopularRoute(originCode, destinationCode) !== 'applied') return;
    saveCurrentSearch().catch(() => undefined);
    navigation.navigate('CreateTicketBooking', { intent: entryIntent });
  }, [applyPopularRoute, entryIntent, navigation, saveCurrentSearch]);

  const handleRecentSearchPress = useCallback((searchId: string) => {
    const result = applyRecentSearch(searchId);
    if (result === 'applied') {
      navigation.navigate('CreateTicketBooking', { intent: entryIntent });
      return;
    }

    if (result === 'past_date' || result === 'invalid_date') {
      Alert.alert(
        t('booking.recentSearches.expiredDateTitle'),
        t('booking.recentSearches.expiredDateDescription'),
      );
    }
  }, [applyRecentSearch, entryIntent, navigation, t]);

  const handleViewAllPopularRoutes = useCallback(() => {
    navigation.navigate('PopularRoutes', { intent: entryIntent });
  }, [entryIntent, navigation]);

  const handleClearRecentSearches = useCallback(() => {
    clearRecentSearches().catch(() => undefined);
  }, [clearRecentSearches]);

  const openCityPicker = useCallback(
    (mode: 'from' | 'to') => {
      navigation.navigate('CityPicker', { mode });
    },
    [navigation],
  );

  const openDatePicker = useCallback(() => {
    navigation.navigate('DatePicker');
  }, [navigation]);

  const openOriginPicker = useCallback(() => openCityPicker('from'), [openCityPicker]);
  const openDestinationPicker = useCallback(() => openCityPicker('to'), [openCityPicker]);

  const handlePassengersChange = useCallback(
    (passengers: number) => {
      setSearchParams({ passengers });
    },
    [setSearchParams],
  );

  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="400" width="100%">
          <Defs>
            <LinearGradient id="busGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.primaryLight} stopOpacity={0.16} />
              <Stop offset="60%" stopColor={theme.colors.primaryLight} stopOpacity={0.04} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#busGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleTabBarScroll}
          scrollEventThrottle={16}
        >
          {/* Profile Header */}
          <ProfileHeader
            userName={user?.fullName}
            greeting={t('shared.profileHeader.greeting')}
            onNotificationPress={() => {}}
          />

          {/* Welcome section with mascot */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeTextColumn}>
              <Text style={styles.welcomeTitle}>{t('booking.home.welcome')}</Text>
              <Text style={styles.welcomeSubtitle}>{t('booking.home.question')}</Text>
            </View>
            <View style={styles.mascotContainer}>
              <Image
                accessibilityLabel={t('booking.home.mascotAccessibility')}
                source={catMascotImage}
                style={styles.mascotImage}
                contentFit="contain"
              />
            </View>
          </View>

          {/* Search Form */}
          <SearchForm
            from={searchParams.from}
            to={searchParams.to}
            date={searchParams.date}
            passengers={searchParams.passengers}
            onFromPress={openOriginPicker}
            onToPress={openDestinationPicker}
            onDatePress={openDatePicker}
            onPassengersChange={handlePassengersChange}
            onSwapPress={swapCities}
            onSearchPress={handleSearch}
            searchDisabled={isSearchDisabled}
          />

          <PopularRoutesSection
            routes={popularRoutes}
            isLoading={popularRoutesLoading}
            hasError={popularRoutesError}
            onRoutePress={handlePopularRoutePress}
            onViewAll={handleViewAllPopularRoutes}
          />

          <RecentSearchesSection
            searches={recentSearches}
            error={recentSearchError}
            isLoading={recentSearchesLoading}
            onSearchPress={handleRecentSearchPress}
            onClear={handleClearRecentSearches}
          />

          {/* Bottom spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
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
    color: theme.colors.textPrimary,
    lineHeight: 38,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 18,
    color: theme.colors.textSecondary,
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
  bottomSpacer: {
    height: 100,
  },
});
