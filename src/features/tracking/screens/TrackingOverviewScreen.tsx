import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MagnifyingGlass,
  Truck,
  User,
  CaretRight,
  Package,
} from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TrackingStackParamList } from '@app/navigation/types';

// Mock active passenger bus trip
const ACTIVE_BUS_TRIPS = [
  {
    id: 'VR-3829',
    route: 'HCMC ➔ Da Lat',
    departureTime: '10:00 AM',
    expectedArrivalTime: '04:30 PM',
    status: 'in_transit',
    driverName: 'Nguyen Van A',
    licensePlate: '49B-882.91',
    busNumber: 'FUTA-104',
    rating: 4.9,
    fromStationName: 'Mien Dong Bus Station',
    toStationName: 'Da Lat Interprovincial Station',
    fromCity: 'Ho Chi Minh City',
    toCity: 'Da Lat',
  },
];

// Mock active parcel shipments
const ACTIVE_PARCEL_SHIPMENTS = [
  {
    id: 'VR-8829',
    route: 'HCMC ➔ Sapa',
    status: 'in_transit',
    date: 'Expected: tomorrow',
    fromStationName: 'FUTA Mien Dong Station',
    toStationName: 'FUTA Sapa Office',
  },
];

type TrackingOverviewNavProp = NativeStackNavigationProp<TrackingStackParamList, 'TrackingOverview'>;

export function TrackingOverviewScreen(): React.JSX.Element {
  const navigation = useNavigation<TrackingOverviewNavProp>();

  // State
  const [activeTab, setActiveTab] = useState<'bus' | 'parcel'>('bus');
  const [searchCode, setSearchCode] = useState('');

  const handleTrackBus = (tripId: string) => {
    navigation.navigate('TripTracker', { tripId });
  };

  const handleTrackParcel = (parcelId: string) => {
    // Navigate to parcel tracking screen within the sibling Stack Navigator!
    // Since MainTab holds 'Parcel', we can trigger standard global nested navigation
    navigation.navigate('Parcel', {
      screen: 'ParcelTracking',
      params: { parcelId },
    } as any);
  };

  const handleSearchCode = () => {
    const code = searchCode.trim().toUpperCase();
    if (!code) {
      alert('Please enter a valid tracking code.');
      return;
    }
    
    if (code.includes('3829') || code === 'VR-3829') {
      navigation.navigate('TripTracker', { tripId: 'VR-3829' });
    } else if (code.includes('8829') || code === 'VR-8829') {
      handleTrackParcel('VR-8829');
    } else {
      alert('Trip or Shipment code not found. Try "VR-3829" or "VR-8829".');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Title Navbar */}
      <View style={styles.navbar}>
        <Text style={styles.navbarTitle}>Live Tracker</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search bar input container */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionLabel}>Track by Reference Code</Text>
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. VR-3829, VR-8829"
              placeholderTextColor={colors.textTertiary}
              value={searchCode}
              onChangeText={setSearchCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearchCode} activeOpacity={0.8}>
              <MagnifyingGlass size={20} color={colors.textInverse} weight="bold" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Segmented Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'bus' && styles.tabButtonActive]}
            onPress={() => setActiveTab('bus')}
            activeOpacity={0.7}
          >
            <Truck size={18} color={activeTab === 'bus' ? colors.primary : colors.textSecondary} weight={activeTab === 'bus' ? 'fill' : 'regular'} />
            <Text style={[styles.tabText, activeTab === 'bus' && styles.tabTextActive]}>Bus Trips</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'parcel' && styles.tabButtonActive]}
            onPress={() => setActiveTab('parcel')}
            activeOpacity={0.7}
          >
            <Package size={18} color={activeTab === 'parcel' ? colors.primary : colors.textSecondary} weight={activeTab === 'parcel' ? 'fill' : 'regular'} />
            <Text style={[styles.tabText, activeTab === 'parcel' && styles.tabTextActive]}>Parcel Shipments</Text>
          </TouchableOpacity>
        </View>

        {/* Listings panel */}
        <View style={styles.listSection}>
          <Text style={styles.listHeading}>
            {activeTab === 'bus' ? 'Active Bookings' : 'Ongoing Deliveries'}
          </Text>

          {activeTab === 'bus' ? (
            ACTIVE_BUS_TRIPS.map((trip) => (
              <View key={trip.id} style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <View>
                    <Text style={styles.tripRefText}>Trip Ref: {trip.id}</Text>
                    <Text style={styles.tripRouteText}>{trip.route}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <View style={styles.statusBadgeDot} />
                    <Text style={styles.statusBadgeText}>In Transit</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>DEPARTURE</Text>
                    <Text style={styles.metaValue}>{trip.departureTime}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>DRIVER</Text>
                    <View style={styles.driverMeta}>
                      <User size={14} color={colors.textSecondary} />
                      <Text style={styles.metaValue}>{trip.driverName}</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.trackActionBtn}
                  onPress={() => handleTrackBus(trip.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.trackActionText}>Track Live Location</Text>
                  <CaretRight size={16} color={colors.textInverse} weight="bold" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            ACTIVE_PARCEL_SHIPMENTS.map((shipment) => (
              <View key={shipment.id} style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <View>
                    <Text style={styles.tripRefText}>Shipment Ref: {shipment.id}</Text>
                    <Text style={styles.tripRouteText}>{shipment.route}</Text>
                  </View>
                  <View style={[styles.statusBadge, styles.statusBadgeTransit]}>
                    <View style={[styles.statusBadgeDot, styles.statusBadgeDotTransit]} />
                    <Text style={[styles.statusBadgeText, styles.statusBadgeTextTransit]}>Shipped</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>FROM STATION</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>{shipment.fromStationName}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>EXPECTED DELIVERY</Text>
                    <Text style={styles.metaValue}>{shipment.date}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.trackActionBtn, styles.trackActionBtnParcel]}
                  onPress={() => handleTrackParcel(shipment.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.trackActionText}>Track Parcel Timeline</Text>
                  <CaretRight size={16} color={colors.textInverse} weight="bold" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Padding to clear bottom tabs */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navbar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navbarTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  searchSection: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    height: 48,
    paddingLeft: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  searchButton: {
    width: 48,
    height: '100%',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.xl,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: fontFamilies.bold,
  },
  listSection: {},
  listHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tripRefText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.primary,
  },
  tripRouteText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentDark,
  },
  statusBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.accentDark,
  },
  statusBadgeTransit: {
    backgroundColor: colors.successLight,
  },
  statusBadgeDotTransit: {
    backgroundColor: colors.success,
  },
  statusBadgeTextTransit: {
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  metaValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 44,
    gap: spacing.xs,
    ...shadows.sm,
  },
  trackActionBtnParcel: {
    backgroundColor: colors.success,
  },
  trackActionText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textInverse,
  },
});
