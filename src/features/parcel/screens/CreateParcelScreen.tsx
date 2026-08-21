import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  Clock,
  Truck,
  WarningCircle,
} from 'phosphor-react-native';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';

import { AppKeyboardAwareScrollView, Input, PhotoPicker } from '@shared/components';
import {
  getLocalizedApiErrorMessage,
  toApiError,
} from '@shared/api/errors';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import {
  isValidEmail,
  isValidVietnamPhone,
  normalizeVietnamPhone,
} from '@features/auth/validation/authValidation';
import { passengerHistoryKeys } from '@features/profile/api/passengerHistoryApi';
import { walletKeys } from '@features/profile/api/walletApi';
import { useWalletBalance } from '@features/profile/hooks/useWallet';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useCurrentCoordinates, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import {
  assertVnPaySdkAvailable,
  openVnPayPayment,
} from '@shared/payments';
import {
  addApiCalendarDays,
  toVietnamBusinessDate,
} from '@shared/utils/apiTime';
import {
  formatDateTime,
  formatShortDate,
  formatVnd,
} from '@shared/utils/format';
import { toBackendPaymentMethod } from '@shared/utils/paymentMethod';
import type {
  ParcelStackParamList,
  RootStackParamList,
} from '@app/navigation/types';
import type { PromoOffer } from '@shared/utils/promo';
import {
  findPromoByCode,
  normalizePromoCode,
} from '@shared/utils/promo';
import { useParcelStore } from '../store/useParcelStore';
import { mapParcelVoucherToPromo, parcelKeys } from '../api/parcelApi';
import {
  useAvailableParcelTrips,
  useAvailableParcelVouchers,
  useCreateParcel,
  useStartParcelDepositPayment,
} from '../hooks/useParcelQueries';
import { useParcelPhotoUpload } from '../hooks/useParcelPhotoUpload';
import { useParcelQuoteLifecycle } from '../hooks/useParcelQuoteLifecycle';
import { useParcelStations } from '../hooks/useParcelStations';
import type {
  AvailableParcelTrip,
  CreateParcelPayload,
  CreateParcelResult,
  ParcelSize,
  Station,
} from '../types';
import {
  StationCard,
  ParcelSkeleton,
  ErrorView,
  StepProgressBar,
  StepHeaderWithMascot,
  PackageSizeSelector,
  ParcelDimensionsInput,
  WeightSlider,
  CategoryChips,
  PricingBreakdown,
} from '../components';
import {
  areParcelDimensionsPositive,
  resolveParcelSizeFromDimensions,
  formatParcelDimensions,
  type ParcelDimensions,
} from '../config/parcelPackage';
import { buildCreateParcelPayload } from '../utils/createParcelPayload';
import {
  classifyParcelCreateConflict,
  isAmbiguousRetryActive,
  isParcelAmbiguousPaymentError,
  type AmbiguousRetryState,
} from '../utils/parcelCreateErrors';
import { PARCEL_ERROR_TRANSLATION_KEYS } from '../utils/parcelPresentation';
import {
  calculateParcelQuotePricing,
  getParcelQuoteSemanticFingerprint,
  hasParcelQuoteContract,
  isParcelQuoteErrorCode,
  isParcelQuoteUsable,
  pickLowestFareParcelTrip,
  PARCEL_QUOTE_REFRESH_SAFETY_WINDOW_MS,
} from '../utils/parcelQuote';

type CreateParcelNavProp = NativeStackNavigationProp<
  ParcelStackParamList,
  'CreateParcel'
>;

const DATE_OFFSETS = Array.from({ length: 30 }, (_, index) => index);
const MAX_DEPARTURE_OFFSET = DATE_OFFSETS.length - 1;
const TRIP_LOAD_MORE_THRESHOLD_PX = 160;

const formatTripTime = (dateLike: string): string => {
  return formatDateTime(dateLike) || dateLike;
};

const DepartureDateChip = React.memo(function DepartureDateChip({
  active,
  label,
  offset,
  onSelect,
}: {
  active: boolean;
  label: string;
  offset: number;
  onSelect: (offset: number) => void;
}): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => {
    onSelect(offset);
  }, [offset, onSelect]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.dateChip,
        active ? styles.dateChipActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <CalendarBlank
        size={14}
        color={active ? theme.colors.textInverse : theme.colors.primary}
        weight="bold"
      />
      <Text
        style={[
          styles.dateChipText,
          active ? styles.dateChipTextActive : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const TripOptionCard = React.memo(function TripOptionCard({
  trip,
  selected,
  onPress,
}: {
  trip: AvailableParcelTrip;
  selected: boolean;
  onPress: (trip: AvailableParcelTrip) => void;
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const quoteAvailable = isParcelQuoteUsable(trip);
  const handlePress = useCallback(() => {
    onPress(trip);
  }, [onPress, trip]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !quoteAvailable }}
      disabled={!quoteAvailable}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.tripCard,
        selected ? styles.tripCardActive : null,
        !quoteAvailable ? styles.tripCardDisabled : null,
        pressed && quoteAvailable ? styles.pressed : null,
      ]}
    >
      <View style={[styles.tripIcon, selected ? styles.tripIconActive : null]}>
        <Truck
          size={20}
          color={selected ? theme.colors.textInverse : theme.colors.primary}
          weight="fill"
        />
      </View>
      <View style={styles.tripMeta}>
        <Text style={styles.tripOperator} numberOfLines={1}>
          {trip.operatorName?.trim() || t('parcel.trips.operatorUnavailable')}
        </Text>
        <Text style={styles.tripRoute} numberOfLines={2}>
          {trip.originStation.name} → {trip.destinationStation.name}
        </Text>
        <Text style={styles.tripTime}>
          {formatTripTime(trip.departureDateTime)} →{' '}
          {formatTripTime(trip.estimatedArrivalTime)}
        </Text>
        <Text style={styles.tripPrice}>
          {quoteAvailable
            ? t('parcel.trips.priceSummary', {
                deposit: formatVnd(trip.estimatedDepositVnd),
                estimated: formatVnd(trip.estimatedPriceVnd),
              })
            : t('parcel.trips.quoteUnavailable')}
        </Text>
      </View>
      {selected ? (
        <CheckCircle size={22} color={theme.colors.success} weight="fill" />
      ) : null}
    </Pressable>
  );
});

export function CreateParcelScreen(): React.JSX.Element {
  const navigation = useNavigation<CreateParcelNavProp>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const fromCity = useParcelStore(state => state.fromCity);
  const toCity = useParcelStore(state => state.toCity);
  const fromLocationCode = useParcelStore(state => state.fromLocationCode);
  const toLocationCode = useParcelStore(state => state.toLocationCode);
  const fromWardCode = useParcelStore(state => state.fromWardCode);
  const toWardCode = useParcelStore(state => state.toWardCode);
  const receivingStation = useParcelStore(state => state.receivingStation);
  const dropoffStation = useParcelStore(state => state.dropoffStation);
  const packageSize = useParcelStore(state => state.size);
  const packageWeight = useParcelStore(state => state.weight);
  const packageLengthCm = useParcelStore(state => state.lengthCm);
  const packageWidthCm = useParcelStore(state => state.widthCm);
  const packageHeightCm = useParcelStore(state => state.heightCm);
  const packageCategory = useParcelStore(state => state.category);
  const estimatedValue = useParcelStore(state => state.estimatedValue);
  const quantity = useParcelStore(state => state.quantity);
  const photos = useParcelStore(state => state.photos);
  const paymentMethod = useParcelStore(state => state.paymentMethod);
  const setPackage = useParcelStore(state => state.setPackage);
  const setPaymentMethod = useParcelStore(state => state.setPaymentMethod);
  const setReceivingStation = useParcelStore(
    state => state.setReceivingStation,
  );
  const setDropoffStation = useParcelStore(state => state.setDropoffStation);
  const [step, setStep] = useState(1);
  const [highestStepReached, setHighestStepReached] = useState(1);
  // Recipient starts empty; the sender profile is not applied in this batch
  // because recipient email may link the parcel to another account.
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientErrors, setRecipientErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  }>({});
  const recipientNameRef = useRef<TextInput>(null);
  const recipientPhoneRef = useRef<TextInput>(null);
  const recipientEmailRef = useRef<TextInput>(null);
  const departureDateBase = useMemo(() => toVietnamBusinessDate(), []);
  const [departureOffset, setDepartureOffset] = useState(0);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedQuoteFingerprint, setSelectedQuoteFingerprint] = useState<
    string | null
  >(null);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoOffer | null>(null);
  const [promoError, setPromoError] = useState<string | undefined>(undefined);
  const [dimensionsDraftValid, setDimensionsDraftValid] = useState(true);
  const [weightDraftValid, setWeightDraftValid] = useState(true);
  const previousTripSearchRef = useRef<string | null>(null);
  const tripLoadMoreInFlightRef = useRef(false);
  const selectedTripIdRef = useRef<string | null>(null);
  const selectedQuoteFingerprintRef = useRef<string | null>(null);
  const handledVoucherQuoteErrorAtRef = useRef(0);
  const checkoutInFlightRef = useRef(false);
  /** Held after ambiguous create/deposit so the user can exact-retry without leaving. */
  const [ambiguousRetry, setAmbiguousRetry] = useState<AmbiguousRetryState>(null);
  const [allowLeaveDespiteRetry, setAllowLeaveDespiteRetry] = useState(false);
  const intentLocked = isAmbiguousRetryActive(ambiguousRetry);
  const lockedPaymentMethod =
    ambiguousRetry?.kind === 'deposit'
      ? ambiguousRetry.paymentMethod
      : paymentMethod;
  const lockedBackendPaymentMethod = toBackendPaymentMethod(lockedPaymentMethod);
  const walletBalanceQuery = useWalletBalance(step === 4);
  const hasParcelDraft = Boolean(
    fromLocationCode
    || toLocationCode
    || receivingStation
    || dropoffStation
    || step > 1
    || selectedTripId
    || appliedPromo
    || photos.length > 0
    || estimatedValue.trim()
    || quantity !== 1
    || packageCategory.trim(),
  );

  const currentLocation = useCurrentCoordinates(step === 1 || step === 2);

  const clearTripSelection = useCallback(() => {
    selectedTripIdRef.current = null;
    selectedQuoteFingerprintRef.current = null;
    setSelectedTripId(null);
    setSelectedQuoteFingerprint(null);
    setPromoCode('');
    setAppliedPromo(null);
    setPromoError(undefined);
  }, []);

  const handleQuotePriceChanged = useCallback(() => {
    Alert.alert(
      t('parcel.errors.quotePriceChangedTitle'),
      t('parcel.errors.quotePriceChangedDescription'),
    );
  }, [t]);

  const originScopeCode = (fromWardCode || fromLocationCode).trim();
  const destinationScopeCode = (toWardCode || toLocationCode).trim();

  const originStationsQuery = useParcelStations(
    originScopeCode,
    step === 1,
    currentLocation.coords,
    currentLocation.isResolving,
  );
  const destinationStationsQuery = useParcelStations(
    destinationScopeCode,
    step === 2,
    currentLocation.coords,
    currentLocation.isResolving,
  );
  const dimensions = useMemo(
    () => ({
      lengthCm: packageLengthCm,
      widthCm: packageWidthCm,
      heightCm: packageHeightCm,
    }),
    [packageHeightCm, packageLengthCm, packageWidthCm],
  );
  const packageMeasurementsValid =
    dimensionsDraftValid &&
    areParcelDimensionsPositive(dimensions) &&
    weightDraftValid &&
    packageWeight > 0;
  const dimensionsErrorMessage =
    !dimensionsDraftValid || !areParcelDimensionsPositive(dimensions)
    ? t('parcel.validation.dimensionsPositive')
    : undefined;
  const estimatedWeightKg = packageWeight;
  const departureDate = addApiCalendarDays(
    departureDateBase,
    departureOffset,
  );
  const backendPaymentMethod = toBackendPaymentMethod(paymentMethod);

  const availableTripParams = useMemo(() => {
    if (!receivingStation || !dropoffStation || !packageMeasurementsValid) {
      return null;
    }

    return {
      originStationId: receivingStation.id,
      destinationStationId: dropoffStation.id,
      departureDate,
      lengthCm: dimensions.lengthCm,
      widthCm: dimensions.widthCm,
      heightCm: dimensions.heightCm,
      estimatedWeightKg,
      pageSize: 20,
    };
  }, [
    departureDate,
    dimensions.heightCm,
    dimensions.lengthCm,
    dimensions.widthCm,
    dropoffStation,
    estimatedWeightKg,
    packageMeasurementsValid,
    receivingStation,
  ]);

  const availableTripsQuery = useAvailableParcelTrips(
    availableTripParams,
    step === 4,
  );
  const refetchAvailableTrips = availableTripsQuery.refetch;
  const fetchNextTripsPage = availableTripsQuery.fetchNextPage;
  const hasNextTripsPage = availableTripsQuery.hasNextPage;
  const isFetchingNextTripsPage = availableTripsQuery.isFetchingNextPage;
  const isFetchNextTripsPageError = availableTripsQuery.isFetchNextPageError;
  const tripPages = availableTripsQuery.data?.pages;
  const availableTrips = useMemo(() => {
    const tripById = new Map<string, AvailableParcelTrip>();
    tripPages?.forEach(page => {
      page.items.forEach(trip => tripById.set(trip.tripId, trip));
    });
    return Array.from(tripById.values());
  }, [tripPages]);
  const emptyTripPrimaryDisabled =
    isFetchingNextTripsPage ||
    (!hasNextTripsPage && departureOffset >= MAX_DEPARTURE_OFFSET);
  const selectedTrip = useMemo(
    () => availableTrips.find(trip => trip.tripId === selectedTripId) ?? null,
    [availableTrips, selectedTripId],
  );

  const tripSearchFingerprint = useMemo(
    () =>
      [
        receivingStation?.id ?? '',
        dropoffStation?.id ?? '',
        departureDate,
        dimensions.lengthCm,
        dimensions.widthCm,
        dimensions.heightCm,
        estimatedWeightKg,
      ].join('|'),
    [
      departureDate,
      dimensions.heightCm,
      dimensions.lengthCm,
      dimensions.widthCm,
      dropoffStation?.id,
      estimatedWeightKg,
      receivingStation?.id,
    ],
  );

  useEffect(() => {
    selectedTripIdRef.current = selectedTripId;
  }, [selectedTripId]);

  useEffect(() => {
    selectedQuoteFingerprintRef.current = selectedQuoteFingerprint;
  }, [selectedQuoteFingerprint]);

  useEffect(() => {
    const previousFingerprint = previousTripSearchRef.current;
    previousTripSearchRef.current = tripSearchFingerprint;
    tripLoadMoreInFlightRef.current = false;
    if (previousFingerprint && previousFingerprint !== tripSearchFingerprint) {
      clearTripSelection();
    }
  }, [clearTripSelection, tripSearchFingerprint]);

  useParcelQuoteLifecycle({
    enabled: step === 4,
    selectedTrip,
    selectedFingerprint: selectedQuoteFingerprint,
    isSearchSuccess: availableTripsQuery.isSuccess,
    isFetching: availableTripsQuery.isFetching,
    refetch: refetchAvailableTrips,
    clearQuoteDependentSelection: clearTripSelection,
    onPriceChanged: handleQuotePriceChanged,
  });

  const voucherParams = useMemo(() => {
    if (!hasParcelQuoteContract(selectedTrip)) {
      return null;
    }

    return {
      tripId: selectedTrip.tripId,
      sizeCategory: selectedTrip.estimatedSizeCategory,
      paymentMethod: backendPaymentMethod,
      quoteToken: selectedTrip.quoteToken,
      quoteExpiresAt: selectedTrip.quoteExpiresAt,
      estimatedGrossPriceVnd: selectedTrip.estimatedGrossPriceVnd,
    };
  }, [backendPaymentMethod, selectedTrip]);

  const vouchersQuery = useAvailableParcelVouchers(voucherParams, step === 4);
  const availablePromos = useMemo(
    () =>
      (vouchersQuery.data ?? []).map(voucher =>
        mapParcelVoucherToPromo(voucher, t),
      ),
    [t, vouchersQuery.data],
  );

  const selectedVoucher = useMemo(() => {
    const code = appliedPromo?.code
      ? normalizePromoCode(appliedPromo.code)
      : '';
    if (!code) {
      return null;
    }

    return (
      (vouchersQuery.data ?? []).find(
        voucher => normalizePromoCode(voucher.code) === code,
      ) ?? null
    );
  }, [appliedPromo?.code, vouchersQuery.data]);

  useEffect(() => {
    // Only drop voucher after a successful revalidation proves the code is gone.
    // While fetching after quote refresh, keep appliedPromo so we never submit null.
    if (
      vouchersQuery.isSuccess
      && !vouchersQuery.isFetching
      && appliedPromo
      && !selectedVoucher
    ) {
      setAppliedPromo(null);
      setPromoError(t('parcel.promos.noLongerValid'));
    }
  }, [
    appliedPromo,
    selectedVoucher,
    t,
    vouchersQuery.isFetching,
    vouchersQuery.isSuccess,
  ]);

  useEffect(() => {
    if (!vouchersQuery.isError || !vouchersQuery.errorUpdatedAt) {
      return;
    }
    if (handledVoucherQuoteErrorAtRef.current === vouchersQuery.errorUpdatedAt) {
      return;
    }

    const voucherErrorCode = toApiError(vouchersQuery.error).code;
    if (!isParcelQuoteErrorCode(voucherErrorCode)) {
      return;
    }

    handledVoucherQuoteErrorAtRef.current = vouchersQuery.errorUpdatedAt;

    if (
      voucherErrorCode === 'PARCEL_QUOTE_EXPIRED'
      || voucherErrorCode === 'PARCEL_QUOTE_STALE'
    ) {
      setAppliedPromo(null);
      setPromoCode('');
      setPromoError(undefined);
      refetchAvailableTrips().catch(() => undefined);
      Alert.alert(
        t('parcel.errors.quoteExpiredTitle'),
        t('parcel.errors.quoteExpiredDescription'),
      );
      return;
    }

    clearTripSelection();
    refetchAvailableTrips().catch(() => undefined);
    Alert.alert(
      t('parcel.errors.quoteInvalidTitle'),
      t('parcel.errors.quoteInvalidDescription'),
    );
  }, [
    clearTripSelection,
    refetchAvailableTrips,
    t,
    vouchersQuery.error,
    vouchersQuery.errorUpdatedAt,
    vouchersQuery.isError,
  ]);

  const quotePricing = useMemo(
    () => calculateParcelQuotePricing(
      selectedTrip,
      selectedVoucher?.discountAmount,
    ),
    [selectedTrip, selectedVoucher?.discountAmount],
  );
  const depositDue = quotePricing.depositDueVnd;

  useEffect(() => {
    if (intentLocked) {
      return;
    }
    if (
      paymentMethod === 'wallet' &&
      !walletBalanceQuery.isLoading &&
      (walletBalanceQuery.isError ||
        walletBalanceQuery.data?.balance === undefined ||
        walletBalanceQuery.data.balance < depositDue)
    ) {
      setPaymentMethod('vnpay');
    }
  }, [
    depositDue,
    intentLocked,
    paymentMethod,
    setPaymentMethod,
    walletBalanceQuery.data?.balance,
    walletBalanceQuery.isError,
    walletBalanceQuery.isLoading,
  ]);

  const voucherNeedsRevalidation = Boolean(
    appliedPromo
    && (
      vouchersQuery.isFetching
      || !vouchersQuery.isSuccess
      || !selectedVoucher
    ),
  );

  const createParcelMutation = useCreateParcel();
  const depositPaymentMutation = useStartParcelDepositPayment();
  const {
    uploadParcelPhoto,
    isUploadingParcelPhoto,
    resetParcelPhotoUpload,
  } = useParcelPhotoUpload();

  const confirmLeaveWithAmbiguousRetry = useCallback(
    (onLeave: () => void) => {
      const isDeposit = ambiguousRetry?.kind === 'deposit';
      Alert.alert(
        t('parcel.errors.leaveAmbiguousTitle'),
        isDeposit
          ? t('parcel.errors.leaveAmbiguousDepositDescription')
          : t('parcel.errors.leaveAmbiguousCreateDescription'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('parcel.exitDraft.discard'),
            style: 'destructive',
            onPress: () => {
              setAllowLeaveDespiteRetry(true);
              requestAnimationFrame(onLeave);
            },
          },
        ],
      );
    },
    [ambiguousRetry?.kind, t],
  );

  const showAmbiguousRetryLockedAlert = useCallback(() => {
    const isDeposit = ambiguousRetry?.kind === 'deposit';
    Alert.alert(
      isDeposit
        ? t('parcel.errors.ambiguousPaymentTitle')
        : t('parcel.errors.ambiguousRequestTitle'),
      isDeposit
        ? t('parcel.errors.ambiguousPaymentDescription')
        : t('parcel.errors.ambiguousRequestDescription'),
      [{ text: t('common.ok') }],
    );
  }, [ambiguousRetry?.kind, t]);

  const handleBackStep = useCallback(() => {
    if (intentLocked) {
      navigation.goBack();
      return true;
    }

    if (step > 1) {
      setStep(step - 1);
      return true;
    }

    if (!hasParcelDraft) {
      navigation.goBack();
      return true;
    }

    Alert.alert(
      t('parcel.exitDraft.title'),
      t('parcel.exitDraft.description'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('parcel.exitDraft.discard'),
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
    return true;
  }, [
    hasParcelDraft,
    intentLocked,
    navigation,
    step,
    t,
  ]);

  const handleStepPress = useCallback((nextStep: number) => {
    if (intentLocked) {
      showAmbiguousRetryLockedAlert();
      return;
    }
    setStep(nextStep);
  }, [intentLocked, showAmbiguousRetryLockedAlert]);

  usePreventRemove(intentLocked && !allowLeaveDespiteRetry, ({ data }) => {
    confirmLeaveWithAmbiguousRetry(() => navigation.dispatch(data.action));
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackStep,
    );
    return () => subscription.remove();
  }, [handleBackStep]);

  const advanceStep = useCallback(() => {
    setStep(currentStep => {
      const nextStep = Math.min(currentStep + 1, 4);
      setHighestStepReached(highest => Math.max(highest, nextStep));
      return nextStep;
    });
  }, []);

  const handleSelectReceivingStation = useCallback(
    (station: Station) => {
      setReceivingStation(station);
      if (dropoffStation?.id === station.id) {
        setDropoffStation(undefined);
      }
    },
    [dropoffStation?.id, setDropoffStation, setReceivingStation],
  );

  const handleSelectDropoffStation = useCallback(
    (station: Station) => {
      setDropoffStation(station);
    },
    [setDropoffStation],
  );

  const handlePhotosChange = useCallback(
    (nextPhotos: string[]) => {
      setPackage({ photos: nextPhotos });
    },
    [setPackage],
  );

  const handlePackageSizeChange = useCallback(
    (size: ParcelSize) => {
      setDimensionsDraftValid(true);
      setPackage({ size });
    },
    [setPackage],
  );

  const handleDimensionsChange = useCallback(
    (nextDimensions: ParcelDimensions) => {
      setPackage({
        ...nextDimensions,
        size: resolveParcelSizeFromDimensions(nextDimensions),
      });
    },
    [setPackage],
  );

  const handleWeightChange = useCallback(
    (weight: number) => {
      setPackage({ weight });
    },
    [setPackage],
  );

  const handleCategoryChange = useCallback(
    (category: string) => {
      setPackage({ category });
    },
    [setPackage],
  );

  const handleEstimatedValueChange = useCallback(
    (value: string) => {
      setPackage({ estimatedValue: value.replace(/\D/g, '').slice(0, 15) });
    },
    [setPackage],
  );

  const handleQuantityChange = useCallback(
    (value: string) => {
      const digits = value.replace(/\D/g, '').slice(0, 5);
      const parsed = Number(digits || '1');
      setPackage({
        quantity: Math.min(10_000, Math.max(1, parsed)),
      });
    },
    [setPackage],
  );

  const handleSelectTrip = useCallback((trip: AvailableParcelTrip) => {
    if (intentLocked || !isParcelQuoteUsable(trip)) {
      return;
    }

    const fingerprint = getParcelQuoteSemanticFingerprint(trip);
    if (
      trip.tripId === selectedTripIdRef.current
      && fingerprint === selectedQuoteFingerprintRef.current
    ) {
      return;
    }

    selectedTripIdRef.current = trip.tripId;
    selectedQuoteFingerprintRef.current = fingerprint;
    setSelectedTripId(trip.tripId);
    setSelectedQuoteFingerprint(fingerprint);
    setPromoCode('');
    setAppliedPromo(null);
    setPromoError(undefined);
  }, [intentLocked]);

  useEffect(() => {
    if (step !== 4 || intentLocked || availableTripsQuery.isPending) {
      return;
    }

    const currentTrip = selectedTripId
      ? availableTrips.find(trip => trip.tripId === selectedTripId)
      : null;
    if (currentTrip && isParcelQuoteUsable(currentTrip)) {
      return;
    }

    const cheapestTrip = pickLowestFareParcelTrip(availableTrips);
    if (!cheapestTrip) {
      if (selectedTripId) {
        clearTripSelection();
      }
      return;
    }

    handleSelectTrip(cheapestTrip);
  }, [
    availableTrips,
    availableTripsQuery.isPending,
    clearTripSelection,
    handleSelectTrip,
    intentLocked,
    selectedTripId,
    step,
  ]);

  const requestNextTripsPage = useCallback(() => {
    if (
      !hasNextTripsPage
      || isFetchingNextTripsPage
      || tripLoadMoreInFlightRef.current
    ) {
      return;
    }

    tripLoadMoreInFlightRef.current = true;
    fetchNextTripsPage()
      .catch(() => undefined)
      .finally(() => {
        tripLoadMoreInFlightRef.current = false;
      });
  }, [fetchNextTripsPage, hasNextTripsPage, isFetchingNextTripsPage]);

  const handleContentScroll = useCallback((
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (
      step !== 4
      || !hasNextTripsPage
      || isFetchingNextTripsPage
      || isFetchNextTripsPageError
    ) {
      return;
    }

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromEnd =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromEnd <= TRIP_LOAD_MORE_THRESHOLD_PX) {
      requestNextTripsPage();
    }
  }, [
    hasNextTripsPage,
    isFetchNextTripsPageError,
    isFetchingNextTripsPage,
    requestNextTripsPage,
    step,
  ]);

  const handleChangeTerminals = useCallback(() => {
    if (intentLocked) {
      showAmbiguousRetryLockedAlert();
      return;
    }
    setStep(1);
  }, [intentLocked, showAmbiguousRetryLockedAlert]);

  const handleTryNextDate = useCallback(() => {
    if (intentLocked) {
      showAmbiguousRetryLockedAlert();
      return;
    }
    setDepartureOffset(currentOffset =>
      Math.min(currentOffset + 1, MAX_DEPARTURE_OFFSET),
    );
  }, [intentLocked, showAmbiguousRetryLockedAlert]);

  const handleDepartureOffsetSelect = useCallback((offset: number) => {
    if (intentLocked) {
      showAmbiguousRetryLockedAlert();
      return;
    }
    setDepartureOffset(offset);
  }, [intentLocked, showAmbiguousRetryLockedAlert]);

  const validateCurrentStep = useCallback(() => {
    const validateWholeDraft = step === 4;

    if ((step === 1 || validateWholeDraft) && !receivingStation) {
      Alert.alert(
        t('app.name'),
        t('parcel.validation.selectOriginStation'),
      );
      return false;
    }
    if ((step === 2 || validateWholeDraft) && !dropoffStation) {
      Alert.alert(
        t('app.name'),
        t('parcel.validation.selectDestinationStation'),
      );
      return false;
    }
    if (step === 3 || validateWholeDraft) {
      if (!recipientName.trim()) {
        setRecipientErrors({ name: t('parcel.validation.recipientNameRequired') });
        requestAnimationFrame(() => recipientNameRef.current?.focus());
        return false;
      }
      if (!recipientPhone.trim()) {
        setRecipientErrors({ phone: t('parcel.validation.recipientPhoneRequired') });
        requestAnimationFrame(() => recipientPhoneRef.current?.focus());
        return false;
      }
      if (!isValidVietnamPhone(recipientPhone)) {
        setRecipientErrors({ phone: t('parcel.validation.invalidVietnamPhone') });
        requestAnimationFrame(() => recipientPhoneRef.current?.focus());
        return false;
      }
      if (recipientEmail.trim() && !isValidEmail(recipientEmail)) {
        setRecipientErrors({ email: t('parcel.validation.invalidRecipientEmail') });
        requestAnimationFrame(() => recipientEmailRef.current?.focus());
        return false;
      }
      if (!packageMeasurementsValid) {
        Alert.alert(
          t('app.name'),
          dimensionsErrorMessage ??
            t('parcel.validation.invalidMeasurements'),
        );
        return false;
      }
    }
    setRecipientErrors({});
    if (step === 4) {
      if (!selectedTrip || !hasParcelQuoteContract(selectedTrip)) {
        Alert.alert(
          t('app.name'),
          t('parcel.validation.selectAvailableTrip'),
        );
        return false;
      }
      if (!isParcelQuoteUsable(
        selectedTrip,
        Date.now(),
        PARCEL_QUOTE_REFRESH_SAFETY_WINDOW_MS,
      )) {
        Alert.alert(
          t('parcel.errors.quoteExpiredTitle'),
          t('parcel.errors.quoteExpiredDescription'),
        );
        refetchAvailableTrips().catch(() => undefined);
        return false;
      }
      if (voucherNeedsRevalidation) {
        Alert.alert(
          t('app.name'),
          t('parcel.errors.voucherRevalidating'),
        );
        return false;
      }
    }

    return true;
  }, [
    dimensionsErrorMessage,
    dropoffStation,
    packageMeasurementsValid,
    receivingStation,
    recipientEmail,
    recipientName,
    recipientPhone,
    refetchAvailableTrips,
    selectedTrip,
    step,
    t,
    voucherNeedsRevalidation,
  ]);

  const buildCreatePayload = useCallback((
    photoUrl: string | null,
  ): CreateParcelPayload => {
    if (!hasParcelQuoteContract(selectedTrip)) {
      throw new Error(t('parcel.validation.selectTripBeforeCreate'));
    }

    return buildCreateParcelPayload({
      tripId: selectedTrip.tripId,
      quoteToken: selectedTrip.quoteToken,
      dropoffStopId: null,
      bookingId: null,
      itemName: packageCategory || null,
      description: null,
      sizeCategory: selectedTrip.estimatedSizeCategory,
      lengthCm: dimensions.lengthCm,
      widthCm: dimensions.widthCm,
      heightCm: dimensions.heightCm,
      estimatedWeightKg,
      photoUrl,
      recipient: {
        fullName: recipientName.trim(),
        phoneNumber: normalizeVietnamPhone(recipientPhone),
        email: recipientEmail.trim() || null,
      },
      deliveryMethod: 'TERMINAL_PICKUP',
      paymentMethod: backendPaymentMethod,
      voucherCode: selectedVoucher?.code ?? null,
      declaredValueVnd: estimatedValue ? Number(estimatedValue) : null,
      quantity,
    });
  }, [
    backendPaymentMethod,
    dimensions.heightCm,
    dimensions.lengthCm,
    dimensions.widthCm,
    estimatedValue,
    estimatedWeightKg,
    packageCategory,
    quantity,
    recipientEmail,
    recipientName,
    recipientPhone,
    selectedTrip,
    selectedVoucher?.code,
    t,
  ]);

  const invalidateParcelCheckoutQueries = useCallback((
    includeWallet: boolean,
  ): void => {
    if (!user?.id) {
      return;
    }

    const invalidations = [
      queryClient.invalidateQueries({ queryKey: parcelKeys.user(user.id) }),
      queryClient.invalidateQueries({
        queryKey: parcelKeys.availableTripsRoot(),
      }),
      queryClient.invalidateQueries({
        queryKey: passengerHistoryKeys.user(user.id),
      }),
    ];

    if (includeWallet) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: walletKeys.user(user.id),
        }),
      );
    }

    Promise.all(invalidations).catch(() => undefined);
  }, [queryClient, user?.id]);

  const handleSubmit = useCallback(async () => {
    if (step === 4 && !user?.id) {
      navigation
        .getParent<NativeStackNavigationProp<RootStackParamList>>()
        ?.navigate('Auth', { screen: 'Login' });
      return;
    }

    if (step < 4) {
      if (!validateCurrentStep()) {
        return;
      }
      advanceStep();
      return;
    }

    // Deposit exact-retry keeps parcelId; full step validation is not required.
    if (ambiguousRetry?.kind !== 'deposit' && !validateCurrentStep()) {
      return;
    }

    if (checkoutInFlightRef.current) {
      return;
    }
    const ownerUserId = user?.id;
    if (!ownerUserId) return;

    if (lockedBackendPaymentMethod === 'VNPAY') {
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

    checkoutInFlightRef.current = true;

    const navigateToCreatedParcel = (
      parcelId: string,
      paymentRedirectUrl?: string | null,
      preferredMethod: typeof lockedPaymentMethod = lockedPaymentMethod,
    ) => {
      invalidateParcelCheckoutQueries(preferredMethod === 'wallet');
      setAmbiguousRetry(null);
      navigation.navigate('ParcelDetail', {
        parcelId,
        paymentRedirectUrl: paymentRedirectUrl ?? undefined,
        preferredPaymentMethod: preferredMethod,
        ...(dropoffStation?.id
          ? {
              trackingTarget: {
                kind: 'STATION' as const,
                stationId: dropoffStation.id,
              },
            }
          : {}),
      });
    };

    try {
      // Exact-retry deposit only: parcel already exists; never re-upload/create.
      if (ambiguousRetry?.kind === 'deposit') {
        const depositParcelId = ambiguousRetry.parcelId;
        try {
          const depositPaymentResult =
            await depositPaymentMutation.retryRetainedAsync();
          navigateToCreatedParcel(
            depositParcelId,
            depositPaymentResult.paymentRedirectUrl,
            ambiguousRetry.paymentMethod,
          );
          if (
            depositPaymentResult.paymentRedirectUrl
            && lockedBackendPaymentMethod === 'VNPAY'
          ) {
            try {
              await openVnPayPayment({
                result: depositPaymentResult,
                kind: 'parcel_deposit',
                businessId: depositParcelId,
                ownerUserId,
              });
            } catch {
              Alert.alert(
                t('parcel.payment.redirectErrorTitle'),
                t('parcel.payment.redirectErrorDescription'),
              );
            }
          }
        } catch (error) {
          const apiError = toApiError(error);
          if (apiError.code === 'SESSION_INVALIDATED') {
            return;
          }
          if (isParcelAmbiguousPaymentError(error)) {
            Alert.alert(
              t('parcel.errors.ambiguousPaymentTitle'),
              t('parcel.errors.ambiguousPaymentDescription'),
            );
            return;
          }
          navigateToCreatedParcel(
            depositParcelId,
            null,
            ambiguousRetry.paymentMethod,
          );
          Alert.alert(
            t('parcel.create.savedTitle'),
            t('parcel.create.savedPaymentFailed', {
              error: getLocalizedApiErrorMessage(
                apiError,
                t,
                PARCEL_ERROR_TRANSLATION_KEYS,
              ),
            }),
          );
        }
        return;
      }

      let photoUrl: string | null = null;
      if (ambiguousRetry?.kind !== 'create' && photos[0]) {
        try {
          photoUrl = await uploadParcelPhoto(photos[0]);
        } catch (error) {
          const apiError = toApiError(error);
          if (apiError.code === 'SESSION_INVALIDATED') {
            return;
          }
          Alert.alert(
            t('parcel.errors.photoUploadTitle'),
            apiError.code === 'UNKNOWN_ERROR'
              ? t('parcel.errors.photoUploadDescription')
              : getLocalizedApiErrorMessage(
                  apiError,
                  t,
                  PARCEL_ERROR_TRANSLATION_KEYS,
                ),
          );
          return;
        }
      }

      let result: CreateParcelResult;
      try {
        if (
          ambiguousRetry?.kind !== 'create'
          && !isParcelQuoteUsable(
            selectedTrip,
            Date.now(),
            PARCEL_QUOTE_REFRESH_SAFETY_WINDOW_MS,
          )
        ) {
          await refetchAvailableTrips().catch(() => undefined);
          Alert.alert(
            t('parcel.errors.quoteExpiredTitle'),
            t('parcel.errors.quoteExpiredDescription'),
          );
          return;
        }

        result = ambiguousRetry?.kind === 'create'
          ? await createParcelMutation.retryRetainedAsync()
          : await createParcelMutation.mutateAsync(
            buildCreatePayload(photoUrl),
          );
      } catch (error) {
        const apiError = toApiError(error);
        const conflict = classifyParcelCreateConflict(error);
        if (conflict === 'session') {
          return;
        }
        if (conflict === 'quote_expired') {
          setAppliedPromo(null);
          setPromoCode('');
          setPromoError(undefined);
          setAmbiguousRetry(null);
          await refetchAvailableTrips().catch(() => undefined);
          Alert.alert(
            t('parcel.errors.quoteExpiredTitle'),
            t('parcel.errors.quoteExpiredDescription'),
          );
          return;
        }
        if (conflict === 'quote_invalid') {
          setAmbiguousRetry(null);
          clearTripSelection();
          await refetchAvailableTrips().catch(() => undefined);
          Alert.alert(
            t('parcel.errors.quoteInvalidTitle'),
            t('parcel.errors.quoteInvalidDescription'),
          );
          return;
        }
        if (
          conflict === 'ambiguous'
          || conflict === 'idempotency_pending'
        ) {
          setAmbiguousRetry({ kind: 'create' });
          Alert.alert(
            t('parcel.errors.ambiguousRequestTitle'),
            t('parcel.errors.ambiguousRequestDescription'),
          );
          return;
        }
        if (conflict === 'trip_freshness') {
          setAmbiguousRetry(null);
          clearTripSelection();
          await refetchAvailableTrips().catch(() => undefined);
          Alert.alert(
            t('parcel.errors.tripAvailabilityChangedTitle'),
            t('parcel.errors.tripAvailabilityChangedDescription'),
          );
          return;
        }
        if (conflict === 'code_collision') {
          setAmbiguousRetry(null);
          Alert.alert(
            t('app.name'),
            getLocalizedApiErrorMessage(
              apiError,
              t,
              PARCEL_ERROR_TRANSLATION_KEYS,
            ),
          );
          return;
        }
        if (conflict === 'retry_intent_changed') {
          Alert.alert(
            t('app.name'),
            t('parcel.errors.retryIntentChanged'),
          );
          return;
        }
        setAmbiguousRetry(null);
        Alert.alert(
          t('app.name'),
          getLocalizedApiErrorMessage(
            apiError,
            t,
            PARCEL_ERROR_TRANSLATION_KEYS,
          ),
        );
        return;
      }

      setPackage({ photos: [] });
      resetParcelPhotoUpload();

      let depositPaymentResult: Awaited<
        ReturnType<typeof depositPaymentMutation.mutateAsync>
      > | null = null;
      if (result.status === 'PENDING_PAYMENT') {
        try {
          depositPaymentResult = await depositPaymentMutation.mutateAsync({
            parcelId: result.parcelId,
            paymentMethod: lockedBackendPaymentMethod,
          });
        } catch (error) {
          const apiError = toApiError(error);
          if (apiError.code === 'SESSION_INVALIDATED') {
            return;
          }

          if (isParcelAmbiguousPaymentError(error)) {
            setAmbiguousRetry({
              kind: 'deposit',
              parcelId: result.parcelId,
              paymentMethod: lockedPaymentMethod,
            });
            Alert.alert(
              t('parcel.errors.ambiguousPaymentTitle'),
              t('parcel.errors.ambiguousPaymentDescription'),
            );
            return;
          }

          navigateToCreatedParcel(result.parcelId);
          Alert.alert(
            t('parcel.create.savedTitle'),
            t('parcel.create.savedPaymentFailed', {
              error: getLocalizedApiErrorMessage(
                apiError,
                t,
                PARCEL_ERROR_TRANSLATION_KEYS,
              ),
            }),
          );
          return;
        }
      }

      navigateToCreatedParcel(
        result.parcelId,
        depositPaymentResult?.paymentRedirectUrl,
      );

      if (
        depositPaymentResult?.paymentRedirectUrl
        && lockedBackendPaymentMethod === 'VNPAY'
      ) {
        try {
          await openVnPayPayment({
            result: depositPaymentResult,
            kind: 'parcel_deposit',
            businessId: result.parcelId,
            ownerUserId,
          });
        } catch {
          Alert.alert(
            t('parcel.payment.redirectErrorTitle'),
            t('parcel.payment.redirectErrorDescription'),
          );
        }
      }
    } finally {
      checkoutInFlightRef.current = false;
    }
  }, [
    advanceStep,
    ambiguousRetry,
    buildCreatePayload,
    clearTripSelection,
    createParcelMutation,
    depositPaymentMutation,
    lockedBackendPaymentMethod,
    lockedPaymentMethod,
    dropoffStation?.id,
    invalidateParcelCheckoutQueries,
    navigation,
    photos,
    refetchAvailableTrips,
    resetParcelPhotoUpload,
    selectedTrip,
    setPackage,
    step,
    t,
    uploadParcelPhoto,
    user?.id,
    validateCurrentStep,
  ]);

  const handleRetryAmbiguousRequest = useCallback(() => {
    if (!isAmbiguousRetryActive(ambiguousRetry)) {
      return;
    }
    handleSubmit().catch(() => undefined);
  }, [ambiguousRetry, handleSubmit]);

  const handlePromoCodeChange = useCallback((text: string) => {
    if (intentLocked) {
      return;
    }
    const normalizedCode = text.toUpperCase();
    setPromoCode(normalizedCode);
    setPromoError(undefined);
    setAppliedPromo(currentPromo => {
      if (!currentPromo) {
        return null;
      }

      return normalizePromoCode(normalizedCode) ===
        normalizePromoCode(currentPromo.code)
        ? currentPromo
        : null;
    });
  }, [intentLocked]);

  const handlePromoApply = useCallback(
    (nextCode: string, selectedPromo?: PromoOffer) => {
      if (intentLocked) {
        showAmbiguousRetryLockedAlert();
        return false;
      }
      const normalizedCode = normalizePromoCode(nextCode);
      const promo =
        selectedPromo || findPromoByCode(availablePromos, normalizedCode);

      setPromoCode(normalizedCode);

      if (!normalizedCode) {
        setAppliedPromo(null);
        setPromoError(t('parcel.promos.validation.enterCode'));
        return false;
      }

      if (!promo) {
        setAppliedPromo(null);
        setPromoError(t('parcel.promos.validation.unavailable'));
        return false;
      }

      if (
        promo.minimumSpend
        && quotePricing.grossPriceVnd < promo.minimumSpend
      ) {
        setAppliedPromo(null);
        setPromoError(
          t('parcel.promos.validation.minimumSpend', {
            amount: formatVnd(promo.minimumSpend),
          }),
        );
        return false;
      }

      setAppliedPromo(promo);
      setPromoError(undefined);
      return true;
    },
    [
      availablePromos,
      intentLocked,
      quotePricing.grossPriceVnd,
      showAmbiguousRetryLockedAlert,
      t,
    ],
  );

  const isStationSelectionStep = step === 1 || step === 2;
  const stationStepQuery =
    step === 1 ? originStationsQuery : destinationStationsQuery;
  const refetchStationStep = stationStepQuery.refetch;
  const stationStepStations = useMemo(
    () =>
      step === 1
        ? originStationsQuery.stations
        : destinationStationsQuery.stations.filter(
            station => station.id !== receivingStation?.id,
          ),
    [destinationStationsQuery.stations, originStationsQuery.stations, receivingStation?.id, step],
  );
  const stationStepLocation = step === 1 ? originScopeCode : destinationScopeCode;
  const missingLocation = !stationStepLocation;
  const selectedStationForStep =
    step === 1 ? receivingStation : step === 2 ? dropoffStation : undefined;
  const stationSelectionRole = step === 1 ? 'origin' : 'destination';
  const handleStationSelect =
    step === 1 ? handleSelectReceivingStation : handleSelectDropoffStation;
  const handleRetryStationStep = useCallback(() => {
    refetchStationStep().catch(() => undefined);
  }, [refetchStationStep]);
  const handleRetryAvailableTrips = useCallback(() => {
    refetchAvailableTrips().catch(() => undefined);
  }, [refetchAvailableTrips]);
  const handleChooseRouteLocation = useCallback(() => {
    navigation.navigate('CityPicker', { mode: step === 1 ? 'from' : 'to' });
  }, [navigation, step]);
  const isStationListReady =
    isStationSelectionStep &&
    !missingLocation &&
    !stationStepQuery.isLoading &&
    !stationStepQuery.isError &&
    stationStepStations.length > 0;

  const renderStation = useCallback(
    ({ item }: { item: Station }) => (
      <StationCard
        station={item}
        isSelected={selectedStationForStep?.id === item.id}
        onSelect={handleStationSelect}
        selectionRole={stationSelectionRole}
      />
    ),
    [handleStationSelect, selectedStationForStep?.id, stationSelectionRole],
  );

  const stationKeyExtractor = useCallback((station: Station) => station.id, []);

  const renderStationStep = () => {
    if (missingLocation) {
      return (
        <View style={styles.stateBox}>
          <WarningCircle
            size={32}
            color={theme.colors.warning}
            weight="duotone"
          />
          <Text style={styles.stateTitle}>
            {t('parcel.stations.chooseRouteFirstTitle')}
          </Text>
          <Text style={styles.stateText}>
            {t('parcel.stations.chooseRouteFirstDescription')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleChooseRouteLocation}
            style={({ pressed }) => [
              styles.routePickerButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.routePickerButtonText}>
              {step === 1
                ? t('parcel.stations.chooseOriginAction')
                : t('parcel.stations.chooseDestinationAction')}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (stationStepQuery.isLoading) {
      return (
        <View style={styles.stationLoadingContent}>
          <ParcelSkeleton type="station" count={3} />
        </View>
      );
    }

    if (stationStepQuery.isError) {
      return <ErrorView onRetry={handleRetryStationStep} />;
    }

    if (stationStepStations.length === 0) {
      return (
        <View style={styles.stateBox}>
          <WarningCircle
            size={32}
            color={theme.colors.warning}
            weight="duotone"
          />
          <Text style={styles.stateTitle}>
            {t('parcel.stations.emptyTitle')}
          </Text>
          <Text style={styles.stateText}>
            {stationStepLocation
              ? t('parcel.stations.emptyInLocation', {
                  location: step === 1 ? fromCity : toCity,
                })
              : t('parcel.stations.emptyDescription')}
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderTripPicker = () => (
    <View style={styles.bentoSummaryCard}>
      <Text style={styles.bentoCardHeading}>
        {t('parcel.trips.departureDate')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateRow}
      >
        {DATE_OFFSETS.map(offset => {
          const active = departureOffset === offset;
          const date = addApiCalendarDays(departureDateBase, offset);
          const label =
            offset === 0
              ? t('parcel.date.today')
              : offset === 1
              ? t('parcel.date.tomorrow')
              : formatShortDate(date);
          return (
            <DepartureDateChip
              active={active}
              key={offset}
              label={label}
              offset={offset}
              onSelect={handleDepartureOffsetSelect}
            />
          );
        })}
      </ScrollView>

      <View style={styles.tripHeaderRow}>
        <Text style={styles.bentoCardHeading}>
          {t('parcel.trips.availableTitle')}
        </Text>
        {availableTripsQuery.isFetching ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : null}
      </View>

      {availableTripsQuery.isLoading ? (
        <ParcelSkeleton type="summary" count={2} />
      ) : availableTripsQuery.isError && availableTrips.length === 0 ? (
        <ErrorView onRetry={handleRetryAvailableTrips} />
      ) : availableTrips.length === 0 ? (
        <View style={styles.stateBoxCompact}>
          <Clock size={24} color={theme.colors.textTertiary} weight="duotone" />
          <Text style={styles.stateTitle}>
            {t('parcel.trips.emptyTitle')}
          </Text>
          <Text style={styles.stateText}>
            {t('parcel.trips.emptyRouteDate', {
              origin:
                receivingStation?.name ?? t('parcel.route.selectedOrigin'),
              destination:
                dropoffStation?.name ??
                t('parcel.route.selectedDestination'),
              date: formatShortDate(
                addApiCalendarDays(departureDateBase, departureOffset),
              ),
            })}
          </Text>
          <Text style={styles.stateText}>
            {t('parcel.trips.emptyDescription')}
          </Text>
          <View style={styles.emptyTripActions}>
            <Pressable
              accessibilityRole="button"
              onPress={handleChangeTerminals}
              style={({ pressed }) => [
                styles.emptyTripSecondaryButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.emptyTripSecondaryText}>
                {t('parcel.trips.changeTerminals')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: emptyTripPrimaryDisabled }}
              disabled={emptyTripPrimaryDisabled}
              onPress={
                hasNextTripsPage ? requestNextTripsPage : handleTryNextDate
              }
              style={({ pressed }) => [
                styles.emptyTripPrimaryButton,
                emptyTripPrimaryDisabled
                  ? styles.emptyTripButtonDisabled
                  : null,
                pressed && !emptyTripPrimaryDisabled ? styles.pressed : null,
              ]}
            >
              {isFetchingNextTripsPage ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textInverse}
                />
              ) : (
                <Text style={styles.emptyTripPrimaryText}>
                  {hasNextTripsPage
                    ? t('parcel.trips.checkMore')
                    : t('parcel.trips.tryNextDay')}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        availableTrips.map(trip => (
          <TripOptionCard
            key={trip.tripId}
            trip={trip}
            selected={selectedTripId === trip.tripId}
            onPress={handleSelectTrip}
          />
        ))
      )}
      {availableTrips.length > 0 && isFetchingNextTripsPage ? (
        <View style={styles.tripLoadMoreFooter} accessibilityRole="progressbar">
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.tripLoadMoreText}>
            {t('parcel.trips.loadingMore')}
          </Text>
        </View>
      ) : null}

      {availableTrips.length > 0 && isFetchNextTripsPageError && hasNextTripsPage ? (
        <View style={styles.tripLoadMoreFooter} accessibilityRole="alert">
          <Text style={styles.tripLoadMoreText}>
            {t('parcel.trips.loadMoreFailed')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('parcel.trips.retryLoadMore')}
            onPress={requestNextTripsPage}
            hitSlop={8}
          >
            <Text style={styles.tripLoadMoreAction}>
              {t('parcel.trips.retryLoadMore')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const renderStep = () => {
    if (step === 1 || step === 2) {
      return renderStationStep();
    }

    if (step === 3) {
      return (
        <View style={styles.stepContent}>
          <PackageSizeSelector
            packageSize={packageSize}
            onSelect={handlePackageSizeChange}
          />
          <ParcelDimensionsInput
            key={packageSize}
            value={dimensions}
            onChange={handleDimensionsChange}
            onValidityChange={setDimensionsDraftValid}
            errorMessage={dimensionsErrorMessage}
          />
          <WeightSlider
            valueKg={packageWeight}
            onValueChange={handleWeightChange}
            onValidityChange={setWeightDraftValid}
          />
          <CategoryChips
            value={packageCategory}
            onChange={handleCategoryChange}
          />

          <PhotoPicker
            value={photos}
            onChange={handlePhotosChange}
            disabled={
              isUploadingParcelPhoto
              || createParcelMutation.isPending
              || depositPaymentMutation.isPending
            }
            maxPhotos={1}
            photoLabel={t('parcel.form.photoLabel')}
            title={t('parcel.form.photoTitle')}
            helperText={t('parcel.form.photoHelper')}
          />

          <Input
            label={t('parcel.form.estimatedValueLabel')}
            placeholder={t('parcel.form.estimatedValuePlaceholder')}
            keyboardType="numeric"
            maxLength={15}
            value={estimatedValue}
            onChangeText={handleEstimatedValueChange}
            hint={t('parcel.form.estimatedValueHint')}
          />

          <Input
            label={t('parcel.form.quantityLabel')}
            placeholder={t('parcel.form.quantityPlaceholder')}
            keyboardType="number-pad"
            maxLength={5}
            value={String(quantity)}
            onChangeText={handleQuantityChange}
            hint={t('parcel.form.quantityHint')}
            required
          />

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>
              {t('parcel.form.recipientTitle')}
            </Text>
            <Input
              ref={recipientNameRef}
              label={t('parcel.form.fullNameLabel')}
              placeholder={t('parcel.form.fullNamePlaceholder')}
              maxLength={255}
              value={recipientName}
              error={recipientErrors.name}
              required
              onChangeText={(value) => {
                setRecipientName(value);
                if (recipientErrors.name) setRecipientErrors((current) => ({ ...current, name: undefined }));
              }}
            />
            <Input
              ref={recipientPhoneRef}
              label={t('parcel.form.phoneLabel')}
              placeholder={t('parcel.form.phonePlaceholder')}
              keyboardType="phone-pad"
              maxLength={20}
              value={recipientPhone}
              error={recipientErrors.phone}
              required
              onChangeText={(value) => {
                setRecipientPhone(value);
                if (recipientErrors.phone) setRecipientErrors((current) => ({ ...current, phone: undefined }));
              }}
            />
            <Input
              ref={recipientEmailRef}
              label={t('parcel.form.emailLabel')}
              placeholder={t('parcel.form.emailPlaceholder')}
              keyboardType="email-address"
              maxLength={255}
              value={recipientEmail}
              error={recipientErrors.email}
              onChangeText={(value) => {
                setRecipientEmail(value);
                if (recipientErrors.email) setRecipientErrors((current) => ({ ...current, email: undefined }));
              }}
              autoCapitalize="none"
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.stepContent}>
        {renderTripPicker()}
        <PricingBreakdown
          receivingStation={receivingStation}
          dropoffStation={dropoffStation}
          packageSize={packageSize}
          packageCategory={packageCategory}
          packageWeightKg={estimatedWeightKg}
          dimensionsLabel={formatParcelDimensions(dimensions)}
          grossPrice={quotePricing.grossPriceVnd}
          discountAmount={quotePricing.discountAmountVnd}
          totalAfterDiscount={quotePricing.totalAfterDiscountVnd}
          depositPercent={quotePricing.depositPercent}
          depositDue={depositDue}
          promoCode={promoCode}
          promoApplied={Boolean(selectedVoucher)}
          onPromoCodeChange={handlePromoCodeChange}
          onPromoApplyCode={handlePromoApply}
          availablePromos={availablePromos}
          selectedPromoCode={appliedPromo?.code}
          appliedPromoLabel={
            selectedVoucher
              ? t('parcel.promos.appliedCode', {
                  code: selectedVoucher.code,
                })
              : undefined
          }
          promoError={promoError}
          paymentMethod={lockedPaymentMethod}
          disabled={intentLocked}
          onPaymentMethodChange={method => {
            if (!intentLocked) {
              setPaymentMethod(method);
            }
          }}
          walletBalance={walletBalanceQuery.data?.balance}
          walletIsLoading={walletBalanceQuery.isLoading}
          walletHasError={walletBalanceQuery.isError}
        />
        {ambiguousRetry ? (
          <View style={styles.ambiguousRetryCard}>
            <Text style={styles.ambiguousRetryText}>
              {ambiguousRetry.kind === 'deposit'
                ? t('parcel.errors.ambiguousPaymentDescription')
                : t('parcel.errors.ambiguousRequestDescription')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('parcel.actions.retryPreviousRequest')}
              disabled={isUploadingParcelPhoto
                || createParcelMutation.isPending
                || depositPaymentMutation.isPending}
              onPress={handleRetryAmbiguousRequest}
              style={({ pressed }) => [
                styles.ambiguousRetryButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.ambiguousRetryButtonText}>
                {t('parcel.actions.retryPreviousRequest')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  const isSubmitting =
    isUploadingParcelPhoto
    || createParcelMutation.isPending
    || depositPaymentMutation.isPending;
  const actionDisabled =
    isSubmitting ||
    intentLocked ||
    (isStationSelectionStep && !selectedStationForStep) ||
    ((step === 3 || step === 4) && !packageMeasurementsValid) ||
    (step === 4 && (
      availableTripsQuery.isLoading
      || !hasParcelQuoteContract(selectedTrip)
      || !isParcelQuoteUsable(selectedTrip)
      || voucherNeedsRevalidation
    ));
  const actionLabel =
    step === 1
      ? selectedStationForStep
        ? t('parcel.actions.continueToDestination')
        : t('parcel.actions.chooseOriginTerminal')
      : step === 2
      ? selectedStationForStep
        ? t('parcel.actions.continueToDetails')
        : t('parcel.actions.chooseDestinationTerminal')
      : step === 4
      ? t('common.confirm')
      : t('parcel.actions.nextStep');
  const routeTitle = selectedTrip
    ? `${selectedTrip.originStation.name} → ${selectedTrip.destinationStation.name}`
    : `${fromCity || t('parcel.route.origin')} → ${
        toCity || t('parcel.route.destination')
      }`;
  const stationCount = stationStepStations.length;
  const headerSubtitle =
    step === 1 || step === 2
      ? !stationStepLocation
        ? t('parcel.stations.chooseValidRoute')
        : stationStepQuery.isError
        ? t('parcel.stations.loadError')
        : stationStepQuery.isLoading
        ? t('parcel.stations.finding')
        : t('parcel.stations.availableCount', { count: stationCount })
      : step === 3
      ? t('parcel.summary.dimensionsAndWeight', {
          dimensions: formatParcelDimensions(dimensions),
          weight: estimatedWeightKg,
          unit: t('parcel.units.kg'),
        })
      : selectedTrip
      ? t('parcel.trips.operatorDeparture', {
          operator: selectedTrip.operatorName,
          departure: formatTripTime(selectedTrip.departureDateTime),
        })
      : t('parcel.trips.availableCount', {
          count: availableTrips.length,
        });
  const contentBottomPadding = 96 + Math.max(insets.bottom, spacing.md);
  const stationListContentStyle = useMemo(
    () => [styles.stationListContent, { paddingBottom: contentBottomPadding }],
    [contentBottomPadding, styles.stationListContent],
  );
  const scrollContentStyle = useMemo(
    () => [styles.scrollContent, { paddingBottom: contentBottomPadding }],
    [contentBottomPadding, styles.scrollContent],
  );
  const actionBarStyle = useMemo(
    () => [
      styles.actionBar,
      { paddingBottom: Math.max(insets.bottom, spacing.md) },
    ],
    [insets.bottom, styles.actionBar],
  );

  return (
    <View style={styles.root}>
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="460" width="100%">
          <Defs>
            <LinearGradient id="headerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop
                offset="0%"
                stopColor={theme.colors.primaryLight}
                stopOpacity={0.36}
              />
              <Stop
                offset="55%"
                stopColor={theme.colors.primaryLight}
                stopOpacity={0.12}
              />
              <Stop
                offset="100%"
                stopColor={theme.colors.background}
                stopOpacity={0}
              />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#headerGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StepProgressBar
          step={step}
          highestStepReached={highestStepReached}
          onStepPress={handleStepPress}
          onCancel={handleBackStep}
          title={routeTitle}
          subtitle={headerSubtitle}
        />
        <StepHeaderWithMascot step={step} />

        <View
          style={styles.keyboardAvoidingView}
        >
        {isStationListReady ? (
          <FlashList
            data={stationStepStations}
            renderItem={renderStation}
            keyExtractor={stationKeyExtractor}
            style={styles.scrollContainer}
            contentContainerStyle={stationListContentStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <AppKeyboardAwareScrollView
            style={styles.scrollContainer}
            contentContainerStyle={scrollContentStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScroll={handleContentScroll}
            scrollEventThrottle={16}
          >
            {renderStep()}
          </AppKeyboardAwareScrollView>
        )}

        <View style={actionBarStyle}>
          {step === 4 ? (
            <View style={styles.priceSummaryBox}>
              <Text style={styles.totalPriceLabel}>
                {t('parcel.summary.depositDue')}
              </Text>
              <Text style={styles.totalPriceValue}>
                {formatVnd(depositDue)}
              </Text>
            </View>
          ) : null}
          {isStationSelectionStep && selectedStationForStep ? (
            <Text style={styles.selectedStationSummary} numberOfLines={1}>
              {t('parcel.stations.selected', {
                name: selectedStationForStep.name,
              })}
            </Text>
          ) : null}
          <Pressable
            disabled={actionDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: actionDisabled }}
            style={({ pressed }) => [
              styles.nextActionButton,
              step === 4 ? styles.nextActionButtonSummary : null,
              actionDisabled ? styles.nextActionButtonDisabled : null,
              pressed && !actionDisabled ? styles.pressed : null,
            ]}
            onPress={handleSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <>
                <Text style={styles.nextActionButtonText}>
                  {actionLabel}
                </Text>
                <ArrowLeft
                  size={18}
                  color={theme.colors.textInverse}
                  weight="bold"
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </>
            )}
          </Pressable>
        </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 460,
    zIndex: 0,
  },
  container: { flex: 1, backgroundColor: 'transparent' },
  keyboardAvoidingView: { flex: 1 },
  scrollContainer: { flex: 1 },
  stationLoadingContent: {
    padding: spacing.xl,
  },
  scrollContent: { paddingHorizontal: spacing.xl, paddingTop: 0 },
  stationListContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  stepContent: { paddingBottom: 80 },
  formSection: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    marginBottom: spacing.sm,
  },
  bentoSummaryCard: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  bentoCardHeading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    marginBottom: spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.sm,
    marginBottom: spacing.lg,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  dateChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dateChipText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  dateChipTextActive: {
    color: theme.colors.textInverse,
  },
  tripHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
  },
  tripCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  tripCardDisabled: {
    opacity: 0.55,
  },
  ambiguousRetryCard: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  ambiguousRetryText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  ambiguousRetryButton: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ambiguousRetryButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  tripIcon: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripIconActive: {
    backgroundColor: theme.colors.primary,
  },
  tripMeta: {
    flex: 1,
    minWidth: 0,
  },
  tripOperator: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  tripRoute: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  tripTime: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tripPrice: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
    marginTop: 4,
  },
  tripLoadMoreFooter: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  tripLoadMoreText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  tripLoadMoreAction: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  stateBox: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  stateBoxCompact: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  stateTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  stateText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  routePickerButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primary,
    marginTop: spacing.sm,
  },
  routePickerButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  emptyTripActions: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  emptyTripSecondaryButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTripPrimaryButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTripButtonDisabled: {
    opacity: 0.45,
  },
  emptyTripSecondaryText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  emptyTripPrimaryText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
    textAlign: 'center',
  },
  actionBar: {
    ...theme.components.actionBar,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  priceSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalPriceLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  totalPriceValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.primary,
  },
  nextActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.components.primaryButton,
    borderRadius: borderRadius.md,
    height: 52,
    gap: spacing.sm,
  },
  nextActionButtonSummary: {
    marginTop: 0,
  },
  nextActionButtonDisabled: {
    opacity: 0.52,
  },
  selectedStationSummary: {
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  nextActionButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
