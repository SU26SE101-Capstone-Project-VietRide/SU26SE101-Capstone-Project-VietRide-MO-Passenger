/**
 * BusSearchScreen — Landing screen of the booking flow
 *
 * Features: From/To inputs with swap, date & passenger pickers,
 * "Search Buses" CTA, Popular Routes, Recent Searches.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import {
  MOCK_POPULAR_ROUTES,
  MOCK_RECENT_SEARCHES,
} from '../data/mockData';
import type { BookingStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'SearchRoutes'>;

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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FF" />

      {/* Ambient glow */}
      <View style={styles.ambientGlow} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <View style={styles.greetingText}>
            <Text style={styles.greetingEmoji}>Hello! 👋</Text>
            <Text style={styles.greetingSubtitle}>
              Where are we speeding{'\n'}off to today?
            </Text>
          </View>
        </View>

        {/* Search Card */}
        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>Find Your Bus</Text>

          {/* From Input */}
          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Text style={styles.inputIconText}>📍</Text>
            </View>
            <TouchableOpacity style={styles.inputField}>
              <Text style={searchParams.from ? styles.inputValue : styles.inputPlaceholder}>
                {searchParams.from || 'From (e.g. Hanoi)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Swap Button */}
          <View style={styles.swapRow}>
            <View style={styles.swapLine} />
            <TouchableOpacity onPress={swapCities} style={styles.swapButton}>
              <Text style={styles.swapIcon}>⇅</Text>
            </TouchableOpacity>
            <View style={styles.swapLine} />
          </View>

          {/* To Input */}
          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Text style={styles.inputIconText}>📍</Text>
            </View>
            <TouchableOpacity style={styles.inputField}>
              <Text style={searchParams.to ? styles.inputValue : styles.inputPlaceholder}>
                {searchParams.to || 'To (e.g. Sapa)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date & Passengers row */}
          <View style={styles.datePassRow}>
            <TouchableOpacity style={styles.halfInput}>
              <Text style={styles.halfInputIcon}>📅</Text>
              <Text style={styles.halfInputText}>{searchParams.date}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.halfInput}>
              <Text style={styles.halfInputIcon}>👤</Text>
              <Text style={styles.halfInputText}>
                {searchParams.passengers} Pass
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search CTA */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSearch}
            style={styles.searchButton}
          >
            <Text style={styles.searchButtonText}>Search Buses</Text>
          </TouchableOpacity>
        </View>

        {/* Popular Routes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Routes</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See all →</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MOCK_POPULAR_ROUTES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.horizontalList}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.routeCard}>
              <View
                style={[
                  styles.routeGradient,
                  { backgroundColor: item.gradientColors[0] },
                ]}
              >
                <View style={styles.routeBadge}>
                  <Text style={styles.routeBadgeText}>🔥 Hot</Text>
                </View>
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>
                  {item.from}
                  <Text style={styles.routeArrow}> → </Text>
                  {item.to}
                </Text>
                <Text style={styles.routePrice}>{item.price}</Text>
              </View>
            </View>
          )}
        />

        {/* Recent Searches */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xxl }]}>
          Recent Searches
        </Text>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MOCK_RECENT_SEARCHES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.horizontalList}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.recentCard}>
              <View>
                <Text style={styles.recentRoute}>{item.route}</Text>
                <Text style={styles.recentDate}>{item.date}</Text>
              </View>
              <TouchableOpacity style={styles.recentButton}>
                <Text style={styles.recentButtonIcon}>→</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
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
  greetingEmoji: {
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
  searchCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    ...shadows.lg,
    marginBottom: spacing.xxl,
  },
  searchTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 56,
  },
  inputIcon: {
    width: 24,
    marginRight: spacing.md,
  },
  inputIconText: {
    fontSize: 16,
  },
  inputField: {
    flex: 1,
    justifyContent: 'center',
  },
  inputPlaceholder: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textTertiary,
  },
  inputValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  swapLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
    ...shadows.sm,
  },
  swapIcon: {
    fontSize: 18,
    color: colors.primary,
  },
  datePassRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  halfInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  halfInputIcon: {
    fontSize: 14,
    marginRight: spacing.sm,
  },
  halfInputText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.lg,
  },
  searchButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textInverse,
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
  routeCard: {
    width: 150,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    overflow: 'hidden',
  },
  routeGradient: {
    height: 96,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    justifyContent: 'flex-end',
    padding: spacing.sm,
  },
  routeBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  routeBadgeText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textInverse,
  },
  routeInfo: {
    padding: spacing.lg,
  },
  routeName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  routeArrow: {
    color: colors.textSecondary,
  },
  routePrice: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  recentCard: {
    width: 256,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  recentRoute: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  recentDate: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  recentButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentButtonIcon: {
    fontSize: 16,
    color: colors.primary,
    fontFamily: fontFamilies.bold,
  },
});
