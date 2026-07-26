import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  MagnifyingGlass,
  Package,
  QrCode,
  WarningCircle,
  Wallet,
} from 'phosphor-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { getApiErrorMessage } from '@shared/api/errors';
import { formatVnd } from '@shared/utils/format';
import {
  getPaymentRedirectErrorMessage,
  openPaymentRedirect,
  PAYMENT_REDIRECT_ERROR_TITLE,
} from '@shared/utils/paymentRedirect';
import type {
  ParcelStackParamList,
  RootStackParamList,
} from '@app/navigation/types';
import { useParcelDetail } from '../hooks/useParcelQueries';
import { ErrorView } from '../components';
import { getParcelCheckoutState } from '../utils/parcelPayment';
import {
  formatParcelStatusLabel,
  isParcelTrackingEligible,
} from '../utils/parcelTracking';

type ParcelDetailRouteProp = RouteProp<ParcelStackParamList, 'ParcelDetail'>;
type ParcelDetailNavProp = NativeStackNavigationProp<
  ParcelStackParamList,
  'ParcelDetail'
>;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export function ParcelDetailScreen(): React.JSX.Element {
  const route = useRoute<ParcelDetailRouteProp>();
  const navigation = useNavigation<ParcelDetailNavProp>();
  const rootNav = useNavigation<RootNavProp>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { parcelId, fromHistory, paymentRedirectUrl } = route.params;
  const detailQuery = useParcelDetail(parcelId, !fromHistory);
  const parcel = detailQuery.data;
  const checkoutState = getParcelCheckoutState(parcel?.status);
  const paymentPending = checkoutState === 'awaiting_payment';
  const checkoutFailed = checkoutState === 'failed';
  const awaitingReview = checkoutState === 'awaiting_review';
  const needsAttention = checkoutState === 'attention';
  const deliveryCodeActive = checkoutState === 'active';
  const trackingAvailable = isParcelTrackingEligible(parcel?.status);

  React.useEffect(() => {
    if (paymentRedirectUrl && parcel?.status && !paymentPending) {
      navigation.setParams({ paymentRedirectUrl: undefined });
    }
  }, [navigation, parcel?.status, paymentPending, paymentRedirectUrl]);

  const handleTrack = () => {
    navigation.navigate('ParcelTracking', { parcelId });
  };

  const handleGoHome = () => {
    rootNav.navigate('Main', { screen: 'Home' });
  };

  const handleContinuePayment = async () => {
    if (!paymentRedirectUrl) {
      return;
    }

    try {
      await openPaymentRedirect(paymentRedirectUrl);
    } catch (error) {
      Alert.alert(
        PAYMENT_REDIRECT_ERROR_TITLE,
        getPaymentRedirectErrorMessage(error),
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <Pressable
          style={styles.navButton}
          onPress={fromHistory ? () => navigation.goBack() : handleGoHome}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>
          {fromHistory ? 'Delivery Detail' : 'Delivery Ticket'}
        </Text>
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
          <Text style={styles.errorText}>
            {getApiErrorMessage(detailQuery.error)}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!fromHistory ? (
            <View style={styles.successHeader}>
              {checkoutFailed || needsAttention ? (
                <WarningCircle
                  size={56}
                  color={
                    checkoutFailed
                      ? theme.colors.error
                      : theme.colors.warning
                  }
                  weight="duotone"
                />
              ) : paymentPending || awaitingReview ? (
                <Clock
                  size={56}
                  color={theme.colors.warning}
                  weight="duotone"
                />
              ) : (
                <CheckCircle
                  size={56}
                  color={theme.colors.success}
                  weight="fill"
                />
              )}
              <Text style={styles.successTitle}>
                {checkoutFailed
                  ? 'Parcel request unavailable'
                  : paymentPending
                  ? 'Confirming payment'
                  : awaitingReview
                  ? 'Awaiting operator review'
                  : needsAttention
                  ? 'Parcel requires attention'
                  : 'Parcel request created'}
              </Text>
              <Text style={styles.successSubtitle}>
                {checkoutFailed
                  ? 'This request can no longer continue. Check its status or create a new parcel request.'
                  : paymentPending
                  ? 'Complete payment, then return to VietRide. The server will verify the result.'
                  : awaitingReview
                  ? 'The operator must approve this parcel before payment and delivery.'
                  : needsAttention
                  ? 'Review the latest parcel status before continuing. The delivery code is temporarily unavailable.'
                  : 'Your parcel request is ready for the next delivery step.'}
              </Text>
            </View>
          ) : null}

          <View style={styles.ticketCard}>
            <View style={styles.qrSection}>
              <View style={styles.qrContainer}>
                <QrCode
                  size={128}
                  color={
                    deliveryCodeActive
                      ? theme.colors.textPrimary
                      : theme.colors.textTertiary
                  }
                  weight="light"
                />
              </View>
              <Text style={styles.qrCaption}>
                {checkoutFailed
                  ? 'The delivery code is unavailable for this request.'
                  : paymentPending
                  ? 'This delivery code activates after payment is verified.'
                  : awaitingReview
                  ? 'This delivery code activates after operator approval.'
                  : needsAttention
                  ? 'The delivery code is unavailable for the current parcel status.'
                  : 'Show this parcel code at the terminal drop-off.'}
              </Text>
              <Text style={styles.ticketIdText}>
                {parcel?.parcelCode || parcelId}
              </Text>
              <View style={styles.statusPill}>
                <Package size={14} color={theme.colors.primary} weight="fill" />
                <Text style={styles.statusPillText}>
                  {formatParcelStatusLabel(parcel?.status)}
                </Text>
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
                  <Text style={styles.specValue}>
                    {parcel?.sizeCategory || '-'}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.specLabel}>WEIGHT</Text>
                  <Text style={styles.specValue}>
                    {parcel?.actualWeightKg ?? parcel?.estimatedWeightKg ?? '-'}{' '}
                    kg
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.specLabel}>RECIPIENT</Text>
                  <Text style={styles.specValue}>
                    {parcel?.recipientName || '-'}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.specLabel}>PAYMENT</Text>
                  <View style={styles.paymentMethodLabel}>
                    <Wallet
                      size={12}
                      color={theme.colors.primary}
                      weight="bold"
                    />
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
                    -
                    {formatVnd(parcel.discountAmount, {
                      display: 'code',
                      clampNegative: true,
                    })}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {paymentPending && paymentRedirectUrl ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.trackButton,
                pressed ? styles.pressed : null,
              ]}
              onPress={handleContinuePayment}
            >
              <CreditCard
                size={18}
                color={theme.colors.textInverse}
                weight="bold"
              />
              <Text style={styles.trackButtonText}>Continue payment</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !trackingAvailable }}
            disabled={!trackingAvailable}
            style={({ pressed }) => [
              styles.trackButton,
              !trackingAvailable ? styles.trackButtonDisabled : null,
              pressed && trackingAvailable ? styles.pressed : null,
            ]}
            onPress={handleTrack}
          >
            <MagnifyingGlass
              size={18}
              color={theme.colors.textInverse}
              weight="bold"
            />
            <Text style={styles.trackButtonText}>
              {trackingAvailable
                ? 'Track Shipment Status'
                : 'Tracking unavailable'}
            </Text>
          </Pressable>

          {fromHistory ? (
            <Pressable
              style={styles.homeButton}
              onPress={() => navigation.goBack()}
            >
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
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
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
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surface,
    borderRadius: borderRadius.xl,
    ...theme.effects.floatingShadow,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorderStrong
      : theme.colors.divider,
    overflow: 'visible',
    marginBottom: spacing.xxl,
  },
  qrSection: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  qrContainer: {
    padding: spacing.md,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
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
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
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
    borderRightColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
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
    borderLeftColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
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
    borderTopColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
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
    borderTopColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
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
  trackButtonDisabled: {
    opacity: 0.45,
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
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
