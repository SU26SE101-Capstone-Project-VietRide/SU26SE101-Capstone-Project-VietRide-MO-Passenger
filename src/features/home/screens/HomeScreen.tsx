import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
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
import {
  useFloatingTabBarContentInset,
  useResponsiveLayout,
  useTabBarScrollBehavior,
  useThemedStyles,
} from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { useWalletBalance } from '@features/profile/hooks/useWallet';
import type {
  MainTabParamList,
  RootStackParamList,
} from '@app/navigation/types';
import { AppKeyboardAwareScrollView, ProfileHeader } from '@shared/components';
import { useNotificationUnreadCount } from '../hooks/useNotifications';
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
import { toTripSearchDate } from '../../booking/utils/searchParams';
import { formatTicketSearchDate } from '../../booking/utils/ticketSearchDate';
import { resolveHomeTicketSearchContinuation } from '../../booking/utils/homeTicketSearchContinuation';

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<HomeNavigationProp>();
  const user = useAuthStore(state => state.user);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isCompact, contentPaddingHorizontal } = useResponsiveLayout();
  const handleTabBarScroll = useTabBarScrollBehavior();
  const bottomTabClearance = useFloatingTabBarContentInset();
  const unreadNotificationCount = useNotificationUnreadCount().data ?? 0;

  const [activeTab, setActiveTab] = useState<'ticket' | 'parcel'>('ticket');

  const searchParams = useBookingStore(state => state.searchParams);
  const appLanguage = i18n.resolvedLanguage ?? i18n.language;
  const departureDateLabel = useMemo(() => {
    try {
      return formatTicketSearchDate(
        toTripSearchDate(searchParams.date),
        appLanguage,
      );
    } catch {
      return '';
    }
  }, [appLanguage, searchParams.date]);
  const returnDateLabel = useMemo(() => {
    if (!searchParams.returnDate) return '';
    try {
      return formatTicketSearchDate(
        toTripSearchDate(searchParams.returnDate),
        appLanguage,
      );
    } catch {
      return '';
    }
  }, [appLanguage, searchParams.returnDate]);
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
  const canChooseTicketDate = Boolean(
    searchParams.originLocationCode &&
      searchParams.destinationLocationCode,
  );

  const fromCity = useParcelStore(state => state.fromCity);
  const toCity = useParcelStore(state => state.toCity);
  const fromLocationCode = useParcelStore(state => state.fromLocationCode);
  const toLocationCode = useParcelStore(state => state.toLocationCode);
  const swapParcelLocations = useParcelStore(state => state.swapLocations);
  const canStartParcel = Boolean(fromLocationCode && toLocationCode);

  const handleNotificationPress = useCallback(() => {
    navigation.navigate('Notification');
  }, [navigation]);

  const handleTicketSearch = useCallback(() => {
    const continuation = resolveHomeTicketSearchContinuation({
      departureDate: searchParams.date,
      returnDate: searchParams.returnDate,
      isRoundTrip: Boolean(searchParams.isRoundTrip),
    });

    if (continuation !== 'search') {
      navigation.navigate('Booking', {
        screen: 'DatePicker',
        params: {
          mode: continuation === 'select_return' ? 'return' : 'departure',
          next: 'search',
          intent: { type: 'search' },
        },
      });
      return;
    }

    saveCurrentSearch().catch(() => undefined);
    navigation.navigate('Booking', {
      screen: 'CreateTicketBooking',
      params: { intent: { type: 'search' } },
    });
  }, [navigation, saveCurrentSearch, searchParams.date, searchParams.isRoundTrip, searchParams.returnDate]);

  const handlePopularRoutePress = useCallback(
    (originCode: string, destinationCode: string) => {
      if (applyPopularRoute(originCode, destinationCode) !== 'applied') return;
      navigation.navigate('Booking', {
        screen: 'DatePicker',
        params: { mode: 'departure', next: 'search', intent: { type: 'search' } },
      });
    },
    [applyPopularRoute, navigation],
  );

  const handleViewAllPopularRoutes = useCallback(() => {
    navigation.navigate('Booking', { screen: 'PopularRoutes' });
  }, [navigation]);

  const handleRecentSearchPress = useCallback(
    (searchId: string) => {
      const result = applyRecentSearch(searchId);
      if (result !== 'not_found') {
        navigation.navigate('Booking', {
          screen: 'DatePicker',
          params: { mode: 'departure', next: 'search', intent: { type: 'search' } },
        });
      }
    },
    [applyRecentSearch, navigation],
  );

  const handleClearRecentSearches = useCallback(() => {
    clearRecentSearches().catch(() => undefined);
  }, [clearRecentSearches]);

  const handleWalletPress = useCallback(() => {
    navigation.navigate('Profile', {
      screen: 'Wallet',
      initial: false,
    });
  }, [navigation]);

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

      <ProfileHeader
        showBackButton={false}
        userName={user?.fullName}
        onNotificationPress={handleNotificationPress}
        notificationBadgeCount={unreadNotificationCount}
      />

      <AppKeyboardAwareScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: contentPaddingHorizontal, paddingBottom: bottomTabClearance },
        ]}
        scrollIndicatorInsets={{ bottom: bottomTabClearance }}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      >
        <View style={[styles.formContainer, isCompact ? styles.formContainerCompact : null]}>
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
                numberOfLines={1}
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
                numberOfLines={1}
                style={[
                  styles.tabText,
                  activeTab === 'parcel' ? styles.activeTabText : null,
                ]}
              >
                {t('home.tabs.parcel')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.formBody}>
            {activeTab === 'ticket' ? (
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
                    numberOfLines={1}
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

                <Text style={[styles.fieldLabel, styles.fieldLabelWithTopMargin]}>
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
                      {departureDateLabel || t('home.ticket.selectDate')}
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
                        {returnDateLabel || t('home.ticket.returnDate')}
                      </Text>
                    </Pressable>
                  ) : null}
                  <View style={[styles.metaField, styles.switchField]}>
                    <Text style={styles.switchLabel} numberOfLines={1}>
                      {t('home.ticket.roundTrip')}
                    </Text>
                    <Pressable
                      accessibilityRole="switch"
                      accessibilityLabel={t('home.ticket.roundTrip')}
                      accessibilityState={{ checked: searchParams.isRoundTrip }}
                      onPress={() =>
                        setSearchParams({
                          isRoundTrip: !searchParams.isRoundTrip,
                        })
                      }
                      style={styles.switchHitArea}
                    >
                      <View
                        style={[
                          styles.switchTrack,
                          searchParams.isRoundTrip ? styles.switchTrackActive : null,
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
                      </View>
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={handleTicketSearch}
                  disabled={!canChooseTicketDate}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.ticket.searchBuses')}
                  accessibilityState={{ disabled: !canChooseTicketDate }}
                  style={({ pressed }) => [
                    styles.searchButton,
                    !canChooseTicketDate ? styles.searchButtonDisabled : null,
                    pressed && canChooseTicketDate ? styles.pressed : null,
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
                    numberOfLines={1}
                    style={
                      fromCity
                        ? styles.selectorText
                        : styles.selectorPlaceholder
                    }
                  >
                    {fromCity || t('home.parcel.selectOrigin')}
                  </Text>
                </Pressable>

                <Text style={[styles.fieldLabel, styles.fieldLabelWithTopMargin]}>
                  {t('home.parcel.to')}
                </Text>
                <View style={styles.toRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('home.parcel.selectDestination')}
                    style={[styles.selectorField, styles.selectorFieldGrow]}
                    onPress={() => openParcelCityPicker('to')}
                  >
                    <PaperPlaneTilt
                      size={18}
                      color={theme.colors.primary}
                      weight="bold"
                    />
                    <Text
                      style={toCity ? styles.selectorText : styles.selectorPlaceholder}
                      numberOfLines={1}
                    >
                      {toCity || t('home.parcel.selectDestination')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('home.parcel.swapLocations')}
                    onPress={swapParcelLocations}
                    style={styles.swapBtn}
                  >
                    <ArrowsDownUp
                      size={18}
                      color={theme.colors.primary}
                      weight="bold"
                    />
                  </Pressable>
                </View>
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
            <PromotionsSection />
          </>
        ) : (
          <RecentParcelsSection
            onParcelPress={handleRecentParcelPress}
            onViewAll={handleViewAllParcels}
          />
        )}
      </AppKeyboardAwareScrollView>
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
  formContainerCompact: {
    padding: spacing.lg,
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
    minWidth: 0,
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
    minWidth: 0,
    flexShrink: 1,
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
    minWidth: 0,
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
    minWidth: 0,
  },
  selectorText: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  selectorPlaceholder: {
    flex: 1,
    minWidth: 0,
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
    flexShrink: 0,
    width: 44,
    height: 44,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  metaRowCompact: {
    marginTop: spacing.md,
  },
  metaField: {
    minWidth: 140,
    flexGrow: 1,
    flexBasis: 140,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.components.field,
    borderRadius: 16,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  switchField: {
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
  },
  switchLabel: {
    flex: 1,
    minWidth: 0,
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
  switchHitArea: {
    flexShrink: 0,
    width: 48,
    height: 44,
    alignItems: 'center',
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
    minHeight: 48,
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  searchButtonText: {
    flexShrink: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
    textAlign: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.45,
  },
  nextButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.components.primaryButton,
    borderRadius: 16,
    minHeight: 48,
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