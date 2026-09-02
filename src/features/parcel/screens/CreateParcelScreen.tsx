import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, BackHandler, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, MapPin } from 'phosphor-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { getLocalizedApiErrorMessage, toApiError } from '@shared/api/errors';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import {
  isValidEmail,
  isValidVietnamPhone,
  normalizeVietnamPhone,
} from '@features/auth/validation/authValidation';
import { passengerHistoryKeys } from '@features/profile/api/passengerHistoryApi';
import { walletKeys } from '@features/profile/api/walletApi';
import { useLiveWalletBalance } from '@features/profile/hooks/useWallet';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useCurrentCoordinates, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { assertVnPaySdkAvailable, openVnPayPayment } from '@shared/payments';
import {
  addApiCalendarDays,
  toVietnamBusinessDate,
} from '@shared/utils/apiTime';
import { formatShortDate } from '@shared/utils/format';
import { toBackendPaymentMethod } from '@shared/utils/paymentMethod';
import type { ParcelStackParamList } from '@app/navigation/types';
import type { PromoOffer } from '@shared/utils/promo';
import { findPromoByCode, normalizePromoCode } from '@shared/utils/promo';
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
  AvailableParcelTripsParams,
  CreateParcelPayload,
  CreateParcelResult,
  GetParcelVouchersParams,
  ParcelBackendPaymentMethod,
  ParcelSize,
  Station,
} from '../types';
import {
  StepProgressBar,
  StepHeaderWithMascot,
  ParcelRouteDateStep,
  ParcelFitStep,
  ParcelDeliveryOptionsStep,
  ParcelCheckoutStep,
  RouteEditModal,
} from '../components';
import {
  areParcelDimensionsPositive,
  resolveParcelSizeFromDimensions,
  PARCEL_PACKAGE_SIZE_CONFIG,
  type ParcelDimensions,
} from '../config/parcelPackage';
import {
  CUSTOM_PARCEL_ITEM_CATEGORY,
  resolveParcelItemName,
  type ParcelItemCategory,
} from '../config/parcelItemCategories';
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
  isParcelQuoteErrorCode,
  isParcelQuoteUsable,
  PARCEL_QUOTE_REFRESH_SAFETY_WINDOW_MS,
} from '../utils/parcelQuote';
import {
  flattenTripDeliveryOptions,
  type ParcelDeliveryOption,
} from '../utils/parcelDeliveryOptions';
import {
  canLoadParcelDeliveryOptions,
  isParcelRouteGateActive,
  resolveParcelRouteChangeWizardState,
  type ParcelCreateStep,
  type ParcelRouteChange,
} from '../utils/parcelCreateFlow';

type CreateParcelNavProp = NativeStackNavigationProp<
  ParcelStackParamList,
  'CreateParcel'
>;

export function CreateParcelScreen(): React.JSX.Element {
  const navigation = useNavigation<CreateParcelNavProp>();
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
  const setReceivingStation = useParcelStore(
    state => state.setReceivingStation,
  );
  const setDropoffStation = useParcelStore(state => state.setDropoffStation);
  const packageSize = useParcelStore(state => state.size);
  const packageLengthCm = useParcelStore(state => state.lengthCm);
  const packageWidthCm = useParcelStore(state => state.widthCm);
  const packageHeightCm = useParcelStore(state => state.heightCm);
  const packageWeight = useParcelStore(state => state.weight);
  const packageCategory = useParcelStore(state => state.category);
  const customItemName = useParcelStore(state => state.customItemName);
  const paymentMethod = useParcelStore(state => state.paymentMethod);
  const setPackage = useParcelStore(state => state.setPackage);
  const setPaymentMethod = useParcelStore(state => state.setPaymentMethod);
  const swapLocations = useParcelStore(state => state.swapLocations);

  // Flow & Step State
  const [step, setStep] = useState<ParcelCreateStep>(1);
  const [highestStepReached, setHighestStepReached] =
    useState<ParcelCreateStep>(1);
  const [departureOffset, setDepartureOffset] = useState<number>(0);
  const [nearbySortRole, setNearbySortRole] = useState<'origin' | null>(null);
  const [isRouteEditModalVisible, setIsRouteEditModalVisible] = useState(false);

  // Form validity states for Step 2
  const [dimensionsDraftValid, setDimensionsDraftValid] =
    useState<boolean>(true);
  const [weightDraftValid, setWeightDraftValid] = useState<boolean>(true);
  const [customItemNameError, setCustomItemNameError] = useState<
    string | undefined
  >();

  // Selection states for Step 3
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedDropoffPointKey, setSelectedDropoffPointKey] = useState<
    string | null
  >(null);
  const [selectedQuoteFingerprint, setSelectedQuoteFingerprint] = useState<
    string | null
  >(null);

  // Recipient form states for Step 4 (Strict privacy: NEVER prefill from user profile)
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientErrors, setRecipientErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  }>({});

  // Optional step 4 states
  const [photos, setPhotos] = useState<string[]>([]);
  const [estimatedValue, setEstimatedValue] = useState<string>('');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoOffer | null>(null);
  const [promoError, setPromoError] = useState<string | undefined>();

  // Idempotency & In-Flight Tracking
  const [ambiguousRetry, setAmbiguousRetry] =
    useState<AmbiguousRetryState>(null);
  const [allowLeaveDespiteRetry, setAllowLeaveDespiteRetry] = useState(false);
  const intentLocked = isAmbiguousRetryActive(ambiguousRetry);
  const checkoutInFlightRef = useRef(false);
  const handledVoucherQuoteErrorAtRef = useRef<number>(0);

  const selectedTripIdRef = useRef<string | null>(null);
  const selectedQuoteFingerprintRef = useRef<string | null>(null);
  const previousRouteScopeRef = useRef({
    fromLocationCode,
    fromWardCode,
    toLocationCode,
    toWardCode,
  });

  const departureDateBase = useMemo(() => toVietnamBusinessDate(), []);
  const lockedPaymentMethod =
    ambiguousRetry?.kind === 'deposit'
      ? ambiguousRetry.paymentMethod
      : paymentMethod;
  const lockedBackendPaymentMethod: ParcelBackendPaymentMethod =
    toBackendPaymentMethod(lockedPaymentMethod) as ParcelBackendPaymentMethod;

  const walletBalanceQuery = useLiveWalletBalance();

  const isGateActive = isParcelRouteGateActive(
    fromLocationCode,
    toLocationCode,
  );

  const clearTripSelection = useCallback(() => {
    selectedTripIdRef.current = null;
    selectedQuoteFingerprintRef.current = null;
    setSelectedTripId(null);
    setSelectedDropoffPointKey(null);
    setSelectedQuoteFingerprint(null);
    setDropoffStation(undefined);
    setPromoCode('');
    setAppliedPromo(null);
    setPromoError(undefined);
  }, [setDropoffStation]);

  useEffect(() => {
    const previous = previousRouteScopeRef.current;
    const next = {
      fromLocationCode,
      fromWardCode,
      toLocationCode,
      toWardCode,
    };
    const fromChanged =
      previous.fromLocationCode !== next.fromLocationCode ||
      previous.fromWardCode !== next.fromWardCode;
    const toChanged =
      previous.toLocationCode !== next.toLocationCode ||
      previous.toWardCode !== next.toWardCode;

    previousRouteScopeRef.current = next;
    if (!fromChanged && !toChanged) return;

    const change: ParcelRouteChange =
      fromChanged && toChanged ? 'swap' : fromChanged ? 'from' : 'to';
    const nextWizardState = resolveParcelRouteChangeWizardState(
      step,
      highestStepReached,
      change,
    );

    clearTripSelection();
    if (fromChanged && toChanged) {
      setReceivingStation(undefined);
    }
    setNearbySortRole(null);
    setStep(nextWizardState.step);
    setHighestStepReached(nextWizardState.highestStepReached);
  }, [
    clearTripSelection,
    fromLocationCode,
    fromWardCode,
    highestStepReached,
    setReceivingStation,
    step,
    toLocationCode,
    toWardCode,
  ]);

  const handleQuotePriceChanged = useCallback(() => {
    clearTripSelection();
    setStep(3);
    Alert.alert(
      t('parcel.errors.quotePriceChangedTitle'),
      t('parcel.errors.quotePriceChangedDescription'),
    );
  }, [clearTripSelection, t]);

  const originScopeCode = fromWardCode || fromLocationCode || undefined;
  const currentLocation = useCurrentCoordinates(Boolean(nearbySortRole));

  const originStationsQuery = useParcelStations(
    originScopeCode,
    true,
    nearbySortRole === 'origin' ? currentLocation.coords : null,
    currentLocation.isResolving,
  );

  const dimensions: ParcelDimensions = useMemo(
    () => ({
      lengthCm: packageLengthCm,
      widthCm: packageWidthCm,
      heightCm: packageHeightCm,
    }),
    [packageHeightCm, packageLengthCm, packageWidthCm],
  );

  const departureDate = useMemo(
    () => addApiCalendarDays(departureDateBase, departureOffset),
    [departureDateBase, departureOffset],
  );

  const estimatedWeightKg = packageWeight;
  const parcelItemName = resolveParcelItemName(
    packageCategory,
    customItemName,
    t,
  );

  const tripSearchParams: AvailableParcelTripsParams | null = useMemo(() => {
    if (!receivingStation || !toLocationCode) return null;
    return {
      originStationId: receivingStation.id,
      departureDate,
      lengthCm: dimensions.lengthCm,
      widthCm: dimensions.widthCm,
      heightCm: dimensions.heightCm,
      estimatedWeightKg,
      destinationProvinceCode: toLocationCode,
      destinationLocationCode: toWardCode || undefined,
    };
  }, [
    departureDate,
    dimensions.heightCm,
    dimensions.lengthCm,
    dimensions.widthCm,
    estimatedWeightKg,
    receivingStation,
    toLocationCode,
    toWardCode,
  ]);

  const canSearchAvailableTrips = canLoadParcelDeliveryOptions(
    step,
    dimensionsDraftValid && areParcelDimensionsPositive(dimensions),
    weightDraftValid && estimatedWeightKg > 0,
  );
  const availableTripsQuery = useAvailableParcelTrips(
    tripSearchParams,
    canSearchAvailableTrips,
  );

  const availableTrips = useMemo(
    () => availableTripsQuery.data?.pages.flatMap(page => page.items) ?? [],
    [availableTripsQuery.data?.pages],
  );

  const deliveryOptions = useMemo(
    () => flattenTripDeliveryOptions(availableTrips),
    [availableTrips],
  );

  const selectedTrip = useMemo(
    () => availableTrips.find(trip => trip.tripId === selectedTripId) ?? null,
    [availableTrips, selectedTripId],
  );

  const selectedDeliveryOption = useMemo(
    () =>
      deliveryOptions.find(opt => opt.key === selectedDropoffPointKey) ?? null,
    [deliveryOptions, selectedDropoffPointKey],
  );

  const selectedDropoffPoint = selectedDeliveryOption?.dropoffPoint ?? null;

  useParcelQuoteLifecycle({
    enabled: step === 4,
    selectedTrip,
    selectedFingerprint: selectedQuoteFingerprint,
    isSearchSuccess: availableTripsQuery.isSuccess,
    isFetching: availableTripsQuery.isFetching,
    refetch: availableTripsQuery.refetch,
    clearQuoteDependentSelection: clearTripSelection,
    onPriceChanged: handleQuotePriceChanged,
  });

  const activeQuoteToken = selectedTrip?.quoteToken ?? null;
  const activeGrossPriceVnd =
    selectedTrip?.estimatedGrossPriceVnd ??
    selectedTrip?.estimatedPriceVnd ??
    0;

  useEffect(() => {
    selectedTripIdRef.current = selectedTripId;
  }, [selectedTripId]);

  useEffect(() => {
    selectedQuoteFingerprintRef.current = selectedQuoteFingerprint;
  }, [selectedQuoteFingerprint]);

  const voucherParams: GetParcelVouchersParams | null = useMemo(() => {
    if (
      !selectedTrip ||
      !isParcelQuoteUsable(selectedTrip) ||
      !activeQuoteToken
    ) {
      return null;
    }
    return {
      tripId: selectedTrip.tripId,
      sizeCategory:
        PARCEL_PACKAGE_SIZE_CONFIG[resolveParcelSizeFromDimensions(dimensions)]
          .sizeCategory,
      paymentMethod: lockedBackendPaymentMethod,
      quoteToken: activeQuoteToken,
      quoteExpiresAt: selectedTrip.quoteExpiresAt || '',
      estimatedGrossPriceVnd: activeGrossPriceVnd,
    };
  }, [
    activeGrossPriceVnd,
    activeQuoteToken,
    dimensions,
    lockedBackendPaymentMethod,
    selectedTrip,
  ]);

  const availableVouchersQuery = useAvailableParcelVouchers(
    voucherParams,
    Boolean(step === 4 && voucherParams),
  );

  const availablePromos = useMemo<PromoOffer[]>(() => {
    return (availableVouchersQuery.data ?? []).map(v =>
      mapParcelVoucherToPromo(v, t),
    );
  }, [availableVouchersQuery.data, t]);

  const selectedVoucher = useMemo(() => {
    if (!appliedPromo) return null;
    return (
      (availableVouchersQuery.data ?? []).find(
        v =>
          normalizePromoCode(v.code) === normalizePromoCode(appliedPromo.code),
      ) ?? null
    );
  }, [appliedPromo, availableVouchersQuery.data]);

  useEffect(() => {
    if (!appliedPromo) return;
    if (availableVouchersQuery.isPending) return;
    if (!selectedVoucher) {
      setAppliedPromo(null);
      setPromoError(t('parcel.promos.noLongerValid'));
    }
  }, [appliedPromo, availableVouchersQuery.isPending, selectedVoucher, t]);

  useEffect(() => {
    if (availableVouchersQuery.isError) {
      const apiError = toApiError(availableVouchersQuery.error);
      if (apiError.code && isParcelQuoteErrorCode(apiError.code)) {
        const now = Date.now();
        if (
          now - handledVoucherQuoteErrorAtRef.current >
          PARCEL_QUOTE_REFRESH_SAFETY_WINDOW_MS
        ) {
          handledVoucherQuoteErrorAtRef.current = now;
          clearTripSelection();
          setStep(3);
          Alert.alert(
            t('parcel.errors.quoteUnavailableTitle'),
            t('parcel.errors.quoteUnavailableDescription'),
          );
        }
      }
    }
  }, [
    availableVouchersQuery.error,
    availableVouchersQuery.isError,
    clearTripSelection,
    t,
  ]);

  const quotePricing = useMemo(() => {
    return calculateParcelQuotePricing(
      selectedTrip,
      selectedVoucher?.discountAmount ?? null,
    );
  }, [selectedTrip, selectedVoucher?.discountAmount]);

  const depositDue = quotePricing.depositDueVnd;

  // Mutations
  const { uploadParcelPhoto, isUploadingParcelPhoto, resetParcelPhotoUpload } =
    useParcelPhotoUpload();
  const createParcelMutation = useCreateParcel();
  const depositPaymentMutation = useStartParcelDepositPayment();

  const handleSelectDeliveryOption = useCallback(
    (option: ParcelDeliveryOption) => {
      const isSameTrip = option.trip.tripId === selectedTripIdRef.current;
      const nextFingerprint = getParcelQuoteSemanticFingerprint(option.trip);

      if (
        !isSameTrip ||
        !selectedQuoteFingerprintRef.current ||
        selectedQuoteFingerprintRef.current !== nextFingerprint
      ) {
        setPromoCode('');
        setAppliedPromo(null);
        setPromoError(undefined);
      }

      selectedTripIdRef.current = option.trip.tripId;
      selectedQuoteFingerprintRef.current = nextFingerprint;
      setSelectedTripId(option.trip.tripId);
      setSelectedDropoffPointKey(option.key);
      setSelectedQuoteFingerprint(nextFingerprint);

      if (option.dropoffPoint.type === 'STATION') {
        setDropoffStation({
          id: option.dropoffPoint.stationId,
          name: option.dropoffPoint.name,
          address: '',
          city: toCity,
          distance: null,
        });
      } else {
        setDropoffStation(undefined);
      }
    },
    [setDropoffStation, toCity],
  );

  const handleSelectReceivingStation = useCallback(
    (station: Station) => {
      setReceivingStation(station);
      clearTripSelection();
    },
    [clearTripSelection, setReceivingStation],
  );

  const handleDepartureOffsetChange = useCallback(
    (offset: number) => {
      setDepartureOffset(offset);
      clearTripSelection();
    },
    [clearTripSelection],
  );

  const handlePackageSizeChange = useCallback(
    (size: ParcelSize) => {
      setPackage({ size });
      clearTripSelection();
    },
    [clearTripSelection, setPackage],
  );

  const handleDimensionsChange = useCallback(
    (nextDimensions: ParcelDimensions) => {
      setPackage({
        lengthCm: nextDimensions.lengthCm,
        widthCm: nextDimensions.widthCm,
        heightCm: nextDimensions.heightCm,
      });
      clearTripSelection();
    },
    [clearTripSelection, setPackage],
  );

  const handleWeightChange = useCallback(
    (weight: number) => {
      setPackage({ weight });
      clearTripSelection();
    },
    [clearTripSelection, setPackage],
  );

  const handleCategoryChange = useCallback(
    (category: ParcelItemCategory) => {
      setPackage({ category });
      if (category !== 'Others') {
        setCustomItemNameError(undefined);
      }
    },
    [setPackage],
  );

  const handleCustomItemNameChange = useCallback(
    (name: string) => {
      setPackage({ customItemName: name });
      if (name.trim()) {
        setCustomItemNameError(undefined);
      }
    },
    [setPackage],
  );

  const handlePhotosChange = useCallback((nextPhotos: string[]) => {
    setPhotos(nextPhotos);
  }, []);

  const handleEstimatedValueChange = useCallback((value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    setEstimatedValue(clean);
  }, []);

  const handlePromoCodeChange = useCallback((code: string) => {
    setPromoCode(code);
    setPromoError(undefined);
  }, []);

  const handlePromoApply = useCallback(
    (code: string, promo?: PromoOffer) => {
      const normalized = normalizePromoCode(code);
      if (!normalized) {
        setPromoError(t('parcel.promos.codeRequired'));
        return false;
      }

      const matched =
        promo ||
        findPromoByCode(availablePromos, normalized) ||
        (availableVouchersQuery.data ?? [])
          .filter(v => normalizePromoCode(v.code) === normalized)
          .map(v => mapParcelVoucherToPromo(v, t))[0];

      if (!matched) {
        setPromoError(t('parcel.promos.invalidCode'));
        return false;
      }

      setAppliedPromo(matched);
      setPromoCode(matched.code);
      setPromoError(undefined);
      return true;
    },
    [availablePromos, availableVouchersQuery.data, t],
  );

  // Step Navigators
  const handleAdvanceFromStep1 = useCallback(() => {
    if (!receivingStation?.id) {
      Alert.alert(
        t('common.notice'),
        t('parcel.validation.selectOriginStation'),
      );
      return;
    }
    setStep(2);
    setHighestStepReached(prev => Math.max(prev, 2) as ParcelCreateStep);
  }, [receivingStation?.id, t]);

  const handleAdvanceFromStep2 = useCallback(() => {
    if (!dimensionsDraftValid || !areParcelDimensionsPositive(dimensions)) {
      Alert.alert(t('common.notice'), t('parcel.validation.invalidDimensions'));
      return;
    }
    if (!weightDraftValid || estimatedWeightKg <= 0) {
      Alert.alert(t('common.notice'), t('parcel.validation.invalidWeight'));
      return;
    }
    if (
      packageCategory === CUSTOM_PARCEL_ITEM_CATEGORY &&
      !customItemName.trim()
    ) {
      setCustomItemNameError(t('parcel.validation.customItemNameRequired'));
      return;
    }
    setStep(3);
    setHighestStepReached(prev => Math.max(prev, 3) as ParcelCreateStep);
  }, [
    customItemName,
    dimensions,
    dimensionsDraftValid,
    estimatedWeightKg,
    packageCategory,
    t,
    weightDraftValid,
  ]);

  const handleAdvanceFromStep3 = useCallback(() => {
    if (!selectedDeliveryOption || !selectedTrip || !selectedDropoffPoint) {
      Alert.alert(
        t('common.notice'),
        t('parcel.validation.selectDropoffPoint'),
      );
      return;
    }
    if (!isParcelQuoteUsable(selectedTrip)) {
      Alert.alert(t('common.notice'), t('parcel.trips.quoteUnavailable'));
      return;
    }
    setStep(4);
    setHighestStepReached(prev => Math.max(prev, 4) as ParcelCreateStep);
  }, [selectedDeliveryOption, selectedDropoffPoint, selectedTrip, t]);

  const openCityPicker = useCallback(
    (mode: 'from' | 'to') => {
      navigation.navigate('CityPicker', { mode });
    },
    [navigation],
  );

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Submission handler
  const handleCreateAndPay = useCallback(async () => {
    if (checkoutInFlightRef.current) return;

    const ownerUserId = user?.id;
    if (!ownerUserId) return;

    const isExactDepositRetry = ambiguousRetry?.kind === 'deposit';
    const isExactCreateRetry = ambiguousRetry?.kind === 'create';

    if (!isExactDepositRetry && !isExactCreateRetry) {
      const nextRecipientErrors: {
        name?: string;
        phone?: string;
        email?: string;
      } = {};
      if (!recipientName.trim()) {
        nextRecipientErrors.name = t('parcel.validation.recipientNameRequired');
      }
      if (!recipientPhone.trim()) {
        nextRecipientErrors.phone = t(
          'parcel.validation.recipientPhoneRequired',
        );
      } else if (!isValidVietnamPhone(recipientPhone)) {
        nextRecipientErrors.phone = t('parcel.validation.invalidVietnamPhone');
      }
      if (!recipientEmail.trim()) {
        nextRecipientErrors.email = t(
          'parcel.validation.recipientEmailRequired',
        );
      } else if (!isValidEmail(recipientEmail)) {
        nextRecipientErrors.email = t(
          'parcel.validation.invalidRecipientEmail',
        );
      }

      if (Object.keys(nextRecipientErrors).length > 0) {
        setRecipientErrors(nextRecipientErrors);
        return;
      }

      if (!selectedTrip || !selectedDropoffPoint || !receivingStation) {
        Alert.alert(
          t('common.notice'),
          t('parcel.validation.selectTripBeforeCreate'),
        );
        return;
      }

      if (!isParcelQuoteUsable(selectedTrip)) {
        Alert.alert(
          t('parcel.errors.quoteUnavailableTitle'),
          t('parcel.errors.quoteUnavailableDescription'),
        );
        return;
      }
    }

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

    const navigateToCreatedParcel = async (
      parcelId: string,
      paymentRedirectUrl?: string | null,
    ): Promise<void> => {
      setAmbiguousRetry(null);
      setAllowLeaveDespiteRetry(true);
      setPhotos([]);
      resetParcelPhotoUpload();

      const invalidations: Array<Promise<unknown>> = [
        queryClient.invalidateQueries({ queryKey: parcelKeys.all }),
        queryClient.invalidateQueries({ queryKey: passengerHistoryKeys.all }),
      ];
      if (lockedBackendPaymentMethod === 'WALLET') {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: walletKeys.all }),
        );
      }
      Promise.all(invalidations).catch(() => undefined);

      // Let React commit the retry-guard release before removing this route.
      // This keeps the completed checkout out of the back stack without letting
      // usePreventRemove reinterpret the replace action as a wizard back press.
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => resolve()),
      );
      navigation.replace('ParcelDetail', {
        parcelId,
        paymentRedirectUrl: paymentRedirectUrl ?? undefined,
        preferredPaymentMethod: lockedPaymentMethod,
      });
    };

    const openVnPayFromDetail = async (
      parcelId: string,
      depositResult: Awaited<
        ReturnType<typeof depositPaymentMutation.mutateAsync>
      >,
    ): Promise<void> => {
      await navigateToCreatedParcel(parcelId, depositResult.paymentRedirectUrl);

      if (!depositResult.paymentRedirectUrl) return;

      try {
        await openVnPayPayment({
          result: depositResult,
          kind: 'parcel_deposit',
          businessId: parcelId,
          ownerUserId,
        });
      } catch {
        Alert.alert(
          t('parcel.payment.redirectErrorTitle'),
          t('parcel.payment.redirectErrorDescription'),
        );
      }
    };

    const handleDepositFailure = async (
      error: unknown,
      parcelId: string,
    ): Promise<void> => {
      const apiError = toApiError(error);
      if (apiError.code === 'SESSION_INVALIDATED') return;

      if (isParcelAmbiguousPaymentError(error)) {
        setAllowLeaveDespiteRetry(false);
        setAmbiguousRetry({
          kind: 'deposit',
          parcelId,
          paymentMethod: lockedPaymentMethod,
        });
        Alert.alert(
          t('parcel.errors.ambiguousPaymentTitle'),
          t('parcel.errors.ambiguousPaymentDescription'),
        );
        return;
      }

      await navigateToCreatedParcel(parcelId);
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
    };

    try {
      if (isExactDepositRetry) {
        const parcelId = ambiguousRetry.parcelId;
        try {
          const depositResult =
            await depositPaymentMutation.retryRetainedAsync();
          if (lockedBackendPaymentMethod === 'VNPAY') {
            await openVnPayFromDetail(parcelId, depositResult);
          } else {
            await navigateToCreatedParcel(
              parcelId,
              depositResult.paymentRedirectUrl,
            );
          }
        } catch (error) {
          await handleDepositFailure(error, parcelId);
        }
        return;
      }

      let photoUrl: string | null = null;
      if (!isExactCreateRetry && photos[0]) {
        try {
          if (photos[0].startsWith('http')) {
            photoUrl = photos[0];
          } else {
            photoUrl = await uploadParcelPhoto(photos[0]);
          }
        } catch (error) {
          const apiError = toApiError(error);
          if (apiError.code === 'SESSION_INVALIDATED') return;
          Alert.alert(
            t('parcel.errors.photoUploadTitle'),
            getLocalizedApiErrorMessage(
              apiError,
              t,
              PARCEL_ERROR_TRANSLATION_KEYS,
            ),
          );
          return;
        }
      }

      let parcelResult: CreateParcelResult;
      try {
        if (isExactCreateRetry) {
          parcelResult = await createParcelMutation.retryRetainedAsync();
        } else {
          if (!selectedTrip || !selectedDropoffPoint || !receivingStation) {
            return;
          }

          const payload: CreateParcelPayload = buildCreateParcelPayload({
            tripId: selectedTrip.tripId,
            quoteToken: activeQuoteToken || '',
            dropoffStopId:
              selectedDropoffPoint.type === 'STOP'
                ? selectedDropoffPoint.stopId
                : null,
            bookingId: null,
            itemName: parcelItemName,
            description: null,
            sizeCategory:
              PARCEL_PACKAGE_SIZE_CONFIG[
                resolveParcelSizeFromDimensions(dimensions)
              ].sizeCategory,
            lengthCm: dimensions.lengthCm,
            widthCm: dimensions.widthCm,
            heightCm: dimensions.heightCm,
            estimatedWeightKg,
            photoUrl,
            recipient: {
              fullName: recipientName.trim(),
              phoneNumber: normalizeVietnamPhone(recipientPhone),
              email: recipientEmail.trim(),
            },
            deliveryMethod: 'TERMINAL_PICKUP',
            paymentMethod: lockedBackendPaymentMethod,
            voucherCode: selectedVoucher?.code ?? null,
            declaredValueVnd: estimatedValue ? Number(estimatedValue) : null,
          });

          parcelResult = await createParcelMutation.mutateAsync(payload);
        }
      } catch (error) {
        const apiError = toApiError(error);
        const conflict = classifyParcelCreateConflict(error);

        if (conflict === 'session') return;

        if (conflict === 'dropoff_unavailable') {
          setAmbiguousRetry(null);
          clearTripSelection();
          setStep(3);
          Alert.alert(
            t('parcel.errors.dropoffStopUnavailableTitle'),
            t('parcel.errors.dropoffStopUnavailableDescription'),
          );
          return;
        }

        if (
          conflict === 'trip_freshness' ||
          conflict === 'quote_expired' ||
          conflict === 'quote_invalid'
        ) {
          setAmbiguousRetry(null);
          clearTripSelection();
          setStep(3);
          Alert.alert(
            t('parcel.errors.quoteUnavailableTitle'),
            t('parcel.errors.quoteUnavailableDescription'),
          );
          return;
        }

        if (conflict === 'ambiguous' || conflict === 'idempotency_pending') {
          setAllowLeaveDespiteRetry(false);
          setAmbiguousRetry({ kind: 'create' });
          Alert.alert(
            t('parcel.errors.ambiguousRequestTitle'),
            t('parcel.errors.ambiguousRequestDescription'),
          );
          return;
        }

        setAmbiguousRetry(null);
        const messageKey =
          PARCEL_ERROR_TRANSLATION_KEYS[apiError.code ?? ''] ??
          'parcel.errors.createFailed';
        Alert.alert(
          t('common.error'),
          t(messageKey, {
            defaultValue: getLocalizedApiErrorMessage(
              apiError,
              t,
              PARCEL_ERROR_TRANSLATION_KEYS,
            ),
          }),
        );
        return;
      }

      const parcelId = parcelResult.parcelId;

      if (parcelResult.status !== 'PENDING_PAYMENT') {
        await navigateToCreatedParcel(parcelId);
        return;
      }

      let depositResult: Awaited<
        ReturnType<typeof depositPaymentMutation.mutateAsync>
      >;
      try {
        depositResult = await depositPaymentMutation.mutateAsync({
          parcelId,
          paymentMethod: lockedBackendPaymentMethod,
          ...(lockedBackendPaymentMethod === 'VNPAY'
            ? { paymentReturnMode: 'MOBILE_SDK' as const }
            : {}),
        });
      } catch (error) {
        await handleDepositFailure(error, parcelId);
        return;
      }

      if (lockedBackendPaymentMethod === 'VNPAY') {
        await openVnPayFromDetail(parcelId, depositResult);
        return;
      }

      await navigateToCreatedParcel(parcelId, depositResult.paymentRedirectUrl);
    } finally {
      checkoutInFlightRef.current = false;
    }
  }, [
    activeQuoteToken,
    ambiguousRetry,
    clearTripSelection,
    createParcelMutation,
    depositPaymentMutation,
    dimensions,
    estimatedValue,
    estimatedWeightKg,
    lockedBackendPaymentMethod,
    lockedPaymentMethod,
    navigation,
    parcelItemName,
    photos,
    queryClient,
    receivingStation,
    recipientEmail,
    recipientName,
    recipientPhone,
    resetParcelPhotoUpload,
    selectedDropoffPoint,
    selectedTrip,
    selectedVoucher?.code,
    t,
    uploadParcelPhoto,
    user?.id,
  ]);

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

  const handleOpenRouteEditModal = useCallback(() => {
    if (intentLocked) {
      showAmbiguousRetryLockedAlert();
      return;
    }
    setIsRouteEditModalVisible(true);
  }, [intentLocked, showAmbiguousRetryLockedAlert]);

  const handleChangeDeliveryOption = useCallback(() => {
    if (intentLocked) {
      showAmbiguousRetryLockedAlert();
      return;
    }
    setStep(3);
  }, [intentLocked, showAmbiguousRetryLockedAlert]);

  const handleStepBarSelect = useCallback(
    (targetStep: number) => {
      if (intentLocked) {
        showAmbiguousRetryLockedAlert();
        return;
      }
      if (targetStep < step) {
        setStep(targetStep as ParcelCreateStep);
      } else if (targetStep === 2 && highestStepReached >= 2) {
        setStep(2);
      } else if (targetStep === 3 && highestStepReached >= 3) {
        setStep(3);
      } else if (targetStep === 4 && highestStepReached >= 4) {
        setStep(4);
      }
    },
    [highestStepReached, intentLocked, showAmbiguousRetryLockedAlert, step],
  );

  const handleBackPress = useCallback(() => {
    if (intentLocked) {
      navigation.goBack();
      return true;
    }
    if (step > 1) {
      setStep(curr => (curr - 1) as ParcelCreateStep);
      return true;
    }
    return false;
  }, [intentLocked, navigation, step]);

  usePreventRemove(intentLocked && !allowLeaveDespiteRetry, ({ data }) => {
    confirmLeaveWithAmbiguousRetry(() => navigation.dispatch(data.action));
  });

  useEffect(() => {
    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );
    return () => sub.remove();
  }, [handleBackPress]);

  // If Route Gate is active (from/to missing), render Area Gate Screen
  if (isGateActive) {
    return (
      <View style={styles.root}>
        {/* Universal Gradient background */}
        <View style={styles.gradientContainer} pointerEvents="none">
          <Svg height="460" width="100%">
            <Defs>
              <LinearGradient
                id="gateHeaderGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop
                  offset="0%"
                  stopColor={theme.colors.primaryLight}
                  stopOpacity={theme.isDark ? 0.24 : 0.36}
                />
                <Stop
                  offset="55%"
                  stopColor={theme.colors.primaryLight}
                  stopOpacity={theme.isDark ? 0.08 : 0.12}
                />
                <Stop
                  offset="100%"
                  stopColor={theme.colors.background}
                  stopOpacity={0}
                />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#gateHeaderGrad)" />
          </Svg>
        </View>

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Top Bar with Back Button */}
          <View style={styles.gateNavbar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.navButtonLeft,
                pressed ? styles.pressed : null,
              ]}
            >
              <ArrowLeft size={20} color={theme.colors.primary} weight="bold" />
            </Pressable>
            <Text style={styles.gateNavbarTitle}>
              {t('parcel.create.title')}
            </Text>
            <View style={styles.navButtonPlaceholder} />
          </View>

          <View style={styles.gateContainer}>
            <View style={styles.gateIconCircle}>
              <MapPin size={40} color={theme.colors.primary} weight="duotone" />
            </View>

            <Text style={styles.gateTitle}>{t('parcel.routeGate.title')}</Text>
            <Text style={styles.gateDescription}>
              {t('parcel.routeGate.description')}
            </Text>

            <View style={styles.gateButtonsCol}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('parcel.routeGate.selectSendingArea')}
                onPress={() => openCityPicker('from')}
                style={({ pressed }) => [
                  styles.gateActionButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.gateActionButtonText}>
                  {fromCity
                    ? `${t('parcel.route.from')}: ${fromCity}`
                    : t('parcel.routeGate.selectSendingArea')}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('parcel.routeGate.selectReceivingArea')}
                onPress={() => openCityPicker('to')}
                style={({ pressed }) => [
                  styles.gateActionButton,
                  styles.gateActionSecondary,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.gateActionButtonText,
                    styles.gateActionSecondaryText,
                  ]}
                >
                  {toCity
                    ? `${t('parcel.route.to')}: ${toCity}`
                    : t('parcel.routeGate.selectReceivingArea')}
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Universal Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="460" width="100%">
          <Defs>
            <LinearGradient
              id="parcelHeaderGrad"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <Stop
                offset="0%"
                stopColor={theme.colors.primaryLight}
                stopOpacity={theme.isDark ? 0.24 : 0.36}
              />
              <Stop
                offset="55%"
                stopColor={theme.colors.primaryLight}
                stopOpacity={theme.isDark ? 0.08 : 0.12}
              />
              <Stop
                offset="100%"
                stopColor={theme.colors.background}
                stopOpacity={0}
              />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#parcelHeaderGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Wizard Progress Bar */}
        <StepProgressBar
          step={step}
          highestStepReached={highestStepReached}
          onStepPress={handleStepBarSelect}
          onCancel={handleCancel}
          title={t('parcel.create.title')}
          routeSummary={
            fromCity && toCity
              ? {
                  from: fromCity,
                  to: toCity,
                  onPress: handleOpenRouteEditModal,
                }
              : undefined
          }
        />

        {/* Mascot Step Header */}
        <StepHeaderWithMascot step={step} />

        {/* Wizard Step Body */}
        <View style={styles.content}>
          {step === 1 ? (
            <ParcelRouteDateStep
              stations={originStationsQuery.stations}
              selectedStation={receivingStation ?? null}
              onSelectStation={handleSelectReceivingStation}
              departureOffset={departureOffset}
              onSelectDepartureOffset={handleDepartureOffsetChange}
              departureDateBase={departureDateBase}
              isLoadingStations={originStationsQuery.isLoading}
              isStationsError={originStationsQuery.isError}
              onRetryStations={() =>
                originStationsQuery.refetch().catch(() => undefined)
              }
              nearbySortRequested={Boolean(nearbySortRole)}
              nearbySortResolved={
                nearbySortRole === 'origin' && currentLocation.coords != null
              }
              nearbySortUnavailable={
                nearbySortRole === 'origin' && currentLocation.error != null
              }
              isResolvingLocation={currentLocation.isResolving}
              onSortNearby={() => setNearbySortRole('origin')}
              onContinue={handleAdvanceFromStep1}
            />
          ) : step === 2 ? (
            <ParcelFitStep
              packageSize={packageSize}
              dimensions={dimensions}
              weight={estimatedWeightKg}
              category={packageCategory}
              customItemName={customItemName}
              onSelectPackageSize={handlePackageSizeChange}
              onChangeDimensions={handleDimensionsChange}
              onChangeWeight={handleWeightChange}
              onChangeCategory={handleCategoryChange}
              onChangeCustomItemName={handleCustomItemNameChange}
              dimensionsDraftValid={dimensionsDraftValid}
              onDimensionsValidityChange={setDimensionsDraftValid}
              weightDraftValid={weightDraftValid}
              onWeightValidityChange={setWeightDraftValid}
              customItemNameError={customItemNameError}
              onContinue={handleAdvanceFromStep2}
            />
          ) : step === 3 ? (
            <ParcelDeliveryOptionsStep
              options={deliveryOptions}
              selectedOptionKey={selectedDropoffPointKey}
              onSelectOption={handleSelectDeliveryOption}
              isLoading={availableTripsQuery.isLoading}
              isError={availableTripsQuery.isError}
              onRetry={() =>
                availableTripsQuery.refetch().catch(() => undefined)
              }
              onTryNextDay={() =>
                handleDepartureOffsetChange(departureOffset + 1)
              }
              onChangeRoute={handleOpenRouteEditModal}
              isFetchingNextPage={availableTripsQuery.isFetchingNextPage}
              hasNextPage={Boolean(availableTripsQuery.hasNextPage)}
              onLoadMore={() => availableTripsQuery.fetchNextPage()}
              onContinue={handleAdvanceFromStep3}
              departureOffset={departureOffset}
              onSelectDepartureOffset={handleDepartureOffsetChange}
              departureDateBase={departureDateBase}
              departureDateText={formatShortDate(departureDate)}
            />
          ) : (
            <ParcelCheckoutStep
              selectedOption={selectedDeliveryOption}
              onChangeDeliveryOption={handleChangeDeliveryOption}
              recipientName={recipientName}
              recipientPhone={recipientPhone}
              recipientEmail={recipientEmail}
              onRecipientNameChange={name => {
                setRecipientName(name);
                if (recipientErrors.name)
                  setRecipientErrors(curr => ({ ...curr, name: undefined }));
              }}
              onRecipientPhoneChange={phone => {
                setRecipientPhone(phone);
                if (recipientErrors.phone)
                  setRecipientErrors(curr => ({ ...curr, phone: undefined }));
              }}
              onRecipientEmailChange={email => {
                setRecipientEmail(email);
                if (recipientErrors.email)
                  setRecipientErrors(curr => ({ ...curr, email: undefined }));
              }}
              recipientErrors={recipientErrors}
              photos={photos}
              onPhotosChange={handlePhotosChange}
              isPhotoUploading={isUploadingParcelPhoto}
              estimatedValue={estimatedValue}
              onEstimatedValueChange={handleEstimatedValueChange}
              receivingStation={receivingStation}
              toCity={toCity}
              packageSize={packageSize}
              parcelItemName={parcelItemName}
              estimatedWeightKg={estimatedWeightKg}
              dimensions={dimensions}
              quotePricing={quotePricing}
              depositDue={depositDue}
              promoCode={promoCode}
              selectedVoucher={selectedVoucher}
              onPromoCodeChange={handlePromoCodeChange}
              onPromoApply={handlePromoApply}
              availablePromos={availablePromos}
              appliedPromo={appliedPromo}
              promoError={promoError}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              walletBalance={walletBalanceQuery.data?.balance}
              walletIsLoading={walletBalanceQuery.isLoading}
              walletHasError={walletBalanceQuery.isError}
              ambiguousRetry={ambiguousRetry}
              onRetryAmbiguous={handleCreateAndPay}
              intentLocked={intentLocked}
              isSubmitting={
                isUploadingParcelPhoto ||
                createParcelMutation.isPending ||
                depositPaymentMutation.isPending
              }
              onSubmit={handleCreateAndPay}
            />
          )}
        </View>

        <RouteEditModal
          visible={isRouteEditModalVisible}
          onClose={() => setIsRouteEditModalVisible(false)}
          fromCity={fromCity}
          toCity={toCity}
          onEditFrom={() => openCityPicker('from')}
          onEditTo={() => openCityPicker('to')}
          onSwap={() => {
            swapLocations();
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 460,
    zIndex: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  gateNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  gateNavbarTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  navButtonLeft: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: theme.colors.primaryFaded,
  },
  navButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  gateContainer: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  gateCard: {
    ...theme.components.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  gateTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  gateDescription: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSizes.sm * 1.4,
  },
  gateButtonsCol: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  gateActionButton: {
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateActionButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  gateActionSecondary: {
    backgroundColor: theme.colors.primaryFaded,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  gateActionSecondaryText: {
    color: theme.colors.primary,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
