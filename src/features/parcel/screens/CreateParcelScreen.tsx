import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useQueryClient } from '@tanstack/react-query';

import { Input } from '@shared/components';
import { getApiErrorMessage } from '@shared/api/errors';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { useLocations } from '@features/location/hooks/useLocations';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import type { ParcelStackParamList } from '@app/navigation/types';
import type { PromoOffer } from '@shared/utils/promo';
import {
  calculatePromoDiscount,
  findPromoByCode,
  formatCurrency,
  isPromoExpired,
  normalizePromoCode,
} from '@shared/utils/promo';
import { findLocationByName } from '../../booking/utils/searchParams';
import { useParcelStore } from '../store/useParcelStore';
import {
  mapParcelVoucherToPromo,
  parcelKeys,
} from '../api/parcelApi';
import {
  useAvailableParcelTrips,
  useAvailableParcelVouchers,
  useCreateParcel,
} from '../hooks/useParcelQueries';
import { useParcelStations } from '../hooks/useParcelStations';
import type {
  AvailableParcelTrip,
  CreateParcelPayload,
  ParcelBackendPaymentMethod,
  ParcelPaymentMethod,
  ParcelSize,
  ParcelSizeCategory,
  Station,
} from '../types';
import {
  StationCard,
  ParcelSkeleton,
  ErrorView,
  StepProgressBar,
  StepHeaderWithMascot,
  PackageSizeSelector,
  WeightSlider,
  CategoryChips,
  PhotoUploadSection,
  PhotoChoiceSheet,
  CameraViewfinder,
  PricingBreakdown,
} from '../components';

type CreateParcelNavProp = NativeStackNavigationProp<ParcelStackParamList, 'CreateParcel'>;

const MOCK_GALLERY_PHOTOS = [
  'https://picsum.photos/id/10/400/300',
  'https://picsum.photos/id/11/400/300',
  'https://picsum.photos/id/20/400/300',
  'https://picsum.photos/id/24/400/300',
  'https://picsum.photos/id/26/400/300',
  'https://picsum.photos/id/48/400/300',
];

const PACKAGE_DIMENSIONS: Record<ParcelSize, {
  sizeCategory: ParcelSizeCategory;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}> = {
  small: { sizeCategory: 'SMALL', lengthCm: 25, widthCm: 20, heightCm: 10 },
  medium: { sizeCategory: 'MEDIUM', lengthCm: 45, widthCm: 35, heightCm: 25 },
  large: { sizeCategory: 'LARGE', lengthCm: 60, widthCm: 45, heightCm: 35 },
};

const DATE_OFFSETS = [0, 1, 2] as const;

const toLocalDateString = (offsetDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatTripTime = (dateLike: string): string => {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return dateLike;
  }

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toBackendPaymentMethod = (method: ParcelPaymentMethod): ParcelBackendPaymentMethod =>
  method === 'wallet' ? 'WALLET' : 'VNPAY';

const weightToKg = (weight: number, unit: 'kg' | 'lbs'): number => {
  const kg = unit === 'kg' ? weight : weight / 2.20462;
  return Math.max(0.1, Number(kg.toFixed(1)));
};

function TripOptionCard({
  trip,
  selected,
  onPress,
}: {
  trip: AvailableParcelTrip;
  selected: boolean;
  onPress: (tripId: string) => void;
}): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(trip.tripId)}
      style={({ pressed }) => [
        styles.tripCard,
        selected ? styles.tripCardActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.tripIcon}>
        <Truck size={20} color={selected ? theme.colors.textInverse : theme.colors.primary} weight="fill" />
      </View>
      <View style={styles.tripMeta}>
        <Text style={styles.tripOperator} numberOfLines={1}>
          {trip.operatorName || 'VietRide Operator'}
        </Text>
        <Text style={styles.tripTime}>
          {formatTripTime(trip.departureDateTime)}
        </Text>
        <Text style={styles.tripPrice}>
          Deposit {formatCurrency(trip.estimatedDepositVnd)} / Est. {formatCurrency(trip.estimatedPriceVnd)}
        </Text>
      </View>
      {selected ? <CheckCircle size={22} color={theme.colors.success} weight="fill" /> : null}
    </Pressable>
  );
}

export function CreateParcelScreen(): React.JSX.Element {
  const navigation = useNavigation<CreateParcelNavProp>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const {
    fromCity,
    toCity,
    fromLocationCode,
    toLocationCode,
    setReceivingStation: storeReceivingStation,
    setDropoffStation: storeDropoffStation,
  } = useParcelStore();
  const { data: locations = [] } = useLocations();

  const [step, setStep] = useState(1);
  const [highestStepReached, setHighestStepReached] = useState(1);
  const [receivingStation, setReceivingStation] = useState<Station | undefined>(undefined);
  const [dropoffStation, setDropoffStation] = useState<Station | undefined>(undefined);
  const [packageSize, setPackageSize] = useState<ParcelSize>('medium');
  const [packageWeight, setPackageWeight] = useState(2.5);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [packageCategory, setPackageCategory] = useState('Documents');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [recipientName, setRecipientName] = useState(user?.fullName ?? '');
  const [recipientPhone, setRecipientPhone] = useState(user?.phone ?? '');
  const [recipientEmail, setRecipientEmail] = useState(user?.email ?? '');
  const [photos, setPhotos] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<ParcelPaymentMethod>('wallet');
  const [departureOffset, setDepartureOffset] = useState<(typeof DATE_OFFSETS)[number]>(0);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoOffer | null>(null);
  const [promoError, setPromoError] = useState<string | undefined>(undefined);

  const [choiceSheetVisible, setChoiceSheetVisible] = useState(false);
  const [cameraViewVisible, setCameraViewVisible] = useState(false);
  const [galleryViewVisible, setGalleryViewVisible] = useState(false);
  const [selectedGalleryPhotos, setSelectedGalleryPhotos] = useState<number[]>([]);
  const [flashActive, setFlashActive] = useState(false);

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
  }, [recipientEmail, recipientName, recipientPhone, user?.email, user?.fullName, user?.phone]);

  const originLocation = useMemo(() => {
    return locations.find((location) => location.code === fromLocationCode)
      ?? findLocationByName(locations, fromCity)
      ?? null;
  }, [fromCity, fromLocationCode, locations]);

  const destinationLocation = useMemo(() => {
    return locations.find((location) => location.code === toLocationCode)
      ?? findLocationByName(locations, toCity)
      ?? null;
  }, [locations, toCity, toLocationCode]);

  const originStationsQuery = useParcelStations(originLocation);
  const destinationStationsQuery = useParcelStations(destinationLocation);
  const dimensions = PACKAGE_DIMENSIONS[packageSize];
  const estimatedWeightKg = weightToKg(packageWeight, weightUnit);
  const departureDate = toLocalDateString(departureOffset);
  const backendPaymentMethod = toBackendPaymentMethod(paymentMethod);

  const availableTripParams = useMemo(() => {
    if (!receivingStation || !dropoffStation) {
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
      sizeCategory: dimensions.sizeCategory,
      page: 1,
      pageSize: 10,
    };
  }, [
    departureDate,
    dimensions.heightCm,
    dimensions.lengthCm,
    dimensions.sizeCategory,
    dimensions.widthCm,
    dropoffStation,
    estimatedWeightKg,
    receivingStation,
  ]);

  const availableTripsQuery = useAvailableParcelTrips(availableTripParams, step === 4);
  const availableTrips = availableTripsQuery.data?.items ?? [];
  const selectedTrip = useMemo(
    () => availableTrips.find((trip) => trip.tripId === selectedTripId) ?? null,
    [availableTrips, selectedTripId],
  );

  useEffect(() => {
    if (availableTrips.length === 0) {
      setSelectedTripId(null);
      return;
    }

    if (!selectedTripId || !availableTrips.some((trip) => trip.tripId === selectedTripId)) {
      setSelectedTripId(availableTrips[0].tripId);
    }
  }, [availableTrips, selectedTripId]);

  const voucherParams = useMemo(() => {
    if (!selectedTrip) {
      return null;
    }

    return {
      tripId: selectedTrip.tripId,
      sizeCategory: dimensions.sizeCategory,
      paymentMethod: backendPaymentMethod,
      orderAmount: selectedTrip.estimatedDepositVnd,
    };
  }, [backendPaymentMethod, dimensions.sizeCategory, selectedTrip]);

  const vouchersQuery = useAvailableParcelVouchers(voucherParams, step === 4);
  const availablePromos = useMemo(
    () => (vouchersQuery.data ?? []).map(mapParcelVoucherToPromo),
    [vouchersQuery.data],
  );

  const selectedVoucher = useMemo(() => {
    const code = appliedPromo?.code ? normalizePromoCode(appliedPromo.code) : '';
    if (!code) {
      return null;
    }

    return (vouchersQuery.data ?? []).find(
      (voucher) => normalizePromoCode(voucher.code) === code,
    ) ?? null;
  }, [appliedPromo?.code, vouchersQuery.data]);

  const baseFare = selectedTrip?.estimatedDepositVnd ?? 0;
  const weightSurcharge = 0;
  const promoDiscount = selectedVoucher
    ? selectedVoucher.discountAmount
    : appliedPromo
      ? calculatePromoDiscount(appliedPromo, baseFare)
      : 0;
  const totalPrice = Math.max(baseFare - promoDiscount, 0);

  const createParcelMutation = useCreateParcel();

  const handleBackStep = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
      return true;
    }

    navigation.goBack();
    return true;
  }, [navigation, step]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackStep);
    return () => subscription.remove();
  }, [handleBackStep]);

  const advanceStep = useCallback(() => {
    setStep((currentStep) => {
      const nextStep = Math.min(currentStep + 1, 4);
      setHighestStepReached((highest) => Math.max(highest, nextStep));
      return nextStep;
    });
  }, []);

  const handleSelectReceivingStation = useCallback((station: Station) => {
    setReceivingStation(station);
    storeReceivingStation(station);
    if (dropoffStation?.id === station.id) {
      setDropoffStation(undefined);
    }
  }, [dropoffStation?.id, storeReceivingStation]);

  const handleSelectDropoffStation = useCallback((station: Station) => {
    setDropoffStation(station);
    storeDropoffStation(station);
  }, [storeDropoffStation]);

  const validateCurrentStep = useCallback(() => {
    if (step === 1 && !receivingStation) {
      Alert.alert('VietRide', 'Please select an origin station.');
      return false;
    }
    if (step === 2 && !dropoffStation) {
      Alert.alert('VietRide', 'Please select a destination station.');
      return false;
    }
    if (step === 3) {
      if (!recipientName.trim() || !recipientPhone.trim()) {
        Alert.alert('VietRide', 'Recipient name and phone number are required.');
        return false;
      }
      if (estimatedWeightKg <= 0) {
        Alert.alert('VietRide', 'Package weight must be greater than 0.');
        return false;
      }
    }
    if (step === 4 && !selectedTrip) {
      Alert.alert('VietRide', 'Please select an available trip for this parcel.');
      return false;
    }

    return true;
  }, [dropoffStation, estimatedWeightKg, receivingStation, recipientName, recipientPhone, selectedTrip, step]);

  const buildCreatePayload = useCallback((): CreateParcelPayload => {
    if (!selectedTrip) {
      throw new Error('Please select a trip before creating parcel.');
    }

    const descriptionParts = [
      `Category: ${packageCategory}`,
      estimatedValue ? `Estimated value: ${estimatedValue} VND` : null,
    ].filter(Boolean);

    return {
      tripId: selectedTrip.tripId,
      dropoffStopId: null,
      bookingId: null,
      itemName: packageCategory || null,
      description: descriptionParts.length > 0 ? descriptionParts.join('; ') : null,
      sizeCategory: dimensions.sizeCategory,
      lengthCm: dimensions.lengthCm,
      widthCm: dimensions.widthCm,
      heightCm: dimensions.heightCm,
      estimatedWeightKg,
      photoUrl: photos[0] ?? null,
      recipient: {
        fullName: recipientName.trim(),
        phoneNumber: recipientPhone.trim(),
        email: recipientEmail.trim() || null,
      },
      deliveryMethod: 'TERMINAL_PICKUP',
      paymentMethod: backendPaymentMethod,
      voucherCode: appliedPromo?.code ?? null,
    };
  }, [
    appliedPromo?.code,
    backendPaymentMethod,
    dimensions.heightCm,
    dimensions.lengthCm,
    dimensions.sizeCategory,
    dimensions.widthCm,
    estimatedValue,
    estimatedWeightKg,
    packageCategory,
    photos,
    recipientEmail,
    recipientName,
    recipientPhone,
    selectedTrip,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (step < 4) {
      advanceStep();
      return;
    }

    try {
      const result = await createParcelMutation.mutateAsync(buildCreatePayload());
      await queryClient.invalidateQueries({ queryKey: parcelKeys.all });

      if (result.paymentRedirectUrl) {
        Linking.openURL(result.paymentRedirectUrl).catch((error) => {
          console.warn('[Parcel] Could not open payment redirect:', error);
        });
      }

      navigation.navigate('ParcelDetail', { parcelId: result.parcelId });
    } catch (error) {
      Alert.alert('VietRide', getApiErrorMessage(error));
    }
  }, [
    advanceStep,
    buildCreatePayload,
    createParcelMutation,
    navigation,
    queryClient,
    step,
    validateCurrentStep,
  ]);

  const handleAddPhoto = useCallback(() => setChoiceSheetVisible(true), []);
  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((current) => current.filter((_, i) => i !== index));
  }, []);
  const handleChooseGalleryPhoto = useCallback((index: number) => {
    setSelectedGalleryPhotos((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }, []);
  const handleImportGalleryPhotos = useCallback(() => {
    const newPhotos = selectedGalleryPhotos.map((idx) => MOCK_GALLERY_PHOTOS[idx]);
    setPhotos((current) => [...current, ...newPhotos]);
    setSelectedGalleryPhotos([]);
    setGalleryViewVisible(false);
  }, [selectedGalleryPhotos]);
  const handleSnapPhoto = useCallback(() => {
    setFlashActive(true);
    setTimeout(() => {
      setFlashActive(false);
      setPhotos((current) => [...current, 'https://picsum.photos/id/60/400/300']);
      setCameraViewVisible(false);
    }, 300);
  }, []);

  const handlePromoCodeChange = useCallback((text: string) => {
    const normalizedCode = text.toUpperCase();
    setPromoCode(normalizedCode);
    setPromoError(undefined);
    setAppliedPromo((currentPromo) => {
      if (!currentPromo) {
        return null;
      }

      return normalizePromoCode(normalizedCode) === normalizePromoCode(currentPromo.code)
        ? currentPromo
        : null;
    });
  }, []);

  const handlePromoApply = useCallback((nextCode: string, selectedPromo?: PromoOffer) => {
    const normalizedCode = normalizePromoCode(nextCode);
    const promo = selectedPromo || findPromoByCode(availablePromos, normalizedCode);

    setPromoCode(normalizedCode);

    if (!normalizedCode) {
      setAppliedPromo(null);
      setPromoError('Enter a promo code to apply.');
      return false;
    }

    if (!promo) {
      setAppliedPromo(null);
      setPromoError('This promo code is not available for this parcel.');
      return false;
    }

    if (isPromoExpired(promo)) {
      setAppliedPromo(null);
      setPromoError('This promo code has expired.');
      return false;
    }

    if (promo.minimumSpend && baseFare < promo.minimumSpend) {
      setAppliedPromo(null);
      setPromoError(`Minimum parcel deposit is ${formatCurrency(promo.minimumSpend)}.`);
      return false;
    }

    setAppliedPromo(promo);
    setPromoError(undefined);
    return true;
  }, [availablePromos, baseFare]);

  const stationStepQuery = step === 1 ? originStationsQuery : destinationStationsQuery;
  const stationStepStations = step === 1
    ? originStationsQuery.stations
    : destinationStationsQuery.stations.filter((station) => station.id !== receivingStation?.id);
  const missingLocation = step === 1 ? !originLocation : !destinationLocation;

  const renderStationStep = () => {
    if (missingLocation) {
      return (
        <View style={styles.stateBox}>
          <WarningCircle size={32} color={theme.colors.warning} weight="duotone" />
          <Text style={styles.stateTitle}>Choose route first</Text>
          <Text style={styles.stateText}>
            Go back to Home and select origin and destination before creating a parcel.
          </Text>
        </View>
      );
    }

    if (stationStepQuery.isLoading) {
      return (
        <View style={{ padding: spacing.xl }}>
          <ParcelSkeleton type="station" count={3} />
        </View>
      );
    }

    if (stationStepQuery.isError) {
      return <ErrorView onRetry={() => stationStepQuery.refetch()} />;
    }

    if (stationStepStations.length === 0) {
      return (
        <View style={styles.stateBox}>
          <WarningCircle size={32} color={theme.colors.warning} weight="duotone" />
          <Text style={styles.stateTitle}>No parcel station found</Text>
          <Text style={styles.stateText}>
            Try another province or city for this route.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.stepContent}>
        {stationStepStations.map((station) => (
          <StationCard
            key={station.id}
            station={station}
            isSelected={
              step === 1
                ? receivingStation?.id === station.id
                : dropoffStation?.id === station.id
            }
            onSelect={step === 1 ? handleSelectReceivingStation : handleSelectDropoffStation}
          />
        ))}
      </View>
    );
  };

  const renderTripPicker = () => (
    <View style={styles.bentoSummaryCard}>
      <Text style={styles.bentoCardHeading}>Departure Date</Text>
      <View style={styles.dateRow}>
        {DATE_OFFSETS.map((offset) => {
          const active = departureOffset === offset;
          const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : toLocalDateString(offset);
          return (
            <Pressable
              key={offset}
              onPress={() => setDepartureOffset(offset)}
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
              <Text style={[styles.dateChipText, active ? styles.dateChipTextActive : null]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tripHeaderRow}>
        <Text style={styles.bentoCardHeading}>Available Trips</Text>
        {availableTripsQuery.isFetching ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : null}
      </View>

      {availableTripsQuery.isLoading ? (
        <ParcelSkeleton type="summary" count={2} />
      ) : availableTripsQuery.isError ? (
        <ErrorView onRetry={() => availableTripsQuery.refetch()} />
      ) : availableTrips.length === 0 ? (
        <View style={styles.stateBoxCompact}>
          <Clock size={24} color={theme.colors.textTertiary} weight="duotone" />
          <Text style={styles.stateText}>No trip can carry this parcel on the selected date.</Text>
        </View>
      ) : (
        availableTrips.map((trip) => (
          <TripOptionCard
            key={trip.tripId}
            trip={trip}
            selected={selectedTripId === trip.tripId}
            onPress={setSelectedTripId}
          />
        ))
      )}
    </View>
  );

  const renderStep = () => {
    if (step === 1 || step === 2) {
      return renderStationStep();
    }

    if (step === 3) {
      return (
        <View style={styles.stepContent}>
          <PackageSizeSelector packageSize={packageSize} onSelect={setPackageSize} />
          <WeightSlider
            value={packageWeight}
            unit={weightUnit}
            onValueChange={setPackageWeight}
            onUnitChange={setWeightUnit}
          />
          <CategoryChips value={packageCategory} onChange={setPackageCategory} />

          <Input
            label="Estimated Value (Optional)"
            placeholder="Enter package value (VND)"
            keyboardType="numeric"
            value={estimatedValue}
            onChangeText={setEstimatedValue}
            hint="Used only as parcel description metadata."
          />

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>Recipient</Text>
            <Input
              label="Full Name"
              placeholder="Recipient full name"
              value={recipientName}
              onChangeText={setRecipientName}
            />
            <Input
              label="Phone Number"
              placeholder="Recipient phone number"
              keyboardType="phone-pad"
              value={recipientPhone}
              onChangeText={setRecipientPhone}
            />
            <Input
              label="Email (Optional)"
              placeholder="recipient@example.com"
              keyboardType="email-address"
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              autoCapitalize="none"
            />
          </View>

          <PhotoUploadSection
            photos={photos}
            onAdd={handleAddPhoto}
            onRemove={handleRemovePhoto}
          />
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
          packageWeight={estimatedWeightKg}
          weightUnit="kg"
          codEnabled={false}
          codAmount=""
          baseFare={baseFare}
          weightSurcharge={weightSurcharge}
          promoDiscount={promoDiscount}
          totalPrice={totalPrice}
          promoCode={promoCode}
          promoApplied={Boolean(appliedPromo)}
          onPromoCodeChange={handlePromoCodeChange}
          onPromoApplyCode={handlePromoApply}
          availablePromos={availablePromos}
          selectedPromoCode={appliedPromo?.code}
          appliedPromoLabel={appliedPromo ? `${appliedPromo.code} Applied` : undefined}
          promoError={promoError}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
        />
      </View>
    );
  };

  const isSubmitting = createParcelMutation.isPending;
  const actionDisabled = isSubmitting || (step === 4 && availableTripsQuery.isLoading);

  return (
    <View style={styles.root}>
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="460" width="100%">
          <Defs>
            <LinearGradient id="headerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.primaryLight} stopOpacity={0.36} />
              <Stop offset="55%" stopColor={theme.colors.primaryLight} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
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
        />
        <StepHeaderWithMascot step={step} />

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 96 + Math.max(insets.bottom, spacing.md) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>

        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {step === 4 ? (
            <View style={styles.priceSummaryBox}>
              <Text style={styles.totalPriceLabel}>Deposit Due</Text>
              <Text style={styles.totalPriceValue}>{formatCurrency(totalPrice)}</Text>
            </View>
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
                  {step === 4 ? 'Confirm & Pay' : 'Next Step'}
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

        <PhotoChoiceSheet
          visible={choiceSheetVisible}
          onClose={() => setChoiceSheetVisible(false)}
          onCamera={() => setCameraViewVisible(true)}
          onGallery={() => setGalleryViewVisible(true)}
        />

        <CameraViewfinder
          visible={cameraViewVisible}
          onClose={() => setCameraViewVisible(false)}
          flashActive={flashActive}
          onToggleFlash={() => setFlashActive((prev) => !prev)}
          onSnap={handleSnapPhoto}
          lastPhotoUri={photos[photos.length - 1]}
        />

        {galleryViewVisible ? (
          <View style={styles.galleryModalRoot}>
            <View style={styles.galleryContainer}>
              <View style={styles.galleryHeader}>
                <Pressable
                  style={styles.galleryCloseBtn}
                  onPress={() => {
                    setSelectedGalleryPhotos([]);
                    setGalleryViewVisible(false);
                  }}
                >
                  <ArrowLeft size={22} color={theme.colors.textPrimary} />
                </Pressable>
                <View style={styles.galleryTitleContainer}>
                  <Text style={styles.galleryTitle}>All Photos</Text>
                  <Text style={styles.gallerySubtitle}>Select package photos to import</Text>
                </View>
                {selectedGalleryPhotos.length > 0 ? (
                  <Text style={styles.gallerySelectionCount}>
                    {selectedGalleryPhotos.length} selected
                  </Text>
                ) : (
                  <View style={styles.headerSpacer} />
                )}
              </View>
              <ScrollView
                contentContainerStyle={styles.galleryScroll}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.galleryGrid}>
                  {MOCK_GALLERY_PHOTOS.map((uri, index) => {
                    const isSelected = selectedGalleryPhotos.includes(index);
                    const selectionIndex = selectedGalleryPhotos.indexOf(index);
                    return (
                      <Pressable
                        key={`gallery-item-${index}`}
                        style={[styles.galleryGridItem, isSelected ? styles.galleryGridItemActive : null]}
                        onPress={() => handleChooseGalleryPhoto(index)}
                      >
                        <Image source={{ uri }} style={styles.galleryImage} />
                        {isSelected ? (
                          <View style={styles.galleryCheckboxActive}>
                            <Text style={styles.galleryCheckboxText}>{selectionIndex + 1}</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={styles.galleryBottomBar}>
                <Pressable
                  style={[
                    styles.galleryImportBtn,
                    selectedGalleryPhotos.length === 0 ? styles.galleryImportBtnDisabled : null,
                  ]}
                  disabled={selectedGalleryPhotos.length === 0}
                  onPress={handleImportGalleryPhotos}
                >
                  <Text style={styles.galleryImportBtnText}>
                    {selectedGalleryPhotos.length > 0
                      ? `Import Selected (${selectedGalleryPhotos.length})`
                      : 'Select Photos to Import'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  gradientContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 460, zIndex: 0 },
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingTop: 0 },
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
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
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
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
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
  tripMeta: {
    flex: 1,
    minWidth: 0,
  },
  tripOperator: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
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
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
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
  nextActionButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
  galleryModalRoot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.surface,
    zIndex: 100,
  },
  galleryContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    gap: spacing.md,
  },
  galleryCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryTitleContainer: { flex: 1 },
  galleryTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  gallerySubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  gallerySelectionCount: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  headerSpacer: { width: 80 },
  galleryScroll: { padding: spacing.md },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  galleryGridItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  galleryGridItemActive: {
    borderColor: theme.colors.primary,
  },
  galleryImage: { width: '100%', height: '100%' },
  galleryCheckboxActive: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryCheckboxText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: theme.colors.textInverse,
  },
  galleryBottomBar: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  galleryImportBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryImportBtnDisabled: {
    backgroundColor: theme.colors.divider,
  },
  galleryImportBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
