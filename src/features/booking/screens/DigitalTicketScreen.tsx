/**
 * DigitalTicketScreen — Confirmed booking ticket display
 *
 * Shows the digital ticket card with operator logo, CONFIRMED badge,
 * route codes, departure info, seat number, passenger name,
 * booking ref, barcode visualization, and "Save QR Code" FAB.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import { MOCK_BOOKING_RESULT } from '../data/mockData';
import type { BookingStackParamList } from '@app/navigation/types';

type NavProp = NativeStackNavigationProp<BookingStackParamList>;

export function DigitalTicketScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const ticket = MOCK_BOOKING_RESULT;

  // Barcode bars pattern
  const barcodeWidths = [4, 2, 6, 1, 3, 5, 2, 1, 4, 7, 2, 1, 3, 5, 2, 4, 1, 3, 6];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FF" />
      <View style={styles.ambientGlow} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.popToTop()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.shareButton}>
          <Text style={styles.shareIcon}>↗</Text>
        </TouchableOpacity>
      </View>

      {/* Ticket Card */}
      <View style={styles.ticketContainer}>
        {/* ── Top Section ────────────────────────── */}
        <View style={styles.ticketTop}>
          {/* Operator + Status */}
          <View style={styles.operatorRow}>
            <View style={styles.operatorLogo}>
              <Text style={styles.operatorLogoText}>🚌</Text>
            </View>
            <View style={styles.operatorInfo}>
              <Text style={styles.operatorName}>{ticket.operatorName}</Text>
              <Text style={styles.operatorSub}>{ticket.operatorSubtitle}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{ticket.status}</Text>
            </View>
          </View>

          {/* Route */}
          <View style={styles.routeSection}>
            <View style={styles.routeEndpoint}>
              <Text style={styles.routeCode}>{ticket.departureCode}</Text>
              <Text style={styles.routeCity}>{ticket.departureName}</Text>
            </View>

            <View style={styles.routeCenter}>
              <View style={styles.routeLine} />
              <View style={styles.routeIconBubble}>
                <Text style={styles.routeIconText}>✈️</Text>
              </View>
            </View>

            <View style={[styles.routeEndpoint, styles.routeEndpointRight]}>
              <Text style={styles.routeCode}>{ticket.arrivalCode}</Text>
              <Text style={[styles.routeCity, { textAlign: 'right' }]}>
                {ticket.arrivalName}
              </Text>
            </View>
          </View>

          {/* Bento Info Grid */}
          <View style={styles.bentoGrid}>
            <View style={styles.bentoCard}>
              <Text style={styles.bentoLabel}>DEPARTURE</Text>
              <Text style={styles.bentoValue}>{ticket.departureDate}</Text>
            </View>
            <View style={styles.bentoCard}>
              <Text style={styles.bentoLabel}>SEAT NUMBER</Text>
              <Text style={styles.bentoValueLarge}>{ticket.seatNumber}</Text>
            </View>
          </View>
        </View>

        {/* ── Physical Divider Notch ──────────────── */}
        <View style={styles.dividerRow}>
          <View style={styles.notchLeft} />
          <View style={styles.dividerLine} />
          <View style={styles.notchRight} />
        </View>

        {/* ── Bottom Section ──────────────────────── */}
        <View style={styles.ticketBottom}>
          {/* Passenger + Booking Ref */}
          <View style={styles.infoRow}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>PASSENGER</Text>
              <Text style={styles.infoValue}>{ticket.passengerName}</Text>
            </View>
            <View style={[styles.infoBlock, styles.infoBlockRight]}>
              <Text style={styles.infoLabel}>BOOKING REF</Text>
              <Text style={styles.infoValue}>{ticket.bookingRef}</Text>
            </View>
          </View>

          {/* Barcode */}
          <View style={styles.barcodeContainer}>
            <View style={styles.barcodeInner}>
              {barcodeWidths.map((w, i) => (
                <View
                  key={i}
                  style={[
                    styles.barcodeBar,
                    { width: w, marginRight: i < barcodeWidths.length - 1 ? (14 - w) : 0 },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Save QR Code FAB */}
      <TouchableOpacity activeOpacity={0.8} style={styles.fab}>
        <Text style={styles.fabIcon}>📱</Text>
        <Text style={styles.fabText}>Save QR Code</Text>
      </TouchableOpacity>
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
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    fontSize: 20,
    color: colors.textPrimary,
  },
  ticketContainer: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
    overflow: 'hidden',
  },
  ticketTop: {
    padding: spacing.xxl,
  },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  operatorLogo: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  operatorLogoText: {
    fontSize: 22,
  },
  operatorInfo: {
    flex: 1,
  },
  operatorName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  operatorSub: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: 'rgba(54, 179, 126, 0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: colors.success,
    letterSpacing: 1,
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xxl,
  },
  routeEndpoint: {
    flex: 1,
  },
  routeEndpointRight: {
    alignItems: 'flex-end',
  },
  routeCode: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h2,
    color: colors.textPrimary,
  },
  routeCity: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  routeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  routeLine: {
    width: 96,
    height: 2,
    backgroundColor: colors.divider,
  },
  routeIconBubble: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeIconText: {
    fontSize: 12,
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  bentoLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  bentoValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: fontSizes.md * 1.6,
  },
  bentoValueLarge: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h3,
    color: colors.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  notchLeft: {
    width: 16,
    height: 32,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#F7F9FF',
    marginLeft: -1,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.divider,
    marginHorizontal: spacing.sm,
  },
  notchRight: {
    width: 16,
    height: 32,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: '#F7F9FF',
    marginRight: -1,
  },
  ticketBottom: {
    padding: spacing.xxl,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: spacing.xxl,
  },
  infoBlock: {
    flex: 1,
  },
  infoBlockRight: {
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  infoValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  barcodeContainer: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  barcodeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 62,
  },
  barcodeBar: {
    height: 62,
    backgroundColor: colors.textPrimary,
    borderRadius: 1,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xxxl,
    left: spacing.huge,
    right: spacing.huge,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xl,
  },
  fabIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  fabText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
});
