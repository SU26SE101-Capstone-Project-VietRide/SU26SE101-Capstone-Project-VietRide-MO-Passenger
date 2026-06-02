/**
 * CheckoutScreen — Contact info + drop-off point selection
 *
 * Shows contact form, drop-off point selector, timer pill,
 * and floating bottom bar. Tapping a drop-off point opens the DropOffSheet.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import { FloatingActionBar } from '../components/FloatingActionBar';
import { DropOffSheet } from '../components/DropOffSheet';
import type { BookingStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'BookingConfirmation'>;

export function CheckoutScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const {
    contactInfo,
    selectedSeats,
    totalPrice,
    dropOffPoints,
    selectedDropOff,
    selectDropOff,
  } = useBookingStore();

  const [showDropOff, setShowDropOff] = useState(false);
  const [timer, setTimer] = useState(599); // 9:59

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNext = useCallback(() => {
    navigation.navigate('Payment', {
      bookingId: 'mock-booking',
      amount: totalPrice(),
    });
  }, [navigation, totalPrice]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FF" />
      <View style={styles.ambientGlow} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.timerPill}>
          <Text style={styles.timerIcon}>⏱️</Text>
          <Text style={styles.timerText}>{formatTimer(timer)}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Contact Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Contact Info</Text>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{contactInfo.fullName}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>
                  {contactInfo.phoneCountryCode}
                </Text>
                <Text style={styles.countryCodeArrow}>▾</Text>
              </View>
              <View style={styles.phoneInput}>
                <Text style={styles.phoneText}>{contactInfo.phone}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email Address</Text>
            <Text style={styles.infoValue}>{contactInfo.email}</Text>
          </View>
        </View>

        {/* Drop-off Point Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Drop-off Point</Text>
          <View style={styles.dropOffRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowDropOff(true)}
              style={styles.dropOffOption}
            >
              <Text style={styles.dropOffEmoji}>🏢</Text>
              <Text style={styles.dropOffLabel}>Terminal</Text>
              <Text style={styles.dropOffSublabel}>Bus Station</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowDropOff(true)}
              style={[styles.dropOffOption, styles.dropOffOptionActive]}
            >
              <Text style={styles.dropOffEmoji}>📍</Text>
              <Text style={[styles.dropOffLabel, styles.dropOffLabelActive]}>
                Along Route
              </Text>
              <Text style={styles.dropOffSublabel}>Flexible stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedSeats={selectedSeats}
        totalPrice={totalPrice()}
        ctaLabel="Next"
        onPress={handleNext}
      />

      {/* Drop-off Sheet */}
      <DropOffSheet
        visible={showDropOff}
        onClose={() => setShowDropOff(false)}
        points={dropOffPoints}
        currentPointId={selectedDropOff?.id || ''}
        onConfirm={(point) => {
          selectDropOff(point);
          setShowDropOff(false);
        }}
      />
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
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: colors.textPrimary,
    fontFamily: fontFamilies.bold,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
  },
  timerIcon: {
    fontSize: 12,
  },
  timerText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.error,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 220,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  editIcon: {
    fontSize: 14,
  },
  infoRow: {
    marginBottom: spacing.lg,
  },
  infoLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoValue: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.lg,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  countryCodeText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  countryCodeArrow: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  phoneText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  dropOffRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dropOffOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  dropOffOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  dropOffEmoji: {
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  dropOffLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  dropOffLabelActive: {
    color: colors.primary,
  },
  dropOffSublabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
});
