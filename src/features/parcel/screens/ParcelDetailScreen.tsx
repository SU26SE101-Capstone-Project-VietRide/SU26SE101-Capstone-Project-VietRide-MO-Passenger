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
  openVnPayPayment,
  assertVnPaySdkAvailable,
  VnPayPaymentOpenCoordinator,
} from '@shared/payments';
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
import { formatParcelDimensions } from '../config/parcelPackage';
import {
  getParcelCheckoutState,
  getParcelPaymentStage,
} from '../utils/parcelPayment';
import {
  isParcelTrackingEligible,
} from '../utils/parcelTracking';
import {
  getParcelDeliveryMethodPresentation,
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

interface ParcelDetailFieldProps {
  compact?: boolean;
  label: string;
  value: string;
  variant?: 'default' | 'route';
}

const ParcelDetailField = React.memo(function ParcelDetailField({
  compact = false,
  label,
  value,
  variant = 'default',
}: ParcelDetailFieldProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.detailField, compact ? styles.detailFieldCompact : null]}>
      <Text
        numberOfLines={compact ? 1 : undefined}
        ellipsizeMode="tail"
        style={styles.detailFieldLabel}
      >
        {label}
      </Text>
      <Text
        selectable
        numberOfLines={compact ? 2 : undefined}
        style={variant === 'route' ? styles.routeName : styles.detailFieldValue}
      >
        {value}
      </Text>
    </View>
  );
});

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
  const paymentOpenCoordinator = React.useMemo(
    () => new VnPayPaymentOpenCoordinator(),
    [],
  );
  const lastVnPayChargeRef = React.useRef<{
    paymentRedirectUrl: string | null;
    depositPaymentId?: string | null;
    balancePaymentId?: string | null;
    vnpaySdk?: {
      tmnCode: string;
      scheme: string;
      isSandbox: boolean;
    } | null;
  } | null>(null);
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
  const packageDimensions = parcel
    ? parcel.actualLengthCm !== null
      && parcel.actualWidthCm !== null
      && parcel.actualHeightCm !== null
      ? formatParcelDimensions({
          lengthCm: parcel.actualLengthCm,
          widthCm: parcel.actualWidthCm,
          heightCm: parcel.actualHeightCm,
        })
      : formatParcelDimensions({
          lengthCm: parcel.estimatedLengthCm,
          widthCm: parcel.estimatedWidthCm,
          heightCm: parcel.estimatedHeightCm,
        })
    : '-';
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
    navigation.navigate('ParcelTracking', {
      parcelId,
      ...(route.params.trackingTarget
        ? { trackingTarget: route.params.trackingTarget }
        : {}),
    });
  }, [navigation, parcelId, route.params.trackingTarget]);

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
    const charge = lastVnPayChargeRef.current;
    if (
      !userId
      || !charge?.paymentRedirectUrl
      || !charge.vnpaySdk
      || paymentOpenCoordinator.isRunning) {
      return;
    }

    paymentOpenCoordinator
      .open({
        result: {
          paymentRedirectUrl: charge.paymentRedirectUrl,
          depositPaymentId: charge.depositPaymentId,
          balancePaymentId: charge.balancePaymentId,
          vnpaySdk: charge.vnpaySdk,
        },
        kind: paymentStage === 'final' ? 'parcel_final' : 'parcel_deposit',
        businessId: parcelId,
        ownerUserId: userId,
      })
      .catch(() => {
        Alert.alert(
          t('parcel.payment.redirectErrorTitle'),
          t('parcel.payment.redirectErrorDescription'),
        );
      });
  }, [parcelId, paymentOpenCoordinator, paymentStage, t, userId]);

  const handleStartPayment = React.useCallback(async () => {
    if (!paymentStage || isStartingPayment) {
      return;
    }

    try {
    if (selectedPaymentMethod === 'vnpay') {
      if (!userId) return;
      try {
        assertVnPaySdkAvailable();
      } catch {
        Alert.alert(
          t('parcel.payment.redirectErrorTitle'),
          t('paymentReturn.errors.nativeUnavailable'),
        );
        return;
      }
    }

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

      if (result.paymentRedirectUrl && selectedPaymentMethod === 'vnpay') {
        lastVnPayChargeRef.current = {
          paymentRedirectUrl: result.paymentRedirectUrl,
          depositPaymentId:
            'depositPaymentId' in result ? result.depositPaymentId : null,
          balancePaymentId:
            'balancePaymentId' in result ? result.balancePaymentId : null,
          vnpaySdk: result.vnpaySdk ?? null,
        };

        try {
          await openVnPayPayment({
            result,
            kind: paymentStage === 'deposit' ? 'parcel_deposit' : 'parcel_final',
            businessId: parcelId,
            ownerUserId: userId!,
          });
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
    paymentStage,
    selectedPaymentMethod,
    t,
    userId,
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
        <Text numberOfLines={1} style={styles.navTitle}>
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
                style={styles.centeredStatusChip}
              />
            </View>

            <View style={styles.dashedDivider}>
              <View style={styles.sideCutoutLeft} />
              <View style={styles.sideCutoutRight} />
            </View>

            <View style={styles.detailsSection}>
              <View style={styles.routeList}>
                <ParcelDetailField
                  label={t('parcel.route.from')}
                  value={parcel?.originStationName || t('parcel.route.originTerminal')}
                  variant="route"
                />
                <ParcelDetailField
                  label={t('parcel.route.to')}
                  value={parcel?.destinationStationName || t('parcel.route.destinationTerminal')}
                  variant="route"
                />
              </View>

              <View style={styles.detailsDivider} />

              <View style={styles.detailList}>
                <View style={styles.detailFieldRow}>
                  <ParcelDetailField
                    compact
                    label={t('parcel.detail.packageSize')}
                    value={packageDimensions}
                  />
                  <ParcelDetailField
                    compact
                    label={t('parcel.weight.title')}
                    value={`${parcel?.actualWeightKg ?? parcel?.estimatedWeightKg ?? '-'} ${t('parcel.units.kg')}`}
                  />
                </View>
                {isSender ? (
                  <View style={styles.detailFieldRow}>
                    <ParcelDetailField
                      compact
                      label={t('parcel.detail.delivery')}
                      value={t(deliveryPresentation.labelKey)}
                    />
                    <ParcelDetailField
                      compact
                      label={t('parcel.detail.recipient')}
                      value={parcel?.recipientName || '-'}
                    />
                  </View>
                ) : (
                  <ParcelDetailField
                    label={t('parcel.detail.delivery')}
                    value={t(deliveryPresentation.labelKey)}
                  />
                )}
                {isSender ? (
                  <ParcelDetailField
                    label={t('parcel.detail.payment')}
                    value={(parcel?.balanceRequiredVnd ?? 0) > 0
                      ? t('parcel.detail.depositAndBalance')
                      : t('parcel.detail.deposit')}
                  />
                ) : null}
              </View>

              {parcel?.description ? (
                <View style={styles.noteBox}>
                  <Text style={styles.detailFieldLabel}>
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
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.contentBorderStrong
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
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
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
    alignSelf: 'stretch',
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  successSubtitle: {
    alignSelf: 'stretch',
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  ticketCard: {
    ...theme.components.elevatedCard,
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
  centeredStatusChip: {
    alignSelf: 'center' as const,
  },
  qrContainer: {
    padding: spacing.md,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  qrCaption: {
    alignSelf: 'stretch',
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
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
      ? theme.effects.contentBorder
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
      ? theme.effects.contentBorder
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
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  detailsSection: {
    padding: spacing.xl,
  },
  routeList: {
    gap: spacing.md,
  },
  detailsDivider: {
    height: 1,
    marginVertical: spacing.lg,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  detailList: {
    gap: spacing.md,
  },
  detailFieldRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.md,
  },
  detailField: {
    minWidth: 0,
    gap: 4,
  },
  detailFieldCompact: {
    flex: 1,
    minWidth: 0,
  },
  detailFieldLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  routeName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
  detailFieldValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: theme.colors.textPrimary,
  },
  noteBox: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
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
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  totalLabel: {
    flex: 1,
    flexShrink: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    flexShrink: 1,
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
    flexShrink: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  refundValue: {
    flexShrink: 1,
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
    flex: 1,
    flexShrink: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  discountValue: {
    flexShrink: 1,
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
