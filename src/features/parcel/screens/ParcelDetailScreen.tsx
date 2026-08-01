import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  MagnifyingGlass,
  WarningCircle,
  Wallet,
} from 'phosphor-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { ScannableCodeCard, StatusChip } from '@shared/components';
import { useThemedStyles } from '@shared/hooks';
import { useMotion } from '@shared/motion';
import type { AppTheme } from '@shared/theme';
import { getLocalizedApiErrorMessage } from '@shared/api/errors';
import { formatDateTime, formatVnd } from '@shared/utils/format';
import {
  toBackendPaymentMethod,
  type PaymentMethod,
} from '@shared/utils/paymentMethod';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { passengerHistoryKeys } from '@features/profile/api/passengerHistoryApi';
import { walletKeys } from '@features/profile/api/walletApi';
import { useWalletBalance } from '@features/profile/hooks/useWallet';
import {
  PaymentRedirectCoordinator,
} from '@shared/utils/paymentRedirect';
import type {
  ParcelStackParamList,
  RootStackParamList,
} from '@app/navigation/types';
import {
  useParcelDetail,
  useStartParcelDepositPayment,
  useStartParcelFinalPayment,
} from '../hooks/useParcelQueries';
import {
  ErrorView,
  ParcelPaymentMethodSelector,
} from '../components';
import { parcelKeys } from '../api/parcelApi';
import {
  getParcelCheckoutState,
  getParcelPaymentStage,
} from '../utils/parcelPayment';
import {
  isParcelTrackingEligible,
} from '../utils/parcelTracking';
import {
  getParcelDeliveryMethodPresentation,
  getParcelSizePresentation,
  getParcelStatusPresentation,
  PARCEL_ERROR_TRANSLATION_KEYS,
} from '../utils/parcelPresentation';

type ParcelDetailRouteProp = RouteProp<ParcelStackParamList, 'ParcelDetail'>;
type ParcelDetailNavProp = NativeStackNavigationProp<
  ParcelStackParamList,
  'ParcelDetail'
>;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

interface ParcelPhotoItem {
  key: string;
  label: string;
  uri: string;
}

const ParcelPhotoGallery = React.memo(function ParcelPhotoGallery({
  photos,
}: {
  photos: readonly ParcelPhotoItem[];
}): React.JSX.Element | null {
  const { t } = useTranslation();
  const { reduceMotion } = useMotion();
  const styles = useThemedStyles(createStyles);
  if (photos.length === 0) {
    return null;
  }

  return (
    <View style={styles.evidenceCard}>
      <Text style={styles.evidenceTitle}>
        {t('parcel.detail.photosTitle')}
      </Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        contentContainerStyle={styles.evidenceList}
        showsHorizontalScrollIndicator={false}
      >
        {photos.map(photo => (
          <View key={photo.key} style={styles.evidenceItem}>
            <Image
              accessibilityLabel={photo.label}
              source={{ uri: photo.uri }}
              recyclingKey={photo.uri}
              contentFit="cover"
              transition={reduceMotion ? 0 : 120}
              style={styles.evidenceImage}
            />
            <Text style={styles.evidenceLabel} numberOfLines={1}>
              {photo.label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

export function ParcelDetailScreen(): React.JSX.Element {
  const route = useRoute<ParcelDetailRouteProp>();
  const navigation = useNavigation<ParcelDetailNavProp>();
  const rootNav = useNavigation<RootNavProp>();
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const paymentRedirectCoordinator = React.useMemo(
    () => new PaymentRedirectCoordinator(),
    [],
  );
  const userId = useAuthStore(state => state.user?.id);
  const {
    parcelId,
    fromHistory,
    paymentRedirectUrl,
    preferredPaymentMethod,
  } = route.params;
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    React.useState<PaymentMethod>(preferredPaymentMethod ?? 'vnpay');
  const [paymentSessionActive, setPaymentSessionActive] = React.useState(
    Boolean(paymentRedirectUrl),
  );
  const detailQuery = useParcelDetail(parcelId, paymentSessionActive);
  const refetchParcelDetail = detailQuery.refetch;
  const depositPaymentMutation = useStartParcelDepositPayment();
  const finalPaymentMutation = useStartParcelFinalPayment();
  const parcel = detailQuery.data;
  const paymentStage = getParcelPaymentStage(parcel?.status);
  const checkoutState = getParcelCheckoutState(parcel?.status);
  const paymentPending = checkoutState === 'awaiting_payment';
  const checkoutFailed = checkoutState === 'failed';
  const awaitingReview = checkoutState === 'awaiting_review';
  const needsAttention = checkoutState === 'attention';
  const deliveryCodeActive = checkoutState === 'active';
  const trackingAvailable = isParcelTrackingEligible(parcel?.status);
  const isSender = Boolean(userId && parcel?.senderUserId === userId);
  const statusPresentation = getParcelStatusPresentation(parcel?.status);
  const sizePresentation = getParcelSizePresentation(
    parcel?.actualSizeCategory
      ?? parcel?.estimatedSizeCategory
      ?? parcel?.sizeCategory,
  );
  const deliveryPresentation = getParcelDeliveryMethodPresentation(parcel?.deliveryMethod);
  const paymentAmount = paymentStage === 'deposit'
    ? Math.max(
        (parcel?.depositRequiredVnd ?? 0) - (parcel?.depositPaidVnd ?? 0),
        0,
      )
    : paymentStage === 'final'
    ? Math.max(
        (parcel?.balanceRequiredVnd ?? 0) - (parcel?.balancePaidVnd ?? 0),
        0,
      )
    : 0;
  const walletBalanceQuery = useWalletBalance(Boolean(paymentStage));
  const isStartingPayment =
    depositPaymentMutation.isPending || finalPaymentMutation.isPending;

  const parcelPhotos = React.useMemo<ParcelPhotoItem[]>(() => {
    const photos: ParcelPhotoItem[] = [];
    const seen = new Set<string>();
    const addPhoto = (
      uri: string | null | undefined,
      key: string,
      label: string,
    ) => {
      const normalizedUri = uri?.trim();
      if (!normalizedUri || seen.has(normalizedUri)) {
        return;
      }
      seen.add(normalizedUri);
      photos.push({
        key,
        label,
        uri: normalizedUri,
      });
    };

    addPhoto(
      parcel?.photoUrl,
      'submitted',
      t('parcel.detail.photos.submitted'),
    );
    parcel?.checkInPhotoUrls?.forEach((uri, index) => {
      addPhoto(
        uri,
        `check-in-${index}`,
        t('parcel.detail.photos.checkIn', { index: index + 1 }),
      );
    });
    parcel?.deliveryPhotoUrls?.forEach((uri, index) => {
      addPhoto(
        uri,
        `delivery-${index}`,
        t('parcel.detail.photos.delivery', { index: index + 1 }),
      );
    });
    return photos;
  }, [
    parcel?.checkInPhotoUrls,
    parcel?.deliveryPhotoUrls,
    parcel?.photoUrl,
    t,
  ]);

  React.useEffect(() => {
    if (paymentRedirectUrl && parcel?.status && !paymentStage) {
      navigation.setParams({ paymentRedirectUrl: undefined });
    }
    if (parcel?.status && !paymentStage) {
      setPaymentSessionActive(false);
    }
  }, [navigation, parcel?.status, paymentRedirectUrl, paymentStage]);

  React.useEffect(() => {
    if (
      selectedPaymentMethod === 'wallet'
      && !walletBalanceQuery.isLoading
      && (
        walletBalanceQuery.isError
        || walletBalanceQuery.data?.balance === undefined
        || walletBalanceQuery.data.balance < paymentAmount
      )
    ) {
      setSelectedPaymentMethod('vnpay');
    }
  }, [
    paymentAmount,
    selectedPaymentMethod,
    walletBalanceQuery.data?.balance,
    walletBalanceQuery.isError,
    walletBalanceQuery.isLoading,
  ]);

  const invalidatePaymentQueries = React.useCallback((): void => {
    if (!userId) {
      return;
    }

    Promise.all([
      queryClient.invalidateQueries({
        queryKey: parcelKeys.detail(userId, parcelId),
      }),
      queryClient.invalidateQueries({
        queryKey: passengerHistoryKeys.user(userId),
      }),
      queryClient.invalidateQueries({
        queryKey: walletKeys.user(userId),
      }),
    ]).catch(() => undefined);
  }, [parcelId, queryClient, userId]);

  const handleTrack = React.useCallback(() => {
    navigation.navigate('ParcelTracking', { parcelId });
  }, [navigation, parcelId]);

  const handleGoHome = React.useCallback(() => {
    rootNav.navigate('Main', { screen: 'Home' });
  }, [rootNav]);

  const handleBack = React.useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefreshPayment = React.useCallback(() => {
    refetchParcelDetail().catch(() => undefined);
  }, [refetchParcelDetail]);

  const handleContinuePayment = React.useCallback(() => {
    if (!paymentRedirectUrl || paymentRedirectCoordinator.isRunning) return;

    paymentRedirectCoordinator.open(paymentRedirectUrl).catch(() => {
      Alert.alert(
        t('parcel.payment.redirectErrorTitle'),
        t('parcel.payment.redirectErrorDescription'),
      );
    });
  }, [paymentRedirectCoordinator, paymentRedirectUrl, t]);

  const handleStartPayment = React.useCallback(async () => {
    if (!paymentStage || isStartingPayment) {
      return;
    }

    try {
      const input = {
        parcelId,
        paymentMethod: toBackendPaymentMethod(selectedPaymentMethod),
      };
      const result = paymentStage === 'deposit'
        ? await depositPaymentMutation.mutateAsync(input)
        : await finalPaymentMutation.mutateAsync(input);

      setPaymentSessionActive(true);
      navigation.setParams({
        paymentRedirectUrl: result.paymentRedirectUrl ?? undefined,
        preferredPaymentMethod: selectedPaymentMethod,
      });
      invalidatePaymentQueries();

      if (result.paymentRedirectUrl) {
        try {
          await paymentRedirectCoordinator.open(result.paymentRedirectUrl);
        } catch {
          Alert.alert(
            t('parcel.payment.redirectErrorTitle'),
            t('parcel.payment.redirectErrorDescription'),
          );
        }
      }
    } catch (error) {
      Alert.alert(
        t('parcel.payment.startErrorTitle'),
        getLocalizedApiErrorMessage(
          error,
          t,
          PARCEL_ERROR_TRANSLATION_KEYS,
        ),
      );
    }
  }, [
    depositPaymentMutation,
    finalPaymentMutation,
    invalidatePaymentQueries,
    isStartingPayment,
    navigation,
    parcelId,
    paymentRedirectCoordinator,
    paymentStage,
    selectedPaymentMethod,
    t,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <Pressable
          accessibilityLabel={fromHistory
            ? t('common.back')
            : t('parcel.actions.backToDashboard')}
          accessibilityRole="button"
          style={styles.navButton}
          onPress={fromHistory ? handleBack : handleGoHome}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>
          {fromHistory
            ? t('parcel.detail.historyTitle')
            : t('parcel.detail.ticketTitle')}
        </Text>
        <View style={styles.navSpacer} />
      </View>

      {detailQuery.isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateText}>
            {t('parcel.detail.loading')}
          </Text>
        </View>
      ) : detailQuery.isError ? (
        <View style={styles.errorWrap}>
          <ErrorView onRetry={handleRefreshPayment} />
          <Text style={styles.errorText}>
            {getLocalizedApiErrorMessage(
              detailQuery.error,
              t,
              PARCEL_ERROR_TRANSLATION_KEYS,
            )}
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
                  ? t('parcel.detail.state.unavailableTitle')
                  : paymentPending
                  ? paymentStage === 'final'
                    ? t('parcel.detail.state.finalPaymentTitle')
                    : t('parcel.detail.state.depositTitle')
                  : awaitingReview
                  ? t('parcel.detail.state.awaitingReviewTitle')
                  : needsAttention
                  ? t('parcel.detail.state.attentionTitle')
                  : t('parcel.detail.state.createdTitle')}
              </Text>
              <Text style={styles.successSubtitle}>
                {checkoutFailed
                  ? t('parcel.detail.state.unavailableDescription')
                  : paymentPending
                  ? paymentStage === 'final'
                    ? t('parcel.detail.state.finalPaymentDescription')
                    : t('parcel.detail.state.depositDescription')
                  : awaitingReview
                  ? t('parcel.detail.state.awaitingReviewDescription')
                  : needsAttention
                  ? t('parcel.detail.state.attentionDescription')
                  : t('parcel.detail.state.createdDescription')}
              </Text>
            </View>
          ) : null}

          <View style={styles.ticketCard}>
            <View style={styles.qrSection}>
              {deliveryCodeActive && parcel?.parcelCode ? (
                <ScannableCodeCard
                  code={parcel.parcelCode}
                  title={t('parcel.detail.dropoffCode')}
                  description={t('parcel.detail.dropoffCodeHint')}
                  size={156}
                />
              ) : null}
              <Text style={styles.qrCaption}>
                {checkoutFailed
                  ? t('parcel.detail.code.unavailableRequest')
                  : paymentPending
                  ? paymentStage === 'final'
                    ? t('parcel.detail.code.afterFinalPayment')
                    : t('parcel.detail.code.afterDeposit')
                  : awaitingReview
                  ? t('parcel.detail.code.afterApproval')
                  : needsAttention
                  ? t('parcel.detail.code.unavailableStatus')
                  : t('parcel.detail.code.showAtDropoff')}
              </Text>
              {deliveryCodeActive ? null : (
                <Text selectable style={styles.ticketIdText}>
                  {parcel?.parcelCode || parcelId}
                </Text>
              )}
              <StatusChip
                label={t(statusPresentation.labelKey)}
                tone={statusPresentation.tone}
              />
            </View>

            <View style={styles.dashedDivider}>
              <View style={styles.sideCutoutLeft} />
              <View style={styles.sideCutoutRight} />
            </View>

            <View style={styles.detailsSection}>
              <View style={styles.routeRow}>
                <View style={styles.routeItem}>
                  <Text style={styles.routeLabel}>
                    {t('parcel.route.from')}
                  </Text>
                  <Text style={styles.routeName}>
                    {parcel?.originStationName ||
                      t('parcel.route.originTerminal')}
                  </Text>
                </View>
                <View style={styles.routeItem}>
                  <Text style={[styles.routeLabel, styles.textRight]}>
                    {t('parcel.route.to')}
                  </Text>
                  <Text style={[styles.routeName, styles.textRight]}>
                    {parcel?.destinationStationName ||
                      t('parcel.route.destinationTerminal')}
                  </Text>
                </View>
              </View>

              <View style={styles.specsGrid}>
                <View style={styles.gridItem}>
                  <Text style={styles.specLabel}>
                    {t('parcel.detail.packageSize')}
                  </Text>
                  <Text style={styles.specValue}>
                    {t(sizePresentation.labelKey)}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.specLabel}>
                    {t('parcel.weight.title')}
                  </Text>
                  <Text style={styles.specValue}>
                    {parcel?.actualWeightKg ?? parcel?.estimatedWeightKg ?? '-'}{' '}
                    {t('parcel.units.kg')}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.specLabel}>
                    {t('parcel.detail.delivery')}
                  </Text>
                  <Text style={styles.specValue}>
                    {t(deliveryPresentation.labelKey)}
                  </Text>
                </View>
                {isSender ? (
                  <View style={styles.gridItem}>
                    <Text style={styles.specLabel}>
                      {t('parcel.detail.recipient')}
                    </Text>
                    <Text style={styles.specValue}>
                      {parcel?.recipientName || '-'}
                    </Text>
                  </View>
                ) : null}
                {isSender ? (
                  <View style={styles.gridItem}>
                    <Text style={styles.specLabel}>
                      {t('parcel.detail.payment')}
                    </Text>
                    <View style={styles.paymentMethodLabel}>
                      <Wallet
                        size={12}
                        color={theme.colors.primary}
                        weight="bold"
                      />
                      <Text style={styles.specValue}>
                        {(parcel?.balanceRequiredVnd ?? 0) > 0
                          ? t('parcel.detail.depositAndBalance')
                          : t('parcel.detail.deposit')}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {parcel?.description ? (
                <View style={styles.noteBox}>
                  <Text style={styles.specLabel}>
                    {t('parcel.detail.description')}
                  </Text>
                  <Text style={styles.noteText}>{parcel.description}</Text>
                </View>
              ) : null}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {parcel?.actualSizeCategory
                    ? t('parcel.detail.finalTotal')
                    : t('parcel.detail.estimatedTotal')}
                </Text>
                <Text style={styles.totalValue}>
                  {formatVnd(
                    parcel?.actualSizeCategory
                      ? parcel.finalTotalPriceVnd
                      : parcel?.estimatedTotalPriceVnd ?? 0,
                    {
                    display: 'code',
                    clampNegative: true,
                    },
                  )}
                </Text>
              </View>
              <View style={styles.settlementRow}>
                <Text style={styles.settlementLabel}>
                  {t('parcel.detail.depositPaid')}
                </Text>
                <Text style={styles.settlementValue}>
                  {formatVnd(parcel?.depositPaidVnd ?? 0)} /{' '}
                  {formatVnd(parcel?.depositRequiredVnd ?? 0)}
                </Text>
              </View>
              {(parcel?.balanceRequiredVnd ?? 0) > 0 ? (
                <View style={styles.settlementRow}>
                  <Text style={styles.settlementLabel}>
                    {t('parcel.detail.remainingBalance')}
                  </Text>
                  <Text style={styles.settlementValue}>
                    {formatVnd(parcel?.balancePaidVnd ?? 0)} /{' '}
                    {formatVnd(parcel?.balanceRequiredVnd ?? 0)}
                  </Text>
                </View>
              ) : null}
              {(parcel?.refundDueVnd ?? 0) > 0 ? (
                <View style={styles.settlementRow}>
                  <Text style={styles.settlementLabel}>
                    {t('parcel.detail.refundDue')}
                  </Text>
                  <Text style={styles.refundValue}>
                    {formatVnd(parcel?.refundDueVnd ?? 0)}
                  </Text>
                </View>
              ) : null}
              {(parcel?.discountAmountVnd ?? 0) > 0 ? (
                <View style={styles.discountRow}>
                  <Text style={styles.discountLabel}>
                    {t('parcel.detail.voucherDiscount')}
                  </Text>
                  <Text style={styles.discountValue}>
                    -
                    {formatVnd(parcel?.discountAmountVnd ?? 0, {
                      display: 'code',
                      clampNegative: true,
                    })}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <ParcelPhotoGallery photos={parcelPhotos} />

          {paymentPending && isSender ? (
            <View style={styles.paymentActionCard}>
              <View style={styles.paymentActionHeader}>
                <View style={styles.paymentActionIcon}>
                  <CreditCard
                    size={22}
                    color={theme.colors.primary}
                    weight="duotone"
                  />
                </View>
                <View style={styles.paymentActionCopy}>
                  <Text style={styles.paymentActionTitle}>
                    {paymentStage === 'final'
                      ? t('parcel.payment.payRemainingBalance')
                      : t('parcel.payment.payDeposit')}
                  </Text>
                  <Text style={styles.paymentActionAmount}>
                    {formatVnd(paymentAmount)}
                  </Text>
                </View>
              </View>

              {paymentStage === 'final' && parcel?.finalPaymentDeadline ? (
                <Text style={styles.paymentDeadline}>
                  {t('parcel.payment.payBefore', {
                    deadline: formatDateTime(parcel.finalPaymentDeadline),
                  })}
                </Text>
              ) : null}

              {paymentRedirectUrl ? (
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
                  <Text style={styles.trackButtonText}>
                    {t('parcel.payment.openVnPayAgain')}
                  </Text>
                </Pressable>
              ) : paymentSessionActive ? (
                <View style={styles.verifyingPayment}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                  <View style={styles.verifyingPaymentCopy}>
                    <Text style={styles.verifyingPaymentTitle}>
                      {t('parcel.payment.verifyingTitle')}
                    </Text>
                    <Text style={styles.verifyingPaymentText}>
                      {t('parcel.payment.verifyingDescription')}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={handleRefreshPayment}
                  >
                    <Text style={styles.refreshPaymentText}>
                      {t('parcel.actions.refresh')}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <ParcelPaymentMethodSelector
                    value={selectedPaymentMethod}
                    onChange={setSelectedPaymentMethod}
                    requiredAmount={paymentAmount}
                    walletBalance={walletBalanceQuery.data?.balance}
                    walletIsLoading={walletBalanceQuery.isLoading}
                    walletHasError={walletBalanceQuery.isError}
                    disabled={isStartingPayment}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isStartingPayment }}
                    disabled={isStartingPayment}
                    style={({ pressed }) => [
                      styles.trackButton,
                      isStartingPayment ? styles.trackButtonDisabled : null,
                      pressed && !isStartingPayment ? styles.pressed : null,
                    ]}
                    onPress={handleStartPayment}
                  >
                    {isStartingPayment ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.textInverse}
                      />
                    ) : (
                      <CreditCard
                        size={18}
                        color={theme.colors.textInverse}
                        weight="bold"
                      />
                    )}
                    <Text style={styles.trackButtonText}>
                      {isStartingPayment
                        ? t('parcel.payment.starting')
                        : selectedPaymentMethod === 'wallet'
                        ? t('parcel.payment.payWithWallet')
                        : t('parcel.payment.continueToVnPay')}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
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
                ? t('parcel.tracking.openStatus')
                : t('parcel.tracking.startsAfterLoading')}
            </Text>
          </Pressable>

          {fromHistory ? (
            <Pressable style={styles.homeButton} onPress={handleBack}>
              <Text style={styles.homeButtonText}>
                {t('common.back')}
              </Text>
            </Pressable>
          ) : (
            <Pressable style={styles.homeButton} onPress={handleGoHome}>
              <Text style={styles.homeButtonText}>
                {t('parcel.actions.backToDashboard')}
              </Text>
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
    textAlign: 'center',
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
  evidenceCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  evidenceTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    marginBottom: spacing.md,
  },
  evidenceList: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  evidenceItem: {
    width: 148,
  },
  evidenceImage: {
    width: 148,
    height: 108,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surfaceAlt,
  },
  evidenceLabel: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
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
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  settlementLabel: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  settlementValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  refundValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.success,
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
  paymentActionCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  paymentActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  paymentActionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
  },
  paymentActionCopy: {
    flex: 1,
  },
  paymentActionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  paymentActionAmount: {
    marginTop: 2,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.primary,
  },
  paymentDeadline: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  verifyingPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primaryFaded,
  },
  verifyingPaymentCopy: {
    flex: 1,
  },
  verifyingPaymentTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  verifyingPaymentText: {
    marginTop: 2,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  refreshPaymentText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  trackButton: {
    ...theme.components.primaryButton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
    textAlign: 'center',
    flexShrink: 1,
  },
  homeButton: {
    ...theme.components.secondaryButton,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
