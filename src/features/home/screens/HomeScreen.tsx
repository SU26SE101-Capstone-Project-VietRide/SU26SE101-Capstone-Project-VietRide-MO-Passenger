import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { GlassCarouselSection, ProfileHeader } from '@shared/components';
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
  const isGuest = useAuthStore((state) => state.isGuest);
  const fullName = user?.fullName ?? (isGuest ? 'Guest' : 'VietRide');
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const [activeTab, setActiveTab] = useState<'ticket' | 'parcel'>('ticket');

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <View style={styles.backgroundLayer} pointerEvents="none">
        <View style={styles.ambientGlow} />
        <View style={styles.secondaryGlow} />
        <View style={styles.contentShield} />
      </View>

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
            <Pressable
              onPress={() => setActiveTab('ticket')}
              style={({ pressed }) => [
                styles.tabButton,
                activeTab === 'ticket' ? styles.activeTabButton : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Ticket
                size={18}
                color={activeTab === 'ticket' ? theme.colors.textInverse : theme.colors.textSecondary}
                weight={activeTab === 'ticket' ? 'fill' : 'regular'}
              />
              <Text style={[styles.tabText, activeTab === 'ticket' ? styles.activeTabText : null]}>
                Buy Ticket
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('parcel')}
              style={({ pressed }) => [
                styles.tabButton,
                activeTab === 'parcel' ? styles.activeTabButton : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Package
                size={18}
                color={activeTab === 'parcel' ? theme.colors.textInverse : theme.colors.textSecondary}
                weight={activeTab === 'parcel' ? 'fill' : 'regular'}
              />
              <Text style={[styles.tabText, activeTab === 'parcel' ? styles.activeTabText : null]}>
                Send Parcel
              </Text>
            </Pressable>
          </View>

          {/* Tab Body */}
          <View style={styles.formBody}>
            {activeTab === 'ticket' ? (
              // Booking Form
              <View>
                <Text style={styles.fieldLabel}>From</Text>
                <Pressable
                  style={styles.selectorField}
                  onPress={() => openBookingCityPicker('from')}
                >
                  <MapPin size={20} color={theme.colors.primary} weight="bold" />
                  <Text style={searchParams.from ? styles.selectorText : styles.selectorPlaceholder}>
                    {searchParams.from || 'Select origin city'}
                  </Text>
                </Pressable>

                <Text style={[styles.fieldLabel, styles.fieldLabelWithTopMargin]}>To</Text>
                <View style={styles.toRow}>
                  <Pressable
                    style={[styles.selectorField, styles.selectorFieldGrow]}
                    onPress={() => openBookingCityPicker('to')}
                  >
                    <MapPin size={18} color={theme.colors.primary} weight="bold" />
                    <Text
                      style={searchParams.to ? styles.selectorText : styles.selectorPlaceholder}
                      numberOfLines={1}
                    >
                      {searchParams.to || 'Select destination'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={swapCities} style={styles.swapBtn}>
                    <ArrowsDownUp size={18} color={theme.colors.primary} weight="bold" />
                  </Pressable>
                </View>

                <View style={styles.metaRow}>
                  <Pressable
                    style={styles.metaField}
                    onPress={() => openBookingDatePicker('departure')}
                  >
                    <CalendarBlank size={16} color={theme.colors.primary} weight="fill" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {searchParams.date || 'Select date'}
                    </Text>
                  </Pressable>

                  {searchParams.isRoundTrip ? (
                    <Pressable
                      style={styles.metaField}
                      onPress={() => openBookingDatePicker('return')}
                    >
                      <CalendarBlank size={16} color={theme.colors.primary} weight="fill" />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {searchParams.returnDate || 'Return date'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={[styles.metaRow, styles.metaRowCompact]}>
                  <View style={[styles.metaField, styles.switchField]}>
                    <Text style={styles.switchLabel}>Round-trip</Text>
                    <Pressable
                      onPress={() => setSearchParams({ isRoundTrip: !searchParams.isRoundTrip })}
                      style={[
                        styles.switchTrack,
                        searchParams.isRoundTrip ? styles.switchTrackActive : null,
                      ]}
                    >
                      <View
                        style={[
                          styles.switchThumb,
                          searchParams.isRoundTrip ? styles.switchThumbActive : styles.switchThumbInactive,
                        ]}
                      />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={handleTicketSearch}
                  style={styles.searchButton}
                >
                  <Text style={styles.searchButtonText}>Search Buses</Text>
                  <MagnifyingGlass size={18} color={theme.colors.textInverse} weight="bold" />
                </Pressable>
              </View>
            ) : (
              // Parcel Form
              <View>
                <Text style={styles.fieldLabel}>From</Text>
                <Pressable
                  style={styles.selectorField}
                  onPress={() => openParcelCityPicker('from')}
                >
                  <MapPin size={20} color={theme.colors.primary} weight="bold" />
                  <Text style={fromCity ? styles.selectorText : styles.selectorPlaceholder}>
                    {fromCity || 'Select Origin City/District'}
                  </Text>
                </Pressable>

                <Text style={[styles.fieldLabel, styles.fieldLabelWithTopMargin]}>To</Text>
                <View style={styles.toRow}>
                  <Pressable
                    style={[styles.selectorField, styles.selectorFieldGrow]}
                    onPress={() => openParcelCityPicker('to')}
                  >
                    <PaperPlaneTilt size={18} color={theme.colors.primary} weight="bold" />
                    <Text
                      style={toCity ? styles.selectorText : styles.selectorPlaceholder}
                      numberOfLines={1}
                    >
                      {toCity || 'Select City'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.selectorField, styles.selectorFieldWide]}
                    onPress={openParcelDistrictPicker}
                  >
                    <PaperPlaneTilt size={18} color={theme.colors.primary} weight="bold" />
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
                  </Pressable>
                </View>

                <View style={styles.parcelActionsRow}>
                  <Pressable
                    style={styles.nextButton}
                    onPress={handleStartShipment}
                  >
                    <Text style={styles.searchButtonText}>Next</Text>
                    <ArrowRight size={18} color={theme.colors.textInverse} weight="bold" />
                  </Pressable>

                  <Pressable
                    style={styles.historyBtn}
                    onPress={handleOpenShipmentList}
                  >
                    <ClockCounterClockwise size={20} color={theme.colors.primary} weight="bold" />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>

        {activeTab === 'ticket' && (
          <>
            <GlassCarouselSection
              title="Popular Routes"
              actionLabel="See all"
              onActionPress={handleViewAllPopular}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
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
            </GlassCarouselSection>

            <GlassCarouselSection title="Recent Searches">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              >
                {MOCK_RECENT_SEARCHES.map((item) => (
                  <RecentSearchCard
                    key={item.id}
                    route={item.route}
                    onPress={() => handleRecentPress(item)}
                  />
                ))}
              </ScrollView>
            </GlassCarouselSection>

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
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassTint : 'transparent',
    width: 318,
    height: 318,
    borderRadius: 9999,
    top: 128,
    right: -152,
    opacity: theme.effects.isLiquid ? (theme.isDark ? 0.9 : 0.72) : 0,
    transform: [{ scaleX: 0.78 }, { scaleY: 1.18 }, { rotate: '18deg' }],
  },
  contentShield: {
    position: 'absolute',
    top: 132,
    left: -28,
    right: -28,
    height: 444,
    borderRadius: 48,
    backgroundColor: theme.effects.isLiquid
      ? theme.isDark
        ? 'rgba(3, 17, 17, 0.5)'
        : 'rgba(248, 253, 253, 0.58)'
      : 'transparent',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 80,
    zIndex: 5,
  },
  formContainer: {
    ...theme.components.elevatedCard,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.divider,
    borderRadius: 28,
    padding: spacing.xl,
    marginVertical: spacing.md,
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.fieldBorder : theme.colors.divider,
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
    shadowOpacity: 0,
    elevation: 0,
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
  selectorFieldWide: {
    flex: 1.2,
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
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurface : theme.colors.surfaceElevated,
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
    backgroundColor: theme.colors.surfaceElevated,
    elevation: 1,
    shadowColor: theme.colors.textPrimary,
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
  historyBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    ...theme.components.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalList: {
    gap: spacing.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.lg,
  },
  recentList: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
