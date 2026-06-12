/** CheckoutScreen — Contact info + pick-up point + drop-off point selection
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 * Added: pick-up point selector (in addition to existing drop-off)
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft, PencilSimple } from 'phosphor-react-native';
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
    searchParams,
  } = useBookingStore();

  const [showDropOff, setShowDropOff] = useState(false);

  const handleNext = useCallback(() => {
    navigation.navigate('Payment', {
      bookingId: 'mock-booking',
      amount: totalPrice(),
    });
  }, [navigation, totalPrice]);

  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="checkoutGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2AC1BC" stopOpacity={0.1} />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#checkoutGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Header with back bubble */}
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
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Contact Info Card */}
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

          {/* Pick-up Point Card */}
          <SectionCard>
            <Text style={styles.cardTitle}>Pick-up Point</Text>
            <View style={styles.pickupDisplay}>
              <View style={styles.pickupIconBox}>
                <ArrowLeft size={18} color={colors.primary} weight="bold" style={{ transform: [{ rotate: '180deg' }] }} />
              </View>
              <View style={styles.pickupTextWrap}>
                <Text style={styles.pickupLabel}>Boarding at</Text>
                <Text style={styles.pickupValue}>
                  {searchParams.from || 'Origin city'}
                </Text>
              </View>
            </View>
            <Text style={styles.pickupHint}>
              Board at the main terminal of {searchParams.from || 'your departure city'}.
            </Text>
          </SectionCard>

          {/* Drop-off Point Card */}
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
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
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
  pickupDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1.2,
    borderColor: colors.divider,
  },
  pickupIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupTextWrap: {
    flex: 1,
  },
  pickupLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  pickupValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  pickupHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
