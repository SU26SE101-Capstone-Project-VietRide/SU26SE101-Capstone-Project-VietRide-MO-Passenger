import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { CheckCircle, QrCode, ArrowLeft, MagnifyingGlass, Wallet } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParcelStackParamList, RootStackParamList } from '@app/navigation/types';

type ParcelDetailRouteProp = RouteProp<ParcelStackParamList, 'ParcelDetail'>;
type ParcelDetailNavProp = NativeStackNavigationProp<ParcelStackParamList, 'ParcelDetail'>;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export function ParcelDetailScreen(): React.JSX.Element {
  const route = useRoute<ParcelDetailRouteProp>();
  const navigation = useNavigation<ParcelDetailNavProp>();
  const rootNav = useNavigation<RootNavProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { parcelId, fromHistory } = route.params;

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
        <Pressable style={styles.navButton} onPress={fromHistory ? () => navigation.goBack() : handleGoHome}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>{fromHistory ? 'Delivery Detail' : 'Delivery Ticket'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Header Status */}
        {!fromHistory ? (
          <View style={styles.successHeader}>
            <CheckCircle size={56} color={theme.colors.success} weight="fill" />
            <Text style={styles.successTitle}>Booking Successful!</Text>
            <Text style={styles.successSubtitle}>Your delivery request is confirmed.</Text>
          </View>
        ) : null}

        {/* Ticket Box Card (simulating a premium ticket stub layout) */}
        <View style={styles.ticketCard}>
          {/* Ticket Header QR */}
          <View style={styles.qrSection}>
            <View style={styles.qrContainer}>
              <QrCode size={128} color={theme.colors.textPrimary} weight="light" />
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
                  <Wallet size={12} color={theme.colors.primary} weight="bold" />
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
        <Pressable style={styles.trackButton} onPress={handleTrack}>
          <MagnifyingGlass size={18} color={theme.colors.textInverse} weight="bold" />
          <Text style={styles.trackButtonText}>Track Shipment Status</Text>
        </Pressable>

        {fromHistory ? (
          <Pressable style={styles.homeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.homeButtonText}>Go Back</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Back to Dashboard</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  navButton: {
    ...theme.components.headerButton,
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  navTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
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
    color: theme.colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  ticketCard: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderRadius: borderRadius.xl,
    ...theme.effects.floatingShadow,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.divider,
    overflow: 'visible',
    marginBottom: spacing.xxl,
  },
  qrSection: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  qrContainer: {
    padding: spacing.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  qrCaption: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  ticketIdText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  dashedDivider: {
    height: 2,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
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
    backgroundColor: theme.colors.background,
    borderRightWidth: 1,
    borderRightColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  sideCutoutRight: {
    position: 'absolute',
    right: -10,
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.background,
    borderLeftWidth: 1,
    borderLeftColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
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
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  routeName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  routeCity: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  specValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
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
    borderTopColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  totalLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.primary,
  },
  trackButton: {
    ...theme.components.primaryButton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  trackButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
  homeButton: {
    ...theme.components.secondaryButton,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  homeButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
});
