import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, CheckCircle, MagnifyingGlass, Package, QrCode, Wallet } from 'phosphor-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { getApiErrorMessage } from '@shared/api/errors';
import { formatVnd } from '@shared/utils/format';
import type { ParcelStackParamList, RootStackParamList } from '@app/navigation/types';
import { useParcelDetail } from '../hooks/useParcelQueries';
import { ErrorView } from '../components';
import { formatParcelStatusLabel } from '../utils/parcelTracking';

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
  const detailQuery = useParcelDetail(parcelId);
  const parcel = detailQuery.data;

  const handleTrack = () => {
    navigation.navigate('ParcelTracking', { parcelId });
  };

  const handleGoHome = () => {
    rootNav.navigate('Main', { screen: 'Home' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <Pressable style={styles.navButton} onPress={fromHistory ? () => navigation.goBack() : handleGoHome}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>{fromHistory ? 'Delivery Detail' : 'Delivery Ticket'}</Text>
        <View style={styles.navSpacer} />
      </View>

      {detailQuery.isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading parcel detail...</Text>
        </View>
      ) : detailQuery.isError ? (
        <View style={styles.errorWrap}>
          <ErrorView onRetry={() => detailQuery.refetch()} />
          <Text style={styles.errorText}>{getApiErrorMessage(detailQuery.error)}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {!fromHistory ? (
            <View style={styles.successHeader}>
              <CheckCircle size={56} color={theme.colors.success} weight="fill" />
              <Text style={styles.successTitle}>Booking Successful</Text>
              <Text style={styles.successSubtitle}>Your parcel request has been created.</Text>
            </View>
          ) : null}

          <View style={styles.ticketCard}>
            <View style={styles.qrSection}>
              <View style={styles.qrContainer}>
                <QrCode size={128} color={theme.colors.textPrimary} weight="light" />
              </View>
              <Text style={styles.qrCaption}>Scan this QR at the terminal drop-off</Text>
              <Text style={styles.ticketIdText}>
                {parcel?.parcelCode || parcelId}
              </Text>
              <View style={styles.statusPill}>
                <Package size={14} color={theme.colors.primary} weight="fill" />
                <Text style={styles.statusPillText}>{formatParcelStatusLabel(parcel?.status)}</Text>
              </View>
            </View>

            <View style={styles.dashedDivider}>
              <View style={styles.sideCutoutLeft} />
              <View style={styles.sideCutoutRight} />
            </View>

            <View style={styles.detailsSection}>
              <View style={styles.routeRow}>
                <View style={styles.routeItem}>
                  <Text style={styles.routeLabel}>FROM</Text>
                  <Text style={styles.routeName}>
                    {parcel?.originStationName || 'Origin terminal'}
                  </Text>
                </View>
                <View style={styles.routeItem}>
                  <Text style={[styles.routeLabel, styles.textRight]}>TO</Text>
                  <Text style={[styles.routeName, styles.textRight]}>
                    {parcel?.destinationStationName || 'Destination terminal'}
                  </Text>
                </View>
              </View>

              <View style={styles.specsGrid}>
                <View style={styles.gridItem}>
                  <Text style={styles.specLabel}>PACKAGE SIZE</Text>
                  <Text style={styles.specValue}>{parcel?.sizeCategory || '-'}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.specLabel}>WEIGHT</Text>
                  <Text style={styles.specValue}>
                    {parcel?.actualWeightKg ?? parcel?.estimatedWeightKg ?? '-'} kg
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.specLabel}>RECIPIENT</Text>
                  <Text style={styles.specValue}>{parcel?.recipientName || '-'}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.specLabel}>PAYMENT</Text>
                  <View style={styles.paymentMethodLabel}>
                    <Wallet size={12} color={theme.colors.primary} weight="bold" />
                    <Text style={styles.specValue}>Deposit</Text>
                  </View>
                </View>
              </View>

              {parcel?.description ? (
                <View style={styles.noteBox}>
                  <Text style={styles.specLabel}>DESCRIPTION</Text>
                  <Text style={styles.noteText}>{parcel.description}</Text>
                </View>
              ) : null}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Deposit Due</Text>
                <Text style={styles.totalValue}>
                  {formatVnd(parcel?.depositAmount ?? 0, {
                    display: 'code',
                    clampNegative: true,
                  })}
                </Text>
              </View>
              {parcel?.discountAmount ? (
                <View style={styles.discountRow}>
                  <Text style={styles.discountLabel}>Voucher discount</Text>
                  <Text style={styles.discountValue}>
                    -{formatVnd(parcel.discountAmount, {
                      display: 'code',
                      clampNegative: true,
                    })}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

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
      )}
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
  navSpacer: {
    width: 36,
  },
  navTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stateText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
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
  statusPill: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  statusPillText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
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
    gap: spacing.md,
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
  textRight: {
    textAlign: 'right',
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
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
  noteBox: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  noteText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
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
    fontSize: fontSizes.lg,
    color: theme.colors.primary,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  discountLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  discountValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.success,
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
