import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { ProfileHeader } from '@shared/components';
import { useBookingStore } from '../../booking/store/useBookingStore';
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
  ClockCounterClockwise,
} from 'phosphor-react-native';

// Booking shared components & data
import { RouteCard, RecentSearchCard } from '../../booking/components';
import { MOCK_POPULAR_ROUTES, MOCK_RECENT_SEARCHES } from '../../booking/data/mockData';

// Subcomponents
import { NewsPromos } from '../components/NewsPromos';
import { RecentShipmentsSection } from '../components/RecentShipmentsSection';

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const fullName = user?.fullName || 'Viết Thông';

  const [activeTab, setActiveTab] = useState<'ticket' | 'parcel'>('ticket');
  const [isRoundTrip, setIsRoundTrip] = useState(false);

  // Booking flow state/actions
  const { searchParams, swapCities, setSearchParams } = useBookingStore();

  // Parcel flow state/actions
  const { fromCity, toCity, toDistrict } = useParcelStore();

  const handleNotificationPress = useCallback(() => {
    navigation.navigate('Notification');
  }, [navigation]);

  const handleTicketSearch = useCallback(() => {
    navigation.navigate('Booking', {
      screen: 'CreateTicketBooking',
    });
  }, [navigation]);

  const handlePopularPress = useCallback(
    (item: { from: string; to: string }) => {
      setSearchParams({ from: item.from, to: item.to });
      navigation.navigate('Booking', {
        screen: 'CreateTicketBooking',
      });
    },
    [navigation, setSearchParams],
  );

  const handleViewAllPopular = useCallback(() => {
    navigation.navigate('Booking', {
      screen: 'PopularRoutes',
    });
  }, [navigation]);

  const handleRecentPress = useCallback(
    (item: { route: string }) => {
      const parts = item.route.split(/\s+to\s+/i);
      const from = parts[0]?.trim() || '';
      const to = parts[1]?.trim() || '';
      setSearchParams({ from, to });
      navigation.navigate('Booking', { screen: 'DatePicker' });
    },
    [navigation, setSearchParams],
  );

  const openBookingCityPicker = useCallback(
    (mode: 'from' | 'to') => {
      navigation.navigate('Booking', {
        screen: 'CityPicker',
        params: { mode },
      });
    },
    [navigation],
  );

  const openBookingDatePicker = useCallback((mode: 'departure' | 'return' = 'departure') => {
    navigation.navigate('Booking', { screen: 'DatePicker', params: { mode } });
  }, [navigation]);

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

  const openParcelDistrictPicker = useCallback(() => {
    navigation.navigate('Parcel', {
      screen: 'DistrictPicker',
      params: { city: toCity },
    });
  }, [navigation, toCity]);

  const handleStartShipment = useCallback(() => {
    navigation.navigate('Parcel', { screen: 'CreateParcel' });
  }, [navigation]);

  const handleOpenShipmentList = useCallback(() => {
    navigation.navigate('BookingHistory', { initialTab: 'parcel' });
  }, [navigation]);

  const handleTrackShipment = useCallback(
    (parcelId: string) => {
      navigation.navigate('Parcel', {
        screen: 'ParcelTracking',
        params: { parcelId },
      });
    },
    [navigation],
  );


  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f9ff" />

      {/* Decorative Mint Green Ambient Background Glow */}
      <View style={styles.ambientGlow} />

      {/* Header - TopAppBar */}
      <ProfileHeader
        showBackButton={false}
        userName={fullName}
        onNotificationPress={handleNotificationPress}
      />

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Unified Tabbed Form Container */}
        <View style={styles.formContainer}>
          {/* Tabs Segment Control */}
          <View style={styles.tabHeader}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setActiveTab('ticket')}
              style={[styles.tabButton, activeTab === 'ticket' && styles.activeTabButton]}
            >
              <Ticket
                size={18}
                color={activeTab === 'ticket' ? '#fff' : colors.textSecondary}
                weight={activeTab === 'ticket' ? 'fill' : 'regular'}
              />
              <Text style={[styles.tabText, activeTab === 'ticket' && styles.activeTabText]}>
                Buy Ticket
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setActiveTab('parcel')}
              style={[styles.tabButton, activeTab === 'parcel' && styles.activeTabButton]}
            >
              <Package
                size={18}
                color={activeTab === 'parcel' ? '#fff' : colors.textSecondary}
                weight={activeTab === 'parcel' ? 'fill' : 'regular'}
              />
              <Text style={[styles.tabText, activeTab === 'parcel' && styles.activeTabText]}>
                Send Parcel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Body */}
          <View style={styles.formBody}>
            {activeTab === 'ticket' ? (
              // Booking Form
              <View>
                <Text style={styles.fieldLabel}>From</Text>
                <TouchableOpacity
                  style={styles.selectorField}
                  onPress={() => openBookingCityPicker('from')}
                  activeOpacity={0.8}
                >
                  <MapPin size={20} color={colors.primary} weight="bold" />
                  <Text style={searchParams.from ? styles.selectorText : styles.selectorPlaceholder}>
                    {searchParams.from || 'Select origin city'}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>To</Text>
                <View style={styles.toRow}>
                  <TouchableOpacity
                    style={[styles.selectorField, { flex: 1 }]}
                    onPress={() => openBookingCityPicker('to')}
                    activeOpacity={0.8}
                  >
                    <MapPin size={18} color={colors.primary} weight="bold" />
                    <Text
                      style={searchParams.to ? styles.selectorText : styles.selectorPlaceholder}
                      numberOfLines={1}
                    >
                      {searchParams.to || 'Select destination'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={swapCities} style={styles.swapBtn} activeOpacity={0.7}>
                    <ArrowsDownUp size={18} color={colors.primary} weight="bold" />
                  </TouchableOpacity>
                </View>

                <View style={styles.metaRow}>
                  <TouchableOpacity
                    style={styles.metaField}
                    onPress={() => openBookingDatePicker('departure')}
                    activeOpacity={0.8}
                  >
                    <CalendarBlank size={16} color={colors.primary} weight="fill" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {searchParams.date || 'Select date'}
                    </Text>
                  </TouchableOpacity>

                  {searchParams.isRoundTrip && (
                    <TouchableOpacity
                      style={styles.metaField}
                      onPress={() => openBookingDatePicker('return')}
                      activeOpacity={0.8}
                    >
                      <CalendarBlank size={16} color={colors.primary} weight="fill" />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {searchParams.returnDate || 'Return date'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={[styles.metaRow, { marginTop: spacing.md }]}>
                  <View style={[styles.metaField, styles.switchField]}>
                    <Text style={styles.switchLabel}>Round-trip</Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setSearchParams({ isRoundTrip: !searchParams.isRoundTrip })}
                      style={[
                        styles.switchTrack,
                        searchParams.isRoundTrip ? styles.switchTrackActive : styles.switchTrackInactive,
                      ]}
                    >
                      <View
                        style={[
                          styles.switchThumb,
                          searchParams.isRoundTrip ? styles.switchThumbActive : styles.switchThumbInactive,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleTicketSearch}
                  style={styles.searchButton}
                >
                  <Text style={styles.searchButtonText}>Search Buses</Text>
                  <MagnifyingGlass size={18} color={colors.textInverse} weight="bold" />
                </TouchableOpacity>
              </View>
            ) : (
              // Parcel Form
              <View>
                <Text style={styles.fieldLabel}>From</Text>
                <TouchableOpacity
                  style={styles.selectorField}
                  onPress={() => openParcelCityPicker('from')}
                  activeOpacity={0.8}
                >
                  <MapPin size={20} color={colors.primary} weight="bold" />
                  <Text style={fromCity ? styles.selectorText : styles.selectorPlaceholder}>
                    {fromCity || 'Select Origin City/District'}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>To</Text>
                <View style={styles.toRow}>
                  <TouchableOpacity
                    style={[styles.selectorField, { flex: 1 }]}
                    onPress={() => openParcelCityPicker('to')}
                    activeOpacity={0.8}
                  >
                    <PaperPlaneTilt size={18} color={colors.primary} weight="bold" />
                    <Text
                      style={toCity ? styles.selectorText : styles.selectorPlaceholder}
                      numberOfLines={1}
                    >
                      {toCity || 'Select City'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.selectorField, { flex: 1.2 }]}
                    onPress={openParcelDistrictPicker}
                    activeOpacity={0.8}
                  >
                    <PaperPlaneTilt size={18} color={colors.primary} weight="bold" />
                    <Text
                      style={
                        toDistrict && toDistrict !== 'Select District'
                          ? styles.selectorText
                          : styles.selectorPlaceholder
                      }
                      numberOfLines={1}
                    >
                      {toDistrict || 'Select District'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.parcelActionsRow}>
                  <TouchableOpacity
                    style={styles.nextButton}
                    onPress={handleStartShipment}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.searchButtonText}>Next</Text>
                    <ArrowRight size={18} color={colors.textInverse} weight="bold" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.historyBtn}
                    onPress={handleOpenShipmentList}
                    activeOpacity={0.7}
                  >
                    <ClockCounterClockwise size={20} color={colors.primary} weight="bold" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {activeTab === 'ticket' && (
          <>
            {/* Popular Routes */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Routes</Text>
              <TouchableOpacity activeOpacity={0.6} onPress={handleViewAllPopular}>
                <Text style={styles.viewAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              style={{ marginBottom: spacing.lg }}
            >
              {MOCK_POPULAR_ROUTES.map((item) => (
                <RouteCard
                  key={item.id}
                  from={item.from}
                  to={item.to}
                  price={item.price}
                  onPress={() => handlePopularPress(item)}
                />
              ))}
            </ScrollView>

            {/* Recent Searches */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              style={{ marginBottom: spacing.lg }}
            >
              {MOCK_RECENT_SEARCHES.map((item) => (
                <RecentSearchCard
                  key={item.id}
                  route={item.route}
                  onPress={() => handleRecentPress(item)}
                />
              ))}
            </ScrollView>

            {/* News & Promotions */}
            <NewsPromos />
          </>
        )}

        {activeTab === 'parcel' && (
          <RecentShipmentsSection
            onViewAll={handleOpenShipmentList}
            onTrackShipment={handleTrackShipment}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F7F9FF',
  },
  ambientGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(42, 193, 188, 0.12)',
    width: 585,
    height: 585,
    borderRadius: 9999,
    top: -176.8,
    left: -97.5,
    zIndex: 0,
    transform: [{ scale: 1.0 }],
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 80,
    zIndex: 5,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.xl,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.divider,
    marginVertical: spacing.md,
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
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
    backgroundColor: colors.primary,
  },
  tabText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.textInverse,
  },
  formBody: {
    width: '100%',
  },
  fieldLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    paddingLeft: 2,
  },
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.2,
    borderColor: colors.divider,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  selectorText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  selectorPlaceholder: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
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
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  metaField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.2,
    borderColor: colors.divider,
    borderRadius: 16,
    height: 44,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  metaText: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  switchField: {
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
  },
  switchLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  switchTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: colors.primary,
  },
  switchTrackInactive: {
    backgroundColor: '#E5E7EB',
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
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
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 48,
    marginTop: spacing.xl,
    gap: spacing.xs,
    ...shadows.sm,
  },
  searchButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
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
  historyBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: colors.divider,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
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
