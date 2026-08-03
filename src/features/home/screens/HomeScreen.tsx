import React, { useCallback, useState } from 'react';
import {
  Alert,
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { useWalletBalance } from '@features/profile/hooks/useWallet';
import type {
  MainTabParamList,
  RootStackParamList,
} from '@app/navigation/types';
import { ProfileHeader } from '@shared/components';
import { useBookingStore } from '../../booking/store/useBookingStore';
import { useBookingDiscovery } from '../../booking/hooks/useBookingDiscovery';
import { useParcelStore } from '../../parcel/store/useParcelStore';
import {
  Ticket,
  Package,
  MapPin,
  ArrowsDownUp,
  CalendarBlank,
  MagnifyingGlass,
  PaperPlaneTilt,
  ArrowRight,
} from 'phosphor-react-native';

import {
  PassengerCountInput,
  PopularRoutesSection,
  RecentSearchesSection,
} from '../../booking/components';
import { PromotionsSection } from '../components/PromotionsSection';
import { RecentParcelsSection } from '../components/RecentParcelsSection';
import { WalletSummaryCard } from '../components/WalletSummaryCard';

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<HomeNavigationProp>();
  const user = useAuthStore(state => state.user);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();

  const [activeTab, setActiveTab] = useState<'ticket' | 'parcel'>('ticket');

  // Booking flow state/actions
  const searchParams = useBookingStore(state => state.searchParams);
  const swapCities = useBookingStore(state => state.swapCities);
  const setSearchParams = useBookingStore(state => state.setSearchParams);
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
  const walletBalanceQuery = useWalletBalance();
  const canSearchTickets = Boolean(
    searchParams.originLocationCode &&
      searchParams.destinationLocationCode &&
      searchParams.originLocationCode !==
        searchParams.destinationLocationCode &&
      searchParams.date &&
      (!searchParams.isRoundTrip || searchParams.returnDate),
  );

  // Parcel flow state/actions
  const fromCity = useParcelStore(state => state.fromCity);
  const toCity = useParcelStore(state => state.toCity);
  const fromLocationCode = useParcelStore(state => state.fromLocationCode);
  const toLocationCode = useParcelStore(state => state.toLocationCode);
  const canStartParcel = Boolean(
    fromLocationCode && toLocationCode && fromLocationCode !== toLocationCode,
  );

  const handleNotificationPress = useCallback(() => {
    navigation.navigate('Notification');
  }, [navigation]);

  const handleTicketSearch = useCallback(() => {
    saveCurrentSearch().catch(() => undefined);
    navigation.navigate('Booking', {
      screen: 'CreateTicketBooking',
      params: { intent: { type: 'search' } },
    });
  }, [navigation, saveCurrentSearch]);

  const handlePopularRoutePress = useCallback(
    (originCode: string, destinationCode: string) => {
      if (applyPopularRoute(originCode, destinationCode) !== 'applied') return;
      saveCurrentSearch().catch(() => undefined);
      navigation.navigate('Booking', {
        screen: 'CreateTicketBooking',
        params: { intent: { type: 'search' } },
      });
    },
    [applyPopularRoute, navigation, saveCurrentSearch],
  );

  const handleViewAllPopularRoutes = useCallback(() => {
    navigation.navigate('Booking', { screen: 'PopularRoutes' });
  }, [navigation]);

  const handleRecentSearchPress = useCallback(
    (searchId: string) => {
      const result = applyRecentSearch(searchId);
      if (result === 'applied') {
        navigation.navigate('Booking', {
          screen: 'CreateTicketBooking',
          params: { intent: { type: 'search' } },
        });
        return;
      }

      if (result === 'past_date' || result === 'invalid_date') {
        Alert.alert(
          t('home.recentSearch.dateUnavailableTitle'),
          t('home.recentSearch.dateUnavailableDescription'),
        );
      }
    },
    [applyRecentSearch, navigation, t],
  );

  const handleClearRecentSearches = useCallback(() => {
    clearRecentSearches().catch(() => undefined);
  }, [clearRecentSearches]);

  const handleWalletPress = useCallback(() => {
    navigation.navigate('Main', {
      screen: 'Profile',
      params: { screen: 'Wallet' },
    });
  }, [navigation]);

  const handlePromotionPress = useCallback(
    (voucherId: string, code: string) => {
      if (!voucherId || !code) return;
      navigation.navigate('Booking', {
        screen: 'SearchRoutes',
        params: {
          intent: {
            type: 'promotion',
            pendingVoucher: { voucherId, code },
          },
        },
      });
    },
    [navigation],
  );

  const handleRecentParcelPress = useCallback(
    (parcelId: string, tripId: string) => {
      if (!parcelId || !tripId) return;
      navigation.navigate('Parcel', {
        screen: 'ParcelDetail',
        params: { parcelId, fromHistory: true },
      });
    },
    [navigation],
  );

  const handleViewAllParcels = useCallback(() => {
    navigation.navigate('BookingHistory', { initialTab: 'parcel' });
  }, [navigation]);

  const openBookingCityPicker = useCallback(
    (mode: 'from' | 'to') => {
      navigation.navigate('Booking', {
        screen: 'CityPicker',
        params: { mode },
      });
    },
    [navigation],
  );

  const openBookingDatePicker = useCallback(
    (mode: 'departure' | 'return' = 'departure') => {
      navigation.navigate('Booking', {
        screen: 'DatePicker',
        params: { mode },
      });
    },
    [navigation],
  );

  const handlePassengersChange = useCallback(
    (passengers: number) => {
      setSearchParams({ passengers });
    },
    [setSearchParams],
  );

  // Parcel handlers
  const openParcelCityPicker = useCallback(
    (mode: 'from' | 'to') => {
      navigation.navigate('Parcel', {
        screen: 'CityPicker',
        params: { mode },
      });
    },
    [navigation],
  );

  const handleStartShipment = useCallback(() => {
    navigation.navigate('Parcel', { screen: 'CreateParcel' });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.transparent}
        translucent
      />

      <View style={styles.backgroundLayer} pointerEvents="none">
        <View style={styles.ambientGlow} />
        <View style={styles.secondaryGlow} />
      </View>

      {/* Header - TopAppBar */}
      <ProfileHeader
        showBackButton={false}
        userName={user?.fullName}
        onNotificationPress={handleNotificationPress}
      />

      {/* Main Content Area */}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      >
        {/* Unified Tabbed Form Container */}
        <View style={styles.formContainer}>
          {/* Tabs Segment Control */}
          <View style={styles.tabHeader}>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={t('home.tabs.ticket')}
              accessibilityState={{ selected: activeTab === 'ticket' }}
              onPress={() => setActiveTab('ticket')}
              style={({ pressed }) => [
                styles.tabButton,
                activeTab === 'ticket' ? styles.activeTabButton : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Ticket
                size={18}
                color={
                  activeTab === 'ticket'
                    ? theme.colors.textInverse
                    : theme.colors.textSecondary
                }
                weight={activeTab === 'ticket' ? 'fill' : 'regular'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'ticket' ? styles.activeTabText : null,
                ]}
              >
                {t('home.tabs.ticket')}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={t('home.tabs.parcel')}
              accessibilityState={{ selected: activeTab === 'parcel' }}
              onPress={() => setActiveTab('parcel')}
              style={({ pressed }) => [
                styles.tabButton,
                activeTab === 'parcel' ? styles.activeTabButton : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Package
                size={18}
                color={
                  activeTab === 'parcel'
                    ? theme.colors.textInverse
                    : theme.colors.textSecondary
                }
                weight={activeTab === 'parcel' ? 'fill' : 'regular'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'parcel' ? styles.activeTabText : null,
                ]}
              >
                {t('home.tabs.parcel')}
              </Text>
            </Pressable>
          </View>

          {/* Tab Body */}
          <View style={styles.formBody}>
            {activeTab === 'ticket' ? (
              // Booking Form
              <View>
                <Text style={styles.fieldLabel}>{t('home.ticket.departureLocation')}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('home.ticket.selectOrigin')}
                  style={styles.selectorField}
                  onPress={() => openBookingCityPicker('from')}
                >
                  <MapPin
                    size={20}
                    color={theme.colors.primary}
                    weight="bold"
                  />
                  <Text
                    style={
                      searchParams.from
                        ? styles.selectorText
                        : styles.selectorPlaceholder
                    }
                  >
                    {searchParams.originStationName ||
                      searchParams.from ||
                      t('home.ticket.selectOrigin')}
                  </Text>
                </Pressable>

                <Text
                  style={[styles.fieldLabel, styles.fieldLabelWithTopMargin]}
                >
                  {t('home.ticket.destinationLocation')}
                </Text>
                <View style={styles.toRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('home.ticket.selectDestination')}
                    style={[styles.selectorField, styles.selectorFieldGrow]}
                    onPress={() => openBookingCityPicker('to')}
                  >
                    <MapPin
                      size={18}
                      color={theme.colors.primary}
                      weight="bold"
                    />
                    <Text
                      style={
                        searchParams.to
                          ? styles.selectorText
                          : styles.selectorPlaceholder
                      }
                      numberOfLines={1}
                    >
                      {searchParams.destinationStationName ||
                        searchParams.to ||
                        t('home.ticket.selectDestination')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('home.ticket.swapLocations')}
                    onPress={swapCities}
                    style={styles.swapBtn}
                  >
                    <ArrowsDownUp
                      size={18}
                      color={theme.colors.primary}
                      weight="bold"
                    />
                  </Pressable>
                </View>

                <View style={styles.metaRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('home.ticket.selectDepartureDate')}
                    style={styles.metaField}
                    onPress={() => openBookingDatePicker('departure')}
                  >
                    <CalendarBlank
                      size={16}
                      color={theme.colors.primary}
                      weight="fill"
                    />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {searchParams.date || t('home.ticket.selectDate')}
                    </Text>
                  </Pressable>

                  <PassengerCountInput
                    value={searchParams.passengers}
                    onChange={handlePassengersChange}
                  />
                </View>

                <View style={[styles.metaRow, styles.metaRowCompact]}>
                  {searchParams.isRoundTrip ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('home.ticket.selectReturnDate')}
                      style={styles.metaField}
                      onPress={() => openBookingDatePicker('return')}
                    >
                      <CalendarBlank
                        size={16}
                        color={theme.colors.primary}
                        weight="fill"
                      />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {searchParams.returnDate || t('home.ticket.returnDate')}
                      </Text>
                    </Pressable>
                  ) : null}
                  <View style={[styles.metaField, styles.switchField]}>
                    <Text style={styles.switchLabel}>{t('home.ticket.roundTrip')}</Text>
                    <Pressable
                      accessibilityRole="switch"
                      accessibilityLabel={t('home.ticket.roundTrip')}
                      accessibilityState={{ checked: searchParams.isRoundTrip }}
                      onPress={() =>
                        setSearchParams({
                          isRoundTrip: !searchParams.isRoundTrip,
                        })
                      }
                      style={[
                        styles.switchTrack,
                        searchParams.isRoundTrip
                          ? styles.switchTrackActive
                          : null,
                      ]}
                    >
                      <View
                        style={[
                          styles.switchThumb,
                          searchParams.isRoundTrip
                            ? styles.switchThumbActive
                            : styles.switchThumbInactive,
                        ]}
                      />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={handleTicketSearch}
                  disabled={!canSearchTickets}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.ticket.searchBuses')}
                  accessibilityState={{ disabled: !canSearchTickets }}
                  style={({ pressed }) => [
                    styles.searchButton,
                    !canSearchTickets ? styles.searchButtonDisabled : null,
                    pressed && canSearchTickets ? styles.pressed : null,
                  ]}
                >
                  <Text style={styles.searchButtonText}>{t('home.ticket.searchBuses')}</Text>
                  <MagnifyingGlass
                    size={18}
                    color={theme.colors.textInverse}
                    weight="bold"
                  />
                </Pressable>
              </View>
            ) : (
              // Parcel Form
              <View>
                <Text style={styles.fieldLabel}>{t('home.parcel.from')}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('home.parcel.selectOrigin')}
                  style={styles.selectorField}
                  onPress={() => openParcelCityPicker('from')}
                >
                  <MapPin
                    size={20}
                    color={theme.colors.primary}
                    weight="bold"
                  />
                  <Text
                    style={
                      fromCity
                        ? styles.selectorText
                        : styles.selectorPlaceholder
                    }
                  >
                    {fromCity || t('home.parcel.selectOrigin')}
                  </Text>
                </Pressable>

                <Text
                  style={[styles.fieldLabel, styles.fieldLabelWithTopMargin]}
                >
                  {t('home.parcel.to')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('home.parcel.selectDestination')}
                  style={styles.selectorField}
                  onPress={() => openParcelCityPicker('to')}
                >
                  <PaperPlaneTilt
                    size={18}
                    color={theme.colors.primary}
                    weight="bold"
                  />
                  <Text
                    style={
                      toCity ? styles.selectorText : styles.selectorPlaceholder
                    }
                    numberOfLines={1}
                  >
                    {toCity || t('home.parcel.selectDestination')}
                  </Text>
                </Pressable>
                <Text style={styles.parcelRouteHint}>
                  {t('home.parcel.terminalHint')}
                </Text>

                <View style={styles.parcelActionsRow}>
                  <Pressable
                    disabled={!canStartParcel}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.continue')}
                    accessibilityState={{ disabled: !canStartParcel }}
                    style={({ pressed }) => [
                      styles.nextButton,
                      !canStartParcel ? styles.searchButtonDisabled : null,
                      pressed && canStartParcel ? styles.pressed : null,
                    ]}
                    onPress={handleStartShipment}
                  >
                    <Text style={styles.searchButtonText}>{t('common.continue')}</Text>
                    <ArrowRight
                      size={18}
                      color={theme.colors.textInverse}
                      weight="bold"
                    />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>

        {user ? (
          <WalletSummaryCard
            balance={walletBalanceQuery.data?.balance}
            isLoading={walletBalanceQuery.isLoading}
            hasError={walletBalanceQuery.isError}
            onPress={handleWalletPress}
          />
        ) : null}

        {activeTab === 'ticket' ? (
          <>
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
            <PromotionsSection onPromotionPress={handlePromotionPress} />
          </>
        ) : (
          <RecentParcelsSection
            onParcelPress={handleRecentParcelPress}
            onViewAll={handleViewAllParcels}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeArea: {
    ...theme.components.screen,
    overflow: 'hidden',
  },
  backgroundLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  ambientGlow: {
    position: 'absolute',
    backgroundColor: theme.effects.ambientGlow,
    width: 456,
    height: 456,
    borderRadius: 228,
    top: -172,
    left: -96,
    opacity: theme.effects.isLiquid ? 1 : 0,
    transform: [{ scaleX: 1.28 }, { scaleY: 0.82 }, { rotate: '-12deg' }],
  },
  secondaryGlow: {
    position: 'absolute',
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassTint
      : theme.colors.transparent,
    width: 318,
    height: 318,
    borderRadius: 9999,
    top: 128,
    right: -152,
    opacity: theme.effects.isLiquid ? (theme.isDark ? 0.9 : 0.72) : 0,
    transform: [{ scaleX: 0.78 }, { scaleY: 1.18 }, { rotate: '18deg' }],
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 80,
    zIndex: 5,
  },
  formContainer: {
    ...theme.components.elevatedCard,
    borderRadius: 28,
    padding: spacing.xl,
    marginVertical: spacing.md,
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
    borderRadius: 16,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: spacing.xs,
  },
  activeTabButton: {
    ...theme.components.primaryButton,
    boxShadow: 'none',
  },
  tabText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.textInverse,
  },
  formBody: {
    width: '100%',
  },
  fieldLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: spacing.xs,
    paddingLeft: 2,
  },
  fieldLabelWithTopMargin: {
    marginTop: spacing.md,
  },
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.components.field,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  selectorFieldGrow: {
    flex: 1,
  },
  selectorText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  selectorPlaceholder: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textTertiary,
  },
  parcelRouteHint: {
    marginTop: spacing.sm,
    paddingHorizontal: 2,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    color: theme.colors.textTertiary,
  },
  toRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurface
      : theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.effects.cardShadow,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  metaRowCompact: {
    marginTop: spacing.md,
  },
  metaField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.components.field,
    borderRadius: 16,
    height: 44,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  metaText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  switchField: {
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
  },
  switchLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  switchTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.divider,
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: theme.colors.primary,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.effects.contentSurfaceElevated,
    ...theme.effects.cardShadow,
  },
  switchThumbActive: {
    transform: [{ translateX: 18 }],
  },
  switchThumbInactive: {
    transform: [{ translateX: 0 }],
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.components.primaryButton,
    borderRadius: 16,
    height: 48,
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  searchButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
  searchButtonDisabled: {
    opacity: 0.45,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.components.primaryButton,
    borderRadius: 16,
    height: 48,
    gap: spacing.xs,
  },
  parcelActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
