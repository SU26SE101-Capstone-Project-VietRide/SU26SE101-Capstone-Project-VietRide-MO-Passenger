/** BusSearchScreen — Landing screen of the booking flow
 *
 * Visual style: matches Parcel home (gradient bg, mascot, mint palette, card surfaces)
 */

import React, { useCallback } from 'react';
import { View, Text, ScrollView, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fontFamilies, spacing } from '@shared/theme';
import { ProfileHeader } from '@shared/components';
import { SearchForm } from '../components';
import { useBookingStore } from '../store/useBookingStore';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { BookingStackParamList } from '@app/navigation/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useShallow } from 'zustand/react/shallow';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'SearchRoutes'>;

const catMascotImage = require('@assets/images/image 1.png');

export function BusSearchScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const user = useAuthStore((state) => state.user);
  const { searchParams, swapCities, setSearchParams } = useBookingStore(useShallow((state) => ({
    searchParams: state.searchParams,
    swapCities: state.swapCities,
    setSearchParams: state.setSearchParams,
  })));
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const isSearchDisabled = !searchParams.originLocationCode
    || !searchParams.destinationLocationCode
    || searchParams.originLocationCode === searchParams.destinationLocationCode
    || !searchParams.date;

  const handleSearch = useCallback(() => {
    navigation.navigate('CreateTicketBooking');
  }, [navigation]);

  const openCityPicker = useCallback(
    (mode: 'from' | 'to') => {
      navigation.navigate('CityPicker', { mode });
    },
    [navigation],
  );

  const openDatePicker = useCallback(() => {
    navigation.navigate('DatePicker');
  }, [navigation]);

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
            greeting="Xin chào,"
            onNotificationPress={() => {}}
          />

          {/* Welcome section with mascot */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeTextColumn}>
              <Text style={styles.welcomeTitle}>Hello!</Text>
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
            onPassengersChange={handlePassengersChange}
            onSwapPress={swapCities}
            onSearchPress={handleSearch}
            searchDisabled={isSearchDisabled}
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
