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
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
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

import { Input, PhotoPicker } from '@shared/components';
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
import { useLocations } from '@features/location/hooks/useLocations';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useCurrentCoordinates, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import {
  openPaymentRedirect,
} from '@shared/utils/paymentRedirect';
import {
  addLocalDays,
  startOfLocalDay,
  toLocalIsoDate,
} from '@shared/utils/localDate';
import {
  formatDateTime,
  formatShortDate,
  formatVnd,
} from '@shared/utils/format';
import { toBackendPaymentMethod } from '@shared/utils/paymentMethod';
import type { ParcelStackParamList } from '@app/navigation/types';
import type { PromoOffer } from '@shared/utils/promo';
import {
  findPromoByCode,
  isPromoExpired,
  normalizePromoCode,
} from '@shared/utils/promo';
import { findLocationByName } from '@features/location/utils/locationSearch';
import { useParcelStore } from '../store/useParcelStore';
import { mapParcelVoucherToPromo, parcelKeys } from '../api/parcelApi';
import {
  useAvailableParcelTrips,
  useAvailableParcelVouchers,
  useCreateParcel,
  useStartParcelDepositPayment,
} from '../hooks/useParcelQueries';
import { useParcelPhotoUpload } from '../hooks/useParcelPhotoUpload';
import { useParcelStations } from '../hooks/useParcelStations';
import type {
  AvailableParcelTrip,
  CreateParcelPayload,
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
  formatParcelDimensions,
  getParcelSizeCategory,
  getSmallestParcelSizeForDimensions,
  isParcelSizeAtLeast,
  type ParcelDimensions,
} from '../config/parcelPackage';
import { buildCreateParcelPayload } from '../utils/createParcelPayload';
import { PARCEL_ERROR_TRANSLATION_KEYS } from '../utils/parcelPresentation';

type CreateParcelNavProp = NativeStackNavigationProp<
  ParcelStackParamList,
  'CreateParcel'
>;

const DATE_OFFSETS = Array.from({ length: 30 }, (_, index) => index);
const MAX_DEPARTURE_OFFSET = DATE_OFFSETS.length - 1;

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
  onPress: (tripId: string) => void;
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => {
    onPress(trip.tripId);
  }, [onPress, trip.tripId]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.tripCard,
        selected ? styles.tripCardActive : null,
        pressed ? styles.pressed : null,
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
          {t('parcel.trips.priceSummary', {
            deposit: formatVnd(trip.estimatedDepositVnd),
            estimated: formatVnd(trip.estimatedPriceVnd),
          })}
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
  const receivingStation = useParcelStore(state => state.receivingStation);
  const dropoffStation = useParcelStore(state => state.dropoffStation);
  const packageSize = useParcelStore(state => state.size);
  const packageWeight = useParcelStore(state => state.weight);
  const packageLengthCm = useParcelStore(state => state.lengthCm);
  const packageWidthCm = useParcelStore(state => state.widthCm);
  const packageHeightCm = useParcelStore(state => state.heightCm);
  const packageCategory = useParcelStore(state => state.category);
  const estimatedValue = useParcelStore(state => state.estimatedValue);
  const photos = useParcelStore(state => state.photos);
  const paymentMethod = useParcelStore(state => state.paymentMethod);
  const setPackage = useParcelStore(state => state.setPackage);
  const setPaymentMethod = useParcelStore(state => state.setPaymentMethod);
  const setReceivingStation = useParcelStore(
    state => state.setReceivingStation,
  );
  const setDropoffStation = useParcelStore(state => state.setDropoffStation);
  const { data: locations = [] } = useLocations();

  const [step, setStep] = useState(1);
  const [highestStepReached, setHighestStepReached] = useState(1);
  const [recipientName, setRecipientName] = useState(user?.fullName ?? '');
  const [recipientPhone, setRecipientPhone] = useState(user?.phone ?? '');
  const [recipientEmail, setRecipientEmail] = useState(user?.email ?? '');
  const departureDateBase = useMemo(() => startOfLocalDay(new Date()), []);
  const [departureOffset, setDepartureOffset] = useState(0);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripPageIndex, setTripPageIndex] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoOffer | null>(null);
  const [promoError, setPromoError] = useState<string | undefined>(undefined);
  const [dimensionsDraftValid, setDimensionsDraftValid] = useState(true);
  const [weightDraftValid, setWeightDraftValid] = useState(true);
  const previousTripSearchRef = useRef<string | null>(null);
  const selectedTripIdRef = useRef<string | null>(null);
  const checkoutInFlightRef = useRef(false);
  const walletBalanceQuery = useWalletBalance(step === 4);

  const currentLocation = useCurrentCoordinates(step === 1 || step === 2);

  useEffect(() => {
    if (!recipientName && user?.fullName) {
      setRecipientName(user.fullName);
    }
    if (!recipientPhone && user?.phone) {
      setRecipientPhone(user.phone);
    }
    if (!recipientEmail && user?.email) {
      setRecipientEmail(user.email);
    }
  }, [
    recipientEmail,
    recipientName,
    recipientPhone,
    user?.email,
    user?.fullName,
    user?.phone,
  ]);

  const originLocation = useMemo(() => {
    return (
      locations.find(location => location.code === fromLocationCode) ??
      findLocationByName(locations, fromCity) ??
      null
    );
  }, [fromCity, fromLocationCode, locations]);

  const destinationLocation = useMemo(() => {
    return (
      locations.find(location => location.code === toLocationCode) ??
      findLocationByName(locations, toCity) ??
      null
    );
  }, [locations, toCity, toLocationCode]);

  const originStationsQuery = useParcelStations(
    originLocation,
    step === 1,
    currentLocation.coords,
    currentLocation.isResolving,
  );
  const destinationStationsQuery = useParcelStations(
    destinationLocation,
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
  const smallestPackageSize = useMemo(
    () => getSmallestParcelSizeForDimensions(dimensions),
    [dimensions],
  );
  const dimensionsFitSelectedTier =
    smallestPackageSize !== null &&
    isParcelSizeAtLeast(packageSize, smallestPackageSize);
  const packageMeasurementsValid =
    dimensionsDraftValid &&
    weightDraftValid &&
    dimensionsFitSelectedTier &&
    packageWeight > 0;
  const dimensionsErrorMessage = !dimensionsDraftValid
    ? t('parcel.validation.dimensionsPositive')
    : smallestPackageSize === null
    ? t('parcel.validation.dimensionsTooLarge')
    : !dimensionsFitSelectedTier
    ? t('parcel.validation.chooseLargerSize')
    : undefined;
  const sizeCategory = getParcelSizeCategory(packageSize);
  const estimatedWeightKg = packageWeight;
  const departureDate = toLocalIsoDate(
    addLocalDays(departureDateBase, departureOffset),
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
  const tripPages = availableTripsQuery.data?.pages;
  const availableTrips = useMemo(() => {
    const tripById = new Map<string, AvailableParcelTrip>();
    tripPages?.forEach(page => {
      page.items.forEach(trip => tripById.set(trip.tripId, trip));
    });
    return Array.from(tripById.values());
  }, [tripPages]);
  const visibleTrips = useMemo(() => {
    const tripById = new Map<string, AvailableParcelTrip>();
    tripPages?.[tripPageIndex]?.items.forEach(trip => {
      tripById.set(trip.tripId, trip);
    });
    return Array.from(tripById.values());
  }, [tripPageIndex, tripPages]);
  const loadedTripPageCount = tripPages?.length ?? 0;
  const canGoToPreviousTripPage = tripPageIndex > 0;
  const canGoToNextTripPage =
    tripPageIndex + 1 < loadedTripPageCount || Boolean(hasNextTripsPage);
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
    const previousFingerprint = previousTripSearchRef.current;
    previousTripSearchRef.current = tripSearchFingerprint;
    if (previousFingerprint && previousFingerprint !== tripSearchFingerprint) {
      setSelectedTripId(null);
      setTripPageIndex(0);
      setPromoCode('');
      setAppliedPromo(null);
      setPromoError(undefined);
    }
  }, [tripSearchFingerprint]);

  useEffect(() => {
    if (loadedTripPageCount > 0 && tripPageIndex >= loadedTripPageCount) {
      setTripPageIndex(loadedTripPageCount - 1);
    }
  }, [loadedTripPageCount, tripPageIndex]);

  useEffect(() => {
    if (
      availableTripsQuery.isSuccess &&
      !availableTripsQuery.isFetching &&
      selectedTripId &&
      !selectedTrip
    ) {
      setSelectedTripId(null);
      setPromoCode('');
      setAppliedPromo(null);
      setPromoError(undefined);
    }
  }, [
    availableTripsQuery.isFetching,
    availableTripsQuery.isSuccess,
    selectedTrip,
    selectedTripId,
  ]);

  const voucherParams = useMemo(() => {
    if (!selectedTrip) {
      return null;
    }

    return {
      tripId: selectedTrip.tripId,
      sizeCategory,
      paymentMethod: backendPaymentMethod,
      orderAmount: selectedTrip.estimatedDepositVnd,
    };
  }, [backendPaymentMethod, selectedTrip, sizeCategory]);

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
    if (vouchersQuery.isSuccess && appliedPromo && !selectedVoucher) {
      setAppliedPromo(null);
      setPromoError(
        t('parcel.promos.noLongerValid'),
      );
    }
  }, [appliedPromo, selectedVoucher, t, vouchersQuery.isSuccess]);

  const estimatedPrice = selectedTrip?.estimatedPriceVnd ?? 0;
  const depositBeforeDiscount = selectedTrip?.estimatedDepositVnd ?? 0;
  const promoDiscount = selectedVoucher?.discountAmount ?? 0;
  const depositDue = Math.max(depositBeforeDiscount - promoDiscount, 0);

  useEffect(() => {
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
    paymentMethod,
    setPaymentMethod,
    walletBalanceQuery.data?.balance,
    walletBalanceQuery.isError,
    walletBalanceQuery.isLoading,
  ]);

  const createParcelMutation = useCreateParcel();
  const depositPaymentMutation = useStartParcelDepositPayment();
  const {
    uploadParcelPhoto,
    isUploadingParcelPhoto,
    resetParcelPhotoUpload,
  } = useParcelPhotoUpload();

  const handleBackStep = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
      return true;
    }

    navigation.goBack();
    return true;
  }, [navigation, step]);

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
      const fittingSize = getSmallestParcelSizeForDimensions(nextDimensions);
      const shouldPromoteSize =
        fittingSize !== null &&
        fittingSize !== packageSize &&
        isParcelSizeAtLeast(fittingSize, packageSize);

      setPackage(
        shouldPromoteSize
          ? { size: fittingSize, ...nextDimensions }
          : nextDimensions,
      );
    },
    [packageSize, setPackage],
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

  const handleSelectTrip = useCallback((tripId: string) => {
    if (tripId === selectedTripIdRef.current) {
      return;
    }

    selectedTripIdRef.current = tripId;
    setPromoCode('');
    setAppliedPromo(null);
    setPromoError(undefined);
    setSelectedTripId(tripId);
  }, []);

  const handlePreviousTripsPage = useCallback(() => {
    setTripPageIndex(currentPage => Math.max(currentPage - 1, 0));
  }, []);

  const handleNextTripsPage = useCallback(() => {
    const nextPageIndex = tripPageIndex + 1;
    if (nextPageIndex < loadedTripPageCount) {
      setTripPageIndex(nextPageIndex);
      return;
    }

    if (hasNextTripsPage && !isFetchingNextTripsPage) {
      fetchNextTripsPage()
        .then(result => {
          if (result.data?.pages[nextPageIndex]) {
            setTripPageIndex(nextPageIndex);
          }
        })
        .catch(() => undefined);
    }
  }, [
    fetchNextTripsPage,
    hasNextTripsPage,
    isFetchingNextTripsPage,
    loadedTripPageCount,
    tripPageIndex,
  ]);

  const handleChangeTerminals = useCallback(() => {
    setStep(1);
  }, []);

  const handleTryNextDate = useCallback(() => {
    setDepartureOffset(currentOffset =>
      Math.min(currentOffset + 1, MAX_DEPARTURE_OFFSET),
    );
  }, []);

  const handleDepartureOffsetSelect = useCallback((offset: number) => {
    setDepartureOffset(offset);
  }, []);

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
      if (!recipientName.trim() || !recipientPhone.trim()) {
        Alert.alert(
          t('app.name'),
          t('parcel.validation.recipientRequired'),
        );
        return false;
      }
      if (!isValidVietnamPhone(recipientPhone)) {
        Alert.alert(
          t('app.name'),
          t('parcel.validation.invalidVietnamPhone'),
        );
        return false;
      }
      if (recipientEmail.trim() && !isValidEmail(recipientEmail)) {
        Alert.alert(
          t('app.name'),
          t('parcel.validation.invalidRecipientEmail'),
        );
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
    if (step === 4 && !selectedTrip) {
      Alert.alert(
        t('app.name'),
        t('parcel.validation.selectAvailableTrip'),
      );
      return false;
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
    selectedTrip,
    step,
    t,
  ]);

  const buildCreatePayload = useCallback((
    photoUrl: string | null,
  ): CreateParcelPayload => {
    if (!selectedTrip) {
      throw new Error(t('parcel.validation.selectTripBeforeCreate'));
    }

    const descriptionParts = [
      estimatedValue
        ? t('parcel.form.estimatedValueMetadata', {
            value: estimatedValue,
          })
        : null,
    ].filter(Boolean);

    return buildCreateParcelPayload({
      tripId: selectedTrip.tripId,
      dropoffStopId: null,
      bookingId: null,
      itemName: packageCategory || null,
      description:
        descriptionParts.length > 0 ? descriptionParts.join('; ') : null,
      sizeCategory,
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
    });
  }, [
    backendPaymentMethod,
    dimensions.heightCm,
    dimensions.lengthCm,
    dimensions.widthCm,
    estimatedValue,
    estimatedWeightKg,
    packageCategory,
    recipientEmail,
    recipientName,
    recipientPhone,
    selectedTrip,
    selectedVoucher?.code,
    sizeCategory,
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
    if (!validateCurrentStep()) {
      return;
    }

    if (step < 4) {
      advanceStep();
      return;
    }

    if (checkoutInFlightRef.current) {
      return;
    }
    checkoutInFlightRef.current = true;

    try {
      let photoUrl: string | null = null;
      if (photos[0]) {
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

      let result;
      try {
        result = await createParcelMutation.mutateAsync(
          buildCreatePayload(photoUrl),
        );
      } catch (error) {
        const apiError = toApiError(error);
        if (apiError.code === 'SESSION_INVALIDATED') {
          return;
        }
        if (apiError.statusCode === 409) {
          setSelectedTripId(null);
          setPromoCode('');
          setAppliedPromo(null);
          setPromoError(undefined);
          await refetchAvailableTrips().catch(() => undefined);
          Alert.alert(
            t('parcel.errors.tripAvailabilityChangedTitle'),
            t('parcel.errors.tripAvailabilityChangedDescription'),
          );
          return;
        }
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

      let paymentRedirectUrl: string | null = null;
      if (result.status === 'PENDING_PAYMENT') {
        try {
          const paymentResult = await depositPaymentMutation.mutateAsync({
            parcelId: result.parcelId,
            paymentMethod: backendPaymentMethod,
          });
          paymentRedirectUrl = paymentResult.paymentRedirectUrl;
        } catch (error) {
          const apiError = toApiError(error);
          if (apiError.code === 'SESSION_INVALIDATED') {
            return;
          }

          invalidateParcelCheckoutQueries(paymentMethod === 'wallet');
          navigation.navigate('ParcelDetail', {
            parcelId: result.parcelId,
            preferredPaymentMethod: paymentMethod,
          });
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

      invalidateParcelCheckoutQueries(paymentMethod === 'wallet');
      navigation.navigate('ParcelDetail', {
        parcelId: result.parcelId,
        paymentRedirectUrl: paymentRedirectUrl ?? undefined,
        preferredPaymentMethod: paymentMethod,
      });

      if (paymentRedirectUrl) {
        try {
          await openPaymentRedirect(paymentRedirectUrl);
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
    backendPaymentMethod,
    buildCreatePayload,
    createParcelMutation,
    depositPaymentMutation,
    invalidateParcelCheckoutQueries,
    navigation,
    paymentMethod,
    photos,
    refetchAvailableTrips,
    resetParcelPhotoUpload,
    setPackage,
    step,
    t,
    uploadParcelPhoto,
    validateCurrentStep,
  ]);

  const handlePromoCodeChange = useCallback((text: string) => {
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
  }, []);

  const handlePromoApply = useCallback(
    (nextCode: string, selectedPromo?: PromoOffer) => {
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

      if (isPromoExpired(promo)) {
        setAppliedPromo(null);
        setPromoError(t('parcel.promos.validation.expired'));
        return false;
      }

      if (promo.minimumSpend && depositBeforeDiscount < promo.minimumSpend) {
        setAppliedPromo(null);
        setPromoError(
          t('parcel.promos.validation.minimumDeposit', {
            amount: formatVnd(promo.minimumSpend),
          }),
        );
        return false;
      }

      setAppliedPromo(promo);
      setPromoError(undefined);
      return true;
    },
    [availablePromos, depositBeforeDiscount, t],
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
  const stationStepLocation = step === 1 ? originLocation : destinationLocation;
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
                  location: stationStepLocation.name,
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
          const date = addLocalDays(departureDateBase, offset);
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
      ) : availableTripsQuery.isError ? (
        <ErrorView onRetry={handleRetryAvailableTrips} />
      ) : visibleTrips.length === 0 ? (
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
                addLocalDays(departureDateBase, departureOffset),
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
                hasNextTripsPage ? handleNextTripsPage : handleTryNextDate
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
        visibleTrips.map(trip => (
          <TripOptionCard
            key={trip.tripId}
            trip={trip}
            selected={selectedTripId === trip.tripId}
            onPress={handleSelectTrip}
          />
        ))
      )}
      {loadedTripPageCount > 1 || hasNextTripsPage ? (
        <View style={styles.tripPaginationRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canGoToPreviousTripPage }}
            disabled={!canGoToPreviousTripPage}
            onPress={handlePreviousTripsPage}
            style={({ pressed }) => [
              styles.tripPageButton,
              !canGoToPreviousTripPage ? styles.tripPageButtonDisabled : null,
              pressed && canGoToPreviousTripPage ? styles.pressed : null,
            ]}
          >
            <Text style={styles.tripPageButtonText}>
              {t('parcel.actions.previous')}
            </Text>
          </Pressable>
          <Text style={styles.tripPageIndicator}>
            {t('parcel.pagination.page', { page: tripPageIndex + 1 })}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: !canGoToNextTripPage || isFetchingNextTripsPage,
            }}
            disabled={!canGoToNextTripPage || isFetchingNextTripsPage}
            onPress={handleNextTripsPage}
            style={({ pressed }) => [
              styles.tripPageButton,
              !canGoToNextTripPage || isFetchingNextTripsPage
                ? styles.tripPageButtonDisabled
                : null,
              pressed && canGoToNextTripPage && !isFetchingNextTripsPage
                ? styles.pressed
                : null,
            ]}
          >
            {isFetchingNextTripsPage ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={styles.tripPageButtonText}>
                {t('parcel.actions.next')}
              </Text>
            )}
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

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>
              {t('parcel.form.recipientTitle')}
            </Text>
            <Input
              label={t('parcel.form.fullNameLabel')}
              placeholder={t('parcel.form.fullNamePlaceholder')}
              maxLength={255}
              value={recipientName}
              onChangeText={setRecipientName}
            />
            <Input
              label={t('parcel.form.phoneLabel')}
              placeholder={t('parcel.form.phonePlaceholder')}
              keyboardType="phone-pad"
              maxLength={20}
              value={recipientPhone}
              onChangeText={setRecipientPhone}
            />
            <Input
              label={t('parcel.form.emailLabel')}
              placeholder={t('parcel.form.emailPlaceholder')}
              keyboardType="email-address"
              maxLength={255}
              value={recipientEmail}
              onChangeText={setRecipientEmail}
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
          estimatedPrice={estimatedPrice}
          depositBeforeDiscount={depositBeforeDiscount}
          promoDiscount={promoDiscount}
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
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          walletBalance={walletBalanceQuery.data?.balance}
          walletIsLoading={walletBalanceQuery.isLoading}
          walletHasError={walletBalanceQuery.isError}
        />
      </View>
    );
  };

  const isSubmitting =
    isUploadingParcelPhoto
    || createParcelMutation.isPending
    || depositPaymentMutation.isPending;
  const actionDisabled =
    isSubmitting ||
    (isStationSelectionStep && !selectedStationForStep) ||
    ((step === 3 || step === 4) && !packageMeasurementsValid) ||
    (step === 4 && (availableTripsQuery.isLoading || !selectedTrip));
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
          onStepPress={setStep}
          onCancel={handleBackStep}
          title={routeTitle}
          subtitle={headerSubtitle}
        />
        <StepHeaderWithMascot step={step} />

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
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={scrollContentStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderStep()}
          </ScrollView>
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
  tripPaginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  tripPageButton: {
    minWidth: 88,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  tripPageButtonDisabled: {
    opacity: 0.45,
  },
  tripPageButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  tripPageIndicator: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
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
