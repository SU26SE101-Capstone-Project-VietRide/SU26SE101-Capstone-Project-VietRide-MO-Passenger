import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { CheckCircle, QrCode, ArrowLeft, House, MagnifyingGlass, Wallet } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParcelStackParamList, RootStackParamList } from '@app/navigation/types';

type ParcelDetailRouteProp = RouteProp<ParcelStackParamList, 'ParcelDetail'>;
type ParcelDetailNavProp = NativeStackNavigationProp<ParcelStackParamList, 'ParcelDetail'>;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export function ParcelDetailScreen(): React.JSX.Element {
  const route = useRoute<ParcelDetailRouteProp>();
  const navigation = useNavigation<ParcelDetailNavProp>();
const rootNav = useNavigation<RootNavProp>();
  const { parcelId } = route.params;

  const handleTrack = () => {
    navigation.navigate('ParcelTracking', { parcelId });
  };

  const handleGoHome = () => {
    rootNav.navigate('Main', { screen: 'Home' });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navButton} onPress={handleGoHome} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Delivery Ticket</Text>
        <TouchableOpacity style={styles.navButton} onPress={handleGoHome} activeOpacity={0.7}>
          <House size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Header Status */}
        <View style={styles.successHeader}>
          <CheckCircle size={56} color={colors.success} weight="fill" />
          <Text style={styles.successTitle}>Booking Successful!</Text>
          <Text style={styles.successSubtitle}>Your delivery request is confirmed.</Text>
        </View>

        {/* Ticket Box Card (simulating a premium ticket stub layout) */}
        <View style={styles.ticketCard}>
          {/* Ticket Header QR */}
          <View style={styles.qrSection}>
            <View style={styles.qrContainer}>
              <QrCode size={128} color={colors.textPrimary} weight="light" />
            </View>
            <Text style={styles.qrCaption}>Scan this QR at the terminal drop-off</Text>
            <Text style={styles.ticketIdText}>Shipment Ref: {parcelId}</Text>
          </View>

          <View style={styles.dashedDivider}>
            <View style={styles.sideCutoutLeft} />
            <View style={styles.sideCutoutRight} />
          </View>

          {/* Ticket Specs */}
          <View style={styles.detailsSection}>
            <View style={styles.routeRow}>
              <View style={styles.routeItem}>
                <Text style={styles.routeLabel}>FROM</Text>
                <Text style={styles.routeName}>FUTA Mien Dong Station</Text>
                <Text style={styles.routeCity}>Ho Chi Minh City</Text>
              </View>
              <View style={styles.routeItem}>
                <Text style={[styles.routeLabel, { textAlign: 'right' }]}>TO</Text>
                <Text style={[styles.routeName, { textAlign: 'right' }]}>FUTA Sapa Office</Text>
                <Text style={[styles.routeCity, { textAlign: 'right' }]}>Sapa</Text>
              </View>
            </View>

            <View style={styles.specsGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.specLabel}>PACKAGE SIZE</Text>
                <Text style={styles.specValue}>Medium (Box / Clothes)</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.specLabel}>WEIGHT</Text>
                <Text style={styles.specValue}>2.5 kg</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.specLabel}>CATEGORY</Text>
                <Text style={styles.specValue}>Documents</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.specLabel}>PAYMENT METHOD</Text>
                <View style={styles.paymentMethodLabel}>
                  <Wallet size={12} color={colors.primary} weight="bold" />
                  <Text style={styles.specValue}>VietRide Wallet</Text>
                </View>
              </View>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Amount Paid</Text>
              <Text style={styles.totalValue}>₫85,000</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.trackButton} onPress={handleTrack} activeOpacity={0.85}>
          <MagnifyingGlass size={18} color={colors.textInverse} weight="bold" />
          <Text style={styles.trackButtonText}>Track Shipment Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeButton} onPress={handleGoHome} activeOpacity={0.8}>
          <Text style={styles.homeButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
  },
  navTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  successTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'visible',
    marginBottom: spacing.xxl,
  },
  qrSection: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  qrContainer: {
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  qrCaption: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  ticketIdText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  dashedDivider: {
    height: 2,
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    position: 'relative',
    marginVertical: spacing.sm,
  },
  sideCutoutLeft: {
    position: 'absolute',
    left: -10,
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  sideCutoutRight: {
    position: 'absolute',
    right: -10,
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.background,
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
  },
  detailsSection: {
    padding: spacing.xl,
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  routeItem: {
    flex: 1,
  },
  routeLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  routeName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  routeCity: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
  },
  gridItem: {
    width: '50%',
    marginBottom: spacing.md,
  },
  specLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  specValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
  },
  paymentMethodLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  totalLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  totalValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.primary,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    gap: spacing.sm,
    ...shadows.sm,
    marginBottom: spacing.sm,
  },
  trackButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
  homeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  homeButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
});
