/**
 * CheckoutScreen — Contact info + drop-off point selection
 *
 * Uses the new shared primitives:
 *  - ScreenHeader (with TimerPill)
 *  - SectionCard + InfoRow (contact info)
 *  - RadioOption (drop-off type)
 *  - FloatingActionBar (bottom CTA)
 *
 * The DropOffSheet is still used for the detailed point list.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PencilSimple } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { useBookingStore } from '../store/useBookingStore';
import {
  ScreenHeader,
  FloatingActionBar,
  DropOffSheet,
  SectionCard,
  InfoRow,
  RadioOption,
} from '../components';
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

  const handleNext = useCallback(() => {
    navigation.navigate('Payment', {
      bookingId: 'mock-booking',
      amount: totalPrice(),
    });
  }, [navigation, totalPrice]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScreenHeader
        title="Checkout"
        onBackPress={() => navigation.goBack()}
        showTimer
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Contact Info Card ───────────────────────── */}
        <SectionCard>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Contact Info</Text>
            <TouchableOpacity style={styles.editButton}>
              <PencilSimple size={14} weight="bold" color={colors.primary} />
            </TouchableOpacity>
          </View>

          <InfoRow label="Full Name" value={contactInfo.fullName} />
          <InfoRow
            label="Phone Number"
            value={contactInfo.phone}
            showDivider
          />
          <InfoRow label="Email Address" value={contactInfo.email} />
        </SectionCard>

        {/* ── Drop-off Point Card ──────────────────────── */}
        <SectionCard>
          <Text style={styles.cardTitle}>Drop-off Point</Text>
          <RadioOption
            label="Terminal"
            sublabel="Bus Station"
            iconEmoji="🏢"
            selected={selectedDropOff?.name === 'Terminal'}
            onPress={() => setShowDropOff(true)}
          />
          <RadioOption
            label="Along Route"
            sublabel="Flexible stop"
            iconEmoji="📍"
            selected={selectedDropOff?.name !== 'Terminal'}
            onPress={() => setShowDropOff(true)}
          />
        </SectionCard>
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 220,
  },
  cardTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
