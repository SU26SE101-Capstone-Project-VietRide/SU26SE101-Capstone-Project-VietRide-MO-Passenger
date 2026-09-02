import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  RouteProp,
  useIsFocused,
  useNavigation,
  usePreventRemove,
  useRoute,
} from '@react-navigation/native';
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
import { ScannableCodeCard, StatusChip, VnPayLogo } from '@shared/components';
import {
  useIsAppActive,
  useNetworkStatus,
  useThemedStyles,
} from '@shared/hooks';
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
import { useLiveWalletBalance } from '@features/profile/hooks/useWallet';
import {
  openVnPayPayment,
  assertVnPaySdkAvailable,
  getPendingVnPaySession,
  VnPayPaymentOpenCoordinator,
  type PendingVnPaySession,
} from '@shared/payments';
import {
  isParcelAmbiguousPaymentError,
  isPaymentAlreadyStartedError,
} from '../utils/parcelCreateErrors';
import {
  matchParcelVnPaySession,
  parcelPaymentKindForStage,
} from '../utils/parcelVnPaySession';
import type {
  ParcelStackParamList,
  RootStackParamList,
} from '@app/navigation/types';
import type { ParcelDetail } from '../types';
import { useParcelPaymentReturn } from '../hooks/useParcelPaymentReturn';
import {
  PARCEL_PAYMENT_STANDARD_REFETCH_INTERVAL_MS,
  PARCEL_PAYMENT_WALLET_REFETCH_INTERVAL_MS,
  useParcelDetail,
  useStartParcelDepositPayment,
  useStartParcelFinalPayment,
} from '../hooks/useParcelQueries';
import {
  ErrorView,
  ParcelCompensationDisclosure,
  ParcelPaymentMethodSelector,
} from '../components';
import { parcelKeys } from '../api/parcelApi';
import { formatParcelDimensions } from '../config/parcelPackage';
import {
  applyParcelPaymentResultToDetail,
  getParcelCheckoutState,
  getParcelDetailHeroCopy,
  getParcelPaymentStage,
  isParcelTransferQrRequired,
  isParcelPaymentPending,
} from '../utils/parcelPayment';
import { isParcelTrackingEligible } from '../utils/parcelTracking';
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

const PARCEL_PAYMENT_POLL_WINDOW_MS = 20_000;

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
    <View
      style={[styles.detailField, compact ? styles.detailFieldCompact : null]}
    >
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

const photoKeyExtractor = (item: ParcelPhotoItem): string => item.key;

const ParcelPhotoThumb = React.memo(function ParcelPhotoThumb({
  label,
  uri,
  transitionMs,
}: {
  label: string;
  uri: string;
  transitionMs: number;
}): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const imageSource = React.useMemo(() => ({ uri }), [uri]);

  return (
    <View style={styles.evidenceItem}>
      <Image
        accessibilityLabel={label}
        source={imageSource}
        recyclingKey={uri}
        contentFit="cover"
        transition={transitionMs}
        style={styles.evidenceImage}
      />
      <Text style={styles.evidenceLabel} numberOfLines={1}>
        {label}
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
  const transitionMs = reduceMotion ? 0 : 120;
  const renderPhoto = React.useCallback<ListRenderItem<ParcelPhotoItem>>(
    ({ item }) => (
      <ParcelPhotoThumb
        label={item.label}
        uri={item.uri}
        transitionMs={transitionMs}
      />
    ),
    [transitionMs],
  );

  if (photos.length === 0) {
    return null;
  }

  return (
    <View style={styles.evidenceCard}>
      <Text style={styles.evidenceTitle}>{t('parcel.detail.photosTitle')}</Text>
      <FlashList
        data={photos}
        horizontal
        keyExtractor={photoKeyExtractor}
        renderItem={renderPhoto}
        style={styles.evidenceStrip}
        contentContainerStyle={styles.evidenceList}
        showsHorizontalScrollIndicator={false}
      />
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
  const isFocused = useIsFocused();
  const isAppActive = useIsAppActive();
  const isOnline = useNetworkStatus();
  const paymentOpenCoordinator = React.useMemo(
    () => new VnPayPaymentOpenCoordinator(),
    [],
  );
  const userId = useAuthStore(state => state.user?.id);
  const { parcelId, fromHistory, paymentRedirectUrl, preferredPaymentMethod } =
    route.params;
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    React.useState<PaymentMethod>(preferredPaymentMethod ?? 'vnpay');
  const [paymentConfirmationMethod, setPaymentConfirmationMethod] =
    React.useState<PaymentMethod | null>(() =>
      paymentRedirectUrl ? 'vnpay' : preferredPaymentMethod ?? null,
    );
  const [paymentSessionActive, setPaymentSessionActive] = React.useState(
    Boolean(paymentRedirectUrl),
  );
  const [paymentPollingStartedAt, setPaymentPollingStartedAt] = React.useState<
    number | null
  >(() => (paymentRedirectUrl ? Date.now() : null));
  const beginPaymentPollingWindow = React.useCallback(() => {
    setPaymentPollingStartedAt(Date.now());
  }, []);
  const stopPaymentPollingWindow = React.useCallback(() => {
    setPaymentPollingStartedAt(null);
  }, []);
  const [reopenSession, setReopenSession] =
    React.useState<PendingVnPaySession | null>(null);
  const [detailAmbiguousRetry, setDetailAmbiguousRetry] = React.useState<{
    paymentMethod: PaymentMethod;
  } | null>(null);
  // Keep the fast detail poll scoped to an explicit, bounded reconciliation
  // window. The query hook additionally verifies that this user is the sender.
  const paymentReturnEnabled = isFocused && isAppActive && isOnline;
  const shouldPollPayment = Boolean(
    paymentSessionActive &&
      paymentPollingStartedAt !== null &&
      paymentReturnEnabled,
  );
  const paymentRefetchIntervalMs = shouldPollPayment
    ? paymentConfirmationMethod === 'wallet'
      ? PARCEL_PAYMENT_WALLET_REFETCH_INTERVAL_MS
      : PARCEL_PAYMENT_STANDARD_REFETCH_INTERVAL_MS
    : false;
  const detailQuery = useParcelDetail(parcelId, paymentRefetchIntervalMs);
  const [allowLeaveDespiteRetry, setAllowLeaveDespiteRetry] =
    React.useState(false);
  const refetchParcelDetail = detailQuery.refetch;
  const wasFocusedRef = React.useRef(isFocused);
  React.useEffect(() => {
    const wasFocused = wasFocusedRef.current;
    wasFocusedRef.current = isFocused;
    if (!wasFocused && isFocused) {
      refetchParcelDetail().catch(() => undefined);
    }
  }, [isFocused, refetchParcelDetail]);
  const depositPaymentMutation = useStartParcelDepositPayment();
  const finalPaymentMutation = useStartParcelFinalPayment();
  const parcel = detailQuery.data;
  const paymentStage = getParcelPaymentStage(parcel?.status);
  const checkoutState = getParcelCheckoutState(parcel?.status);
  const paymentPending = checkoutState === 'awaiting_payment';
  const activePaymentId =
    paymentStage === 'deposit'
      ? parcel?.depositPaymentId
      : paymentStage === 'final'
      ? parcel?.balancePaymentId
      : null;
  const paymentConfirmationActive = Boolean(
    paymentSessionActive || activePaymentId,
  );
  const walletConfirmationActive = Boolean(
    paymentConfirmationActive && paymentConfirmationMethod === 'wallet',
  );
  const transferQrRequired = isParcelTransferQrRequired(parcel?.status);
  const parcelQrVisible = checkoutState === 'active' || transferQrRequired;
  const heroCopy = getParcelDetailHeroCopy(checkoutState, paymentStage);
  const trackingAvailable = isParcelTrackingEligible(parcel?.status);
  const hasClaimSurface = Boolean(
    parcel?.reliabilitySummary?.claim ||
      parcel?.availableActions.some(
        action =>
          action === 'SUBMIT_CLAIM' ||
          action === 'ADD_EVIDENCE' ||
          action === 'APPEAL',
      ),
  );
  const isSender = Boolean(userId && parcel?.senderUserId === userId);
  const statusPresentation = getParcelStatusPresentation(parcel?.status);
  const expectedVnPayKind = parcelPaymentKindForStage(paymentStage);
  const paymentIntentLocked = detailAmbiguousRetry !== null;
  const lockedDetailPaymentMethod =
    detailAmbiguousRetry?.paymentMethod ?? selectedPaymentMethod;
  const packageDimensions = parcel
    ? parcel.actualLengthCm !== null &&
      parcel.actualWidthCm !== null &&
      parcel.actualHeightCm !== null
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
  const deliveryPresentation = getParcelDeliveryMethodPresentation(
    parcel?.deliveryMethod,
  );
  const depositOutstanding = Math.max(
    (parcel?.depositRequiredVnd ?? 0) - (parcel?.depositPaidVnd ?? 0),
    0,
  );
  const balanceOutstanding = Math.max(
    (parcel?.balanceRequiredVnd ?? 0) - (parcel?.balancePaidVnd ?? 0),
    0,
  );
  const hasFinalPrice =
    Boolean(parcel?.actualSizeCategory) ||
    (parcel?.balanceRequiredVnd ?? 0) > 0;
  const paymentAmount =
    paymentStage === 'deposit'
      ? depositOutstanding
      : paymentStage === 'final'
      ? balanceOutstanding
      : 0;
  const walletBalanceQuery = useLiveWalletBalance(Boolean(paymentStage));
  const isStartingPayment =
    depositPaymentMutation.isPending || finalPaymentMutation.isPending;
  const paymentReturn = useParcelPaymentReturn({
    parcelId,
    paymentPending,
    expectedKind: expectedVnPayKind,
    enabled: isSender && paymentPending && paymentReturnEnabled,
    refetchParcel: refetchParcelDetail,
  });
  const { checkNow: reconcileParcelPayment } = paymentReturn;
  const reconciledPaymentScopeRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!paymentPending || !activePaymentId) {
      if (!paymentPending) {
        reconciledPaymentScopeRef.current = null;
      }
      return;
    }

    setPaymentSessionActive(true);
    setPaymentConfirmationMethod(
      current => current ?? preferredPaymentMethod ?? null,
    );

    if (!paymentReturnEnabled) {
      return;
    }

    const scope = `${parcelId}:${activePaymentId}`;
    if (reconciledPaymentScopeRef.current === scope) {
      return;
    }
    reconciledPaymentScopeRef.current = scope;
    beginPaymentPollingWindow();
    reconcileParcelPayment().catch(() => undefined);
  }, [
    activePaymentId,
    beginPaymentPollingWindow,
    parcelId,
    paymentPending,
    paymentReturnEnabled,
    preferredPaymentMethod,
    reconcileParcelPayment,
  ]);

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
    if (paymentPollingStartedAt === null) {
      return;
    }

    const remainingMs =
      PARCEL_PAYMENT_POLL_WINDOW_MS - (Date.now() - paymentPollingStartedAt);
    if (remainingMs <= 0) {
      stopPaymentPollingWindow();
      return;
    }

    const timeoutId = setTimeout(stopPaymentPollingWindow, remainingMs);
    return () => clearTimeout(timeoutId);
  }, [paymentPollingStartedAt, stopPaymentPollingWindow]);

  React.useEffect(() => {
    if (paymentRedirectUrl && parcel?.status && !paymentStage) {
      navigation.setParams({ paymentRedirectUrl: undefined });
    }
    if (parcel?.status && !paymentStage) {
      setPaymentSessionActive(false);
      setPaymentConfirmationMethod(null);
      stopPaymentPollingWindow();
      reconciledPaymentScopeRef.current = null;
    }
  }, [
    navigation,
    parcel?.status,
    paymentRedirectUrl,
    paymentStage,
    stopPaymentPollingWindow,
  ]);

  React.useEffect(() => {
    if (paymentIntentLocked) {
      return;
    }
    if (
      selectedPaymentMethod === 'wallet' &&
      !walletBalanceQuery.isLoading &&
      (walletBalanceQuery.isError ||
        walletBalanceQuery.data?.balance === undefined ||
        walletBalanceQuery.data.balance < paymentAmount)
    ) {
      setSelectedPaymentMethod('vnpay');
    }
  }, [
    paymentAmount,
    selectedPaymentMethod,
    paymentIntentLocked,
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
  const wasPaymentPendingRef = React.useRef(paymentPending);

  React.useEffect(() => {
    const wasPaymentPending = wasPaymentPendingRef.current;
    wasPaymentPendingRef.current = paymentPending;
    if (wasPaymentPending && !paymentPending) {
      invalidatePaymentQueries();
    }
  }, [invalidatePaymentQueries, paymentPending]);

  const handleTrack = React.useCallback(() => {
    navigation.navigate('ParcelTracking', {
      parcelId,
      ...(route.params.trackingTarget
        ? { trackingTarget: route.params.trackingTarget }
        : {}),
    });
  }, [navigation, parcelId, route.params.trackingTarget]);

  const handleReportIncident = React.useCallback(() => {
    navigation.navigate('ReportParcelIncident', { parcelId });
  }, [navigation, parcelId]);

  const handleOpenClaim = React.useCallback(() => {
    navigation.navigate('ParcelClaim', { parcelId });
  }, [navigation, parcelId]);

  const handleGoHome = React.useCallback(() => {
    rootNav.navigate('Main', { screen: 'Home' });
  }, [rootNav]);

  const handleBack = React.useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  usePreventRemove(
    paymentIntentLocked && !allowLeaveDespiteRetry,
    ({ data }) => {
      Alert.alert(
        t('parcel.errors.leaveAmbiguousTitle'),
        t('parcel.errors.leaveAmbiguousDepositDescription'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('parcel.exitDraft.discard'),
            style: 'destructive',
            onPress: () => {
              setAllowLeaveDespiteRetry(true);
              requestAnimationFrame(() => navigation.dispatch(data.action));
            },
          },
        ],
      );
    },
  );

  const handleRefreshPayment = React.useCallback(() => {
    beginPaymentPollingWindow();
    reconcileParcelPayment().catch(() => undefined);
  }, [beginPaymentPollingWindow, reconcileParcelPayment]);

  const handleRetryDetail = React.useCallback(() => {
    refetchParcelDetail().catch(() => undefined);
  }, [refetchParcelDetail]);

  React.useEffect(() => {
    if (paymentReturn.phase === 'abandoned') {
      setPaymentSessionActive(false);
      stopPaymentPollingWindow();
      return;
    }
    if (paymentReturn.phase === 'awaiting_parcel') {
      setPaymentSessionActive(true);
      beginPaymentPollingWindow();
    }
  }, [
    beginPaymentPollingWindow,
    paymentReturn.phase,
    stopPaymentPollingWindow,
  ]);

  React.useEffect(() => {
    let cancelled = false;
    if (!paymentPending || !userId || !expectedVnPayKind) {
      setReopenSession(null);
      if (!paymentPending && paymentRedirectUrl) {
        navigation.setParams({ paymentRedirectUrl: undefined });
      }
      return;
    }

    getPendingVnPaySession()
      .then(session => {
        if (cancelled) return;
        const matches = matchParcelVnPaySession(session, {
          ownerUserId: userId,
          parcelId,
          kind: expectedVnPayKind,
        });
        setReopenSession(matches ? session : null);
        // Only drop this screen's route hint — never wipe another payment's session.
        if (!matches && paymentRedirectUrl) {
          navigation.setParams({ paymentRedirectUrl: undefined });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReopenSession(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    expectedVnPayKind,
    navigation,
    parcelId,
    paymentPending,
    paymentRedirectUrl,
    paymentSessionActive,
    userId,
  ]);

  const handleContinuePayment = React.useCallback(async () => {
    if (!userId || !expectedVnPayKind || paymentOpenCoordinator.isRunning) {
      return;
    }

    try {
      const session = await getPendingVnPaySession();
      if (
        !matchParcelVnPaySession(session, {
          ownerUserId: userId,
          parcelId,
          kind: expectedVnPayKind,
        })
      ) {
        setReopenSession(null);
        navigation.setParams({ paymentRedirectUrl: undefined });
        Alert.alert(
          t('parcel.errors.paymentSessionUnavailableTitle'),
          t('parcel.errors.paymentSessionUnavailable'),
        );
        return;
      }

      setPaymentSessionActive(true);
      beginPaymentPollingWindow();
      await paymentOpenCoordinator.reopen(session, userId);
    } catch {
      Alert.alert(
        t('parcel.payment.redirectErrorTitle'),
        t('parcel.payment.redirectErrorDescription'),
      );
    }
  }, [
    expectedVnPayKind,
    beginPaymentPollingWindow,
    navigation,
    parcelId,
    paymentOpenCoordinator,
    t,
    userId,
  ]);

  const handleStartPayment = React.useCallback(async () => {
    if (!paymentStage || isStartingPayment) {
      return;
    }

    const methodForRequest = lockedDetailPaymentMethod;

    try {
      if (methodForRequest === 'vnpay') {
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
        paymentMethod: toBackendPaymentMethod(methodForRequest),
      };
      const result = paymentIntentLocked
        ? paymentStage === 'deposit'
          ? await depositPaymentMutation.retryRetainedAsync()
          : await finalPaymentMutation.retryRetainedAsync()
        : paymentStage === 'deposit'
        ? await depositPaymentMutation.mutateAsync(input)
        : await finalPaymentMutation.mutateAsync(input);

      const paymentStillPending = isParcelPaymentPending(result.status);
      const resultPaymentId =
        'depositPaymentId' in result
          ? result.depositPaymentId
          : result.balancePaymentId;
      const shouldReconcileWalletImmediately =
        paymentStillPending &&
        methodForRequest === 'wallet' &&
        paymentReturnEnabled;

      if (shouldReconcileWalletImmediately && resultPaymentId) {
        // The query-cache update below can expose activePaymentId immediately.
        // Claim this scope first so its effect does not start a duplicate check.
        reconciledPaymentScopeRef.current = `${parcelId}:${resultPaymentId}`;
      }
      if (userId) {
        queryClient.setQueryData<ParcelDetail>(
          parcelKeys.detail(userId, parcelId),
          current =>
            applyParcelPaymentResultToDetail(current, paymentStage, result),
        );
      }
      setDetailAmbiguousRetry(null);
      setPaymentConfirmationMethod(
        paymentStillPending ? methodForRequest : null,
      );
      setPaymentSessionActive(paymentStillPending);
      if (paymentStillPending) {
        beginPaymentPollingWindow();
      } else {
        stopPaymentPollingWindow();
        setReopenSession(null);
      }
      navigation.setParams({
        paymentRedirectUrl: result.paymentRedirectUrl ?? undefined,
        preferredPaymentMethod: methodForRequest,
      });
      invalidatePaymentQueries();

      // Wallet returns directly to this screen, so reconcile from the mutation
      // response just like VNPay does from its SDK return signal. The bounded
      // detail polling remains a fallback for eventual Parcel status updates.
      if (shouldReconcileWalletImmediately) {
        reconcileParcelPayment().catch(() => undefined);
      }

      if (result.paymentRedirectUrl && methodForRequest === 'vnpay') {
        try {
          await openVnPayPayment({
            result,
            kind:
              paymentStage === 'deposit' ? 'parcel_deposit' : 'parcel_final',
            businessId: parcelId,
            ownerUserId: userId!,
          });
          const pending = await getPendingVnPaySession();
          setReopenSession(
            matchParcelVnPaySession(pending, {
              ownerUserId: userId!,
              parcelId,
              kind:
                paymentStage === 'deposit' ? 'parcel_deposit' : 'parcel_final',
            })
              ? pending
              : null,
          );
        } catch {
          Alert.alert(
            t('parcel.payment.redirectErrorTitle'),
            t('parcel.payment.redirectErrorDescription'),
          );
        }
      }
    } catch (error) {
      if (isPaymentAlreadyStartedError(error)) {
        setDetailAmbiguousRetry(null);
        setPaymentSessionActive(false);
        stopPaymentPollingWindow();
        await refetchParcelDetail().catch(() => undefined);
        Alert.alert(
          t('parcel.errors.paymentAlreadyStartedTitle'),
          t('parcel.errors.paymentAlreadyStartedDescription'),
        );
        return;
      }
      if (isParcelAmbiguousPaymentError(error)) {
        setDetailAmbiguousRetry({ paymentMethod: methodForRequest });
        Alert.alert(
          t('parcel.errors.ambiguousPaymentTitle'),
          t('parcel.errors.ambiguousPaymentDescription'),
        );
        return;
      }
      setDetailAmbiguousRetry(null);
      Alert.alert(
        t('parcel.payment.startErrorTitle'),
        getLocalizedApiErrorMessage(error, t, PARCEL_ERROR_TRANSLATION_KEYS),
      );
    }
  }, [
    depositPaymentMutation,
    beginPaymentPollingWindow,
    finalPaymentMutation,
    invalidatePaymentQueries,
    isStartingPayment,
    lockedDetailPaymentMethod,
    navigation,
    parcelId,
    paymentIntentLocked,
    paymentReturnEnabled,
    paymentStage,
    queryClient,
    reconcileParcelPayment,
    refetchParcelDetail,
    stopPaymentPollingWindow,
    t,
    userId,
  ]);

  const handleContinuePaymentPress = React.useCallback(() => {
    handleContinuePayment().catch(() => undefined);
  }, [handleContinuePayment]);
  const handleStartPaymentPress = React.useCallback(() => {
    handleStartPayment().catch(() => undefined);
  }, [handleStartPayment]);
  const handlePayAgain = React.useCallback(() => {
    setPaymentSessionActive(false);
    setPaymentConfirmationMethod(null);
    stopPaymentPollingWindow();
  }, [stopPaymentPollingWindow]);
  const handlePaymentMethodChange = React.useCallback(
    (method: PaymentMethod) => {
      if (!paymentIntentLocked) {
        setSelectedPaymentMethod(method);
      }
    },
    [paymentIntentLocked],
  );
  const heroIconColor =
    heroCopy.iconColor === 'error'
      ? theme.colors.error
      : heroCopy.iconColor === 'success'
      ? theme.colors.success
      : theme.colors.warningForeground;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <Pressable
          accessibilityLabel={
            fromHistory ? t('common.back') : t('parcel.actions.backToDashboard')
          }
          accessibilityRole="button"
          style={styles.navButton}
          onPress={fromHistory ? handleBack : handleGoHome}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.navTitleGroup}>
          <Text numberOfLines={1} style={styles.navTitle}>
            {fromHistory
              ? t('parcel.detail.historyTitle')
              : t('parcel.detail.ticketTitle')}
          </Text>
          {parcel?.parcelCode ? (
            <Text
              selectable
              numberOfLines={1}
              ellipsizeMode="middle"
              style={styles.navMetadata}
            >
              {parcel.parcelCode}
            </Text>
          ) : null}
        </View>
        {parcel?.availableActions.includes('REPORT_INCIDENT') ? (
          <Pressable
            accessibilityLabel={t('parcel.reliability.reportIncident')}
            accessibilityRole="button"
            hitSlop={4}
            onPress={handleReportIncident}
            style={({ pressed }) => [
              styles.navButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <WarningCircle
              size={20}
              color={theme.colors.warningForeground}
              weight="bold"
            />
          </Pressable>
        ) : (
          <View style={styles.navSpacer} />
        )}
      </View>

      {detailQuery.isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateText}>{t('parcel.detail.loading')}</Text>
        </View>
      ) : detailQuery.isError ? (
        <View style={styles.errorWrap}>
          <ErrorView onRetry={handleRetryDetail} />
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
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          {!fromHistory ? (
            <View style={styles.successHeader}>
              {heroCopy.icon === 'warning' ? (
                <WarningCircle
                  size={56}
                  color={heroIconColor}
                  weight="duotone"
                />
              ) : heroCopy.icon === 'clock' ? (
                <Clock size={56} color={heroIconColor} weight="duotone" />
              ) : (
                <CheckCircle size={56} color={heroIconColor} weight="fill" />
              )}
              <Text style={styles.successTitle}>{t(heroCopy.titleKey)}</Text>
              <Text style={styles.successSubtitle}>
                {t(heroCopy.descriptionKey)}
              </Text>
            </View>
          ) : null}

          <View style={styles.ticketCard}>
            {parcelQrVisible && parcel?.parcelCode ? (
              <>
                <View style={styles.qrSection}>
                  <ScannableCodeCard
                    code={parcel.parcelCode}
                    title={t(
                      transferQrRequired
                        ? 'parcel.detail.transferCode'
                        : 'parcel.detail.dropoffCode',
                    )}
                    description={t(
                      transferQrRequired
                        ? 'parcel.detail.transferCodeHint'
                        : 'parcel.detail.dropoffCodeHint',
                    )}
                  />
                  <Text style={styles.qrCaption}>
                    {t(
                      transferQrRequired
                        ? 'parcel.detail.code.showForTransfer'
                        : heroCopy.codeKey,
                    )}
                  </Text>
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
              </>
            ) : (
              <View style={styles.compactParcelHeader}>
                <StatusChip
                  label={t(statusPresentation.labelKey)}
                  tone={statusPresentation.tone}
                />
                <Text style={styles.compactParcelHeaderText}>
                  {t(heroCopy.codeKey)}
                </Text>
              </View>
            )}

            <View style={styles.detailsSection}>
              <View style={styles.routeList}>
                <ParcelDetailField
                  label={t('parcel.route.from')}
                  value={
                    parcel?.originStationName ||
                    t('parcel.route.originTerminal')
                  }
                  variant="route"
                />
                <ParcelDetailField
                  label={t('parcel.route.to')}
                  value={
                    parcel?.destinationStationName ||
                    t('parcel.route.destinationTerminal')
                  }
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
                    value={`${
                      parcel?.actualWeightKg ?? parcel?.estimatedWeightKg ?? '-'
                    } ${t('parcel.units.kg')}`}
                  />
                </View>
                <View style={styles.detailFieldRow}>
                  <ParcelDetailField
                    compact
                    label={t('parcel.detail.declaredValue')}
                    value={
                      parcel?.declaredValueVnd == null
                        ? '-'
                        : formatVnd(parcel.declaredValueVnd)
                    }
                  />
                  <ParcelDetailField
                    compact
                    label={t('parcel.detail.delivery')}
                    value={t(deliveryPresentation.labelKey)}
                  />
                </View>
                {isSender ? (
                  <ParcelDetailField
                    label={t('parcel.detail.recipient')}
                    value={parcel?.recipientName || '-'}
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
                <View style={styles.totalCopy}>
                  <Text style={styles.totalLabel}>
                    {hasFinalPrice
                      ? t('parcel.detail.finalTotal')
                      : t('parcel.detail.estimatedTotal')}
                  </Text>
                  <Text style={styles.totalCaption}>
                    {hasFinalPrice
                      ? t('parcel.detail.priceConfirmedAfterWeigh')
                      : t('parcel.detail.priceEstimatedFromDeclaration')}
                  </Text>
                </View>
                <Text style={styles.totalValue}>
                  {formatVnd(
                    hasFinalPrice
                      ? parcel?.finalTotalPriceVnd ?? 0
                      : parcel?.estimatedTotalPriceVnd ?? 0,
                    {
                      display: 'code',
                      clampNegative: true,
                    },
                  )}
                </Text>
              </View>
              <View
                style={styles.paymentSummary}
                testID="parcel-payment-summary"
              >
                <View style={styles.paymentSummaryRow}>
                  <View style={styles.paymentSummaryCopy}>
                    <Text style={styles.paymentSummaryLabel}>
                      {depositOutstanding > 0
                        ? t('parcel.detail.depositDue')
                        : t('parcel.detail.depositPaid')}
                    </Text>
                    {depositOutstanding > 0 ? (
                      <Text style={styles.paymentSummaryHint}>
                        {t('parcel.detail.depositTotal', {
                          amount: formatVnd(parcel?.depositRequiredVnd ?? 0),
                        })}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.paymentSummaryValue,
                      depositOutstanding > 0 ? styles.paymentDueValue : null,
                    ]}
                  >
                    {formatVnd(
                      depositOutstanding > 0
                        ? depositOutstanding
                        : parcel?.depositPaidVnd ?? 0,
                    )}
                  </Text>
                </View>
                {hasFinalPrice && (parcel?.balanceRequiredVnd ?? 0) > 0 ? (
                  <View style={styles.paymentSummaryRow}>
                    <View style={styles.paymentSummaryCopy}>
                      <Text style={styles.paymentSummaryLabel}>
                        {balanceOutstanding > 0
                          ? t('parcel.detail.remainingBalance')
                          : t('parcel.detail.balancePaid')}
                      </Text>
                      {balanceOutstanding > 0 ? (
                        <Text style={styles.paymentSummaryHint}>
                          {t('parcel.detail.balanceTotal', {
                            amount: formatVnd(parcel?.balanceRequiredVnd ?? 0),
                          })}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.paymentSummaryValue,
                        balanceOutstanding > 0 ? styles.paymentDueValue : null,
                      ]}
                    >
                      {formatVnd(
                        balanceOutstanding > 0
                          ? balanceOutstanding
                          : parcel?.balancePaidVnd ?? 0,
                      )}
                    </Text>
                  </View>
                ) : !hasFinalPrice ? (
                  <View style={styles.paymentSummaryRow}>
                    <Text style={styles.paymentSummaryLabel}>
                      {t('parcel.detail.remainingAfterWeigh')}
                    </Text>
                    <Text style={styles.paymentSummaryPending}>
                      {t('parcel.detail.awaitingWeigh')}
                    </Text>
                  </View>
                ) : null}
              </View>
              {(parcel?.refundDueVnd ?? 0) > 0 ? (
                <View style={styles.paymentSummaryRow}>
                  <Text style={styles.paymentSummaryLabel}>
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

          {parcel?.compensationPolicySnapshot ? (
            <View
              testID="parcel-detail-compensation-section"
              style={styles.compensationSection}
            >
              <ParcelCompensationDisclosure
                operatorName={parcel.operator?.name}
                policy={parcel.compensationPolicySnapshot}
              />
            </View>
          ) : null}

          {hasClaimSurface ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleOpenClaim}
              style={({ pressed }) => [
                styles.secondaryActionButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.secondaryActionText}>
                {t('parcel.reliability.openClaim')}
              </Text>
            </Pressable>
          ) : null}

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

              {reopenSession ? (
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.trackButton,
                    pressed ? styles.pressed : null,
                  ]}
                  onPress={handleContinuePaymentPress}
                >
                  <VnPayLogo size="compact" />
                  <Text style={styles.trackButtonText}>
                    {t('parcel.payment.openVnPayAgain')}
                  </Text>
                </Pressable>
              ) : paymentIntentLocked ? (
                <View style={styles.verifyingPayment}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                  <View style={styles.verifyingPaymentCopy}>
                    <Text style={styles.verifyingPaymentTitle}>
                      {t('parcel.errors.ambiguousPaymentTitle')}
                    </Text>
                    <Text style={styles.verifyingPaymentText}>
                      {t('parcel.errors.ambiguousPaymentDescription')}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    disabled={isStartingPayment}
                    onPress={handleStartPaymentPress}
                  >
                    <Text style={styles.refreshPaymentText}>
                      {t('parcel.actions.retryPreviousRequest')}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {paymentConfirmationActive ? (
                    <View style={styles.verifyingPayment}>
                      {walletConfirmationActive ? (
                        <CheckCircle
                          size={22}
                          color={theme.colors.success}
                          weight="fill"
                        />
                      ) : paymentReturn.phase === 'awaiting_parcel' ? (
                        <Clock
                          size={22}
                          color={theme.colors.primary}
                          weight="duotone"
                        />
                      ) : (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.primary}
                        />
                      )}
                      <View style={styles.verifyingPaymentCopy}>
                        <Text style={styles.verifyingPaymentTitle}>
                          {walletConfirmationActive
                            ? t('parcel.payment.walletConfirmationTitle')
                            : paymentReturn.phase === 'awaiting_parcel'
                            ? t('paymentReturn.processingTitle')
                            : t('parcel.payment.verifyingTitle')}
                        </Text>
                        <Text style={styles.verifyingPaymentText}>
                          {walletConfirmationActive
                            ? t(
                                'parcel.payment.walletConfirmationDescription',
                              )
                            : paymentReturn.phase === 'awaiting_parcel'
                            ? t('paymentReturn.processingDescription')
                            : t('parcel.payment.verifyingDescription')}
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
                      {!activePaymentId && !walletConfirmationActive ? (
                        <Pressable
                          accessibilityRole="button"
                          hitSlop={8}
                          onPress={handlePayAgain}
                        >
                          <Text style={styles.refreshPaymentText}>
                            {t('parcel.payment.payAgain')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  {!paymentConfirmationActive ? (
                    <>
                      <ParcelPaymentMethodSelector
                        value={lockedDetailPaymentMethod}
                        onChange={handlePaymentMethodChange}
                        requiredAmount={paymentAmount}
                        walletBalance={walletBalanceQuery.data?.balance}
                        walletIsLoading={walletBalanceQuery.isLoading}
                        walletHasError={walletBalanceQuery.isError}
                        disabled={isStartingPayment || paymentIntentLocked}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          selectedPaymentMethod === 'wallet'
                            ? t('parcel.payment.payWithWallet')
                            : t('parcel.payment.continueToVnPay')
                        }
                        accessibilityState={{ disabled: isStartingPayment }}
                        disabled={isStartingPayment}
                        style={({ pressed }) => [
                          styles.trackButton,
                          isStartingPayment
                            ? styles.trackButtonDisabled
                            : null,
                          pressed && !isStartingPayment
                            ? styles.pressed
                            : null,
                        ]}
                        onPress={handleStartPaymentPress}
                      >
                        {isStartingPayment ? (
                          <ActivityIndicator
                            size="small"
                            color={theme.colors.textInverse}
                          />
                        ) : selectedPaymentMethod === 'vnpay' ? (
                          <VnPayLogo size="compact" />
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
                  ) : null}
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
              <Text style={styles.homeButtonText}>{t('common.back')}</Text>
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
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  navSpacer: {
    width: 44,
  },
  navTitleGroup: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  navTitle: {
    alignSelf: 'stretch',
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  navMetadata: {
    alignSelf: 'stretch',
    marginTop: 2,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
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
    borderCurve: 'continuous' as const,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  compensationSection: {
    marginBottom: spacing.xxl,
  },
  evidenceTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    marginBottom: spacing.md,
  },
  evidenceStrip: {
    height: 140,
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
    borderCurve: 'continuous' as const,
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
  compactParcelHeader: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  compactParcelHeaderText: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
    color: theme.colors.textSecondary,
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
    borderCurve: 'continuous' as const,
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
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  totalLabel: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  totalCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  totalCaption: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  totalValue: {
    flexShrink: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.primary,
  },
  paymentSummary: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  paymentSummaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  paymentSummaryLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  paymentSummaryHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  paymentSummaryValue: {
    flexShrink: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  paymentDueValue: {
    color: theme.colors.primary,
  },
  paymentSummaryPending: {
    flexShrink: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
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
  secondaryActionButton: {
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: borderRadius.md,
  },
  secondaryActionText: {
    color: theme.colors.primary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
  },
  paymentActionCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous' as const,
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
    borderCurve: 'continuous' as const,
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
    borderCurve: 'continuous' as const,
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
    borderCurve: 'continuous' as const,
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
