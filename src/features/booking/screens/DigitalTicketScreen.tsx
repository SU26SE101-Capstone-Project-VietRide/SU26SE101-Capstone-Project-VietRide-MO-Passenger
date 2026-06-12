/** DigitalTicketScreen — Ticket confirmation screen
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { CheckCircle, ArrowLeft, MagnifyingGlass } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { AmbientGlow, TicketCard, SaveQrFab } from '../components';
import { MOCK_BOOKING_RESULT } from '../data/mockData';
import type { BookingStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList>;

export function DigitalTicketScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const ticket = MOCK_BOOKING_RESULT;

  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="400" width="100%">
          <Defs>
            <LinearGradient id="ticketGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.12} />
              <Stop offset="60%" stopColor="#2AC1BC" stopOpacity={0.04} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#ticketGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header with back bubble */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.popToTop()}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <View style={styles.backBubble}>
              <ArrowLeft size={20} color={colors.primary} weight="bold" />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Confirmed</Text>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => {}}>
            <View style={styles.backBubble}>
              <MagnifyingGlass size={18} color={colors.primary} weight="bold" />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success header */}
          <View style={styles.successHeader}>
            <View style={styles.successIconWrap}>
              <CheckCircle size={56} color={colors.success} weight="fill" />
            </View>
            <Text style={styles.successTitle}>Booking Successful!</Text>
            <Text style={styles.successSubtitle}>
              Your ticket is ready. Show this QR code to the driver.
            </Text>
          </View>

          <AmbientGlow top={40} left={-80} size={400} opacity={0.08} />

          {/* Ticket Card */}
          <TicketCard ticket={ticket} />

          {/* View My Bookings CTA */}
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => {}}
            activeOpacity={0.85}
          >
            <MagnifyingGlass size={18} color={colors.textInverse} weight="bold" />
            <Text style={styles.trackButtonText}>View My Bookings</Text>
          </TouchableOpacity>

          <SaveQrFab onPress={() => {}} />
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
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 120,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    marginTop: spacing.xl,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 48,
    gap: spacing.sm,
    ...shadows.sm,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  trackButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
});
