/** TripResultsScreen — Search results list with loading/error/empty states
 *
 * Visual style: matches Parcel home (gradient bg, card surfaces, mint palette)
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { SlidersHorizontal, ArrowLeft } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { LoadingState, EmptyState, ErrorState } from '../components';
import { TripCard } from '../components/TripCard';
import { useBookingStore } from '../store/useBookingStore';
import type { BookingStackParamList } from '@app/navigation/types';
import type { BusTrip } from '../types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'RouteResults'>;
type RoutePropType = RouteProp<BookingStackParamList, 'RouteResults'>;

export function TripResultsScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { departureId, destinationId } = route.params;

  const {
    tripResultsStatus,
    trips,
    searchTrips,
    selectTrip,
    selectedTrip,
  } = useBookingStore();

  useEffect(() => {
    searchTrips();
  }, [searchTrips]);

  const handleTripPress = useCallback(
    (trip: BusTrip) => {
      selectTrip(trip);
      navigation.navigate('SeatSelection', { tripId: trip.id });
    },
    [navigation, selectTrip],
  );

  const handleRetry = useCallback(() => {
    searchTrips();
  }, [searchTrips]);

  const renderContent = () => {
    if (tripResultsStatus === 'loading') {
      return <LoadingState />;
    }
    if (tripResultsStatus === 'error') {
      return <ErrorState onRetry={handleRetry} />;
    }
    if (tripResultsStatus === 'empty') {
      return (
        <EmptyState
          title="No rides found today"
          subtitle="Try adjusting your filters or checking a different date."
          actionLabel="Clear Filters"
          onAction={handleRetry}
        />
      );
    }
    return (
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={handleTripPress}
            isSelected={selectedTrip?.id === item.id}
          />
        )}
      />
    );
  };

  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="resultsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.1} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#resultsGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <View style={styles.backBubble}>
              <ArrowLeft size={20} color={colors.primary} weight="bold" />
            </View>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerRoute}>
              {departureId} → {destinationId}
            </Text>
            <Text style={styles.headerDate}>Tomorrow, 24 Oct</Text>
          </View>

          <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
            <SlidersHorizontal size={20} weight="bold" color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {renderContent()}
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
    height: 300,
    zIndex: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  backBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRoute: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  headerDate: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
});
