/** CreateTicketBookingScreen — Single screen for the entire ticket booking flow
 *
 * Matches Parcel flow architecture: single screen, local step state,
 * centralized header and progress bar.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Pressable,
  StatusBar,
  BackHandler,
  Text,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft, Check, FunnelSimple, X } from 'phosphor-react-native';
import { useShallow } from 'zustand/react/shallow';
import { borderRadius, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { motionTokens, useMotion } from '@shared/motion';
import {
  openPaymentRedirect,
} from '@shared/utils/paymentRedirect';

import { useBookingStore } from '../store/useBookingStore';
import { BookingProgressBar } from '../components/BookingProgressBar';
import type { BookingStackParamList } from '@app/navigation/types';
import type { TripFilterState, TripPriceRange, TripTimeSlot } from '../types';
import {
  createBookingEntryKey,
  initializeBookingEntry,
} from '../utils/bookingDiscovery';
import { BookingCompletionCoordinator } from '../utils/bookingCompletion';
import { getRoundTripLegForStep } from '../utils/bookingSteps';

// Import Steps
import { TripResultsScreen as TripResultsStep } from './TripResultsScreen';
import { SeatSelectionScreen as SeatSelectionStep } from './SeatSelectionScreen';
import { PickUpScreen as PickUpStep } from './PickUpScreen';
import { DropOffScreen as DropOffStep } from './DropOffScreen';
import { CheckoutScreen as CheckoutStep } from './CheckoutScreen';
import { PaymentScreen as PaymentStep } from './PaymentScreen';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'CreateTicketBooking'>;
type CreateBookingRouteProp = RouteProp<BookingStackParamList, 'CreateTicketBooking'>;

type RouteHeaderSnapshot = {
  primary: string;
  secondary?: string;
};

type FilterChipProps = {
  label: string;
  helper?: string;
  selected: boolean;
  onPress: () => void;
};

type TripFilterSheetProps = {
  visible: boolean;
  filters: TripFilterState;
  operatorOptions: string[];
  onApply: (filters: TripFilterState) => void;
  onClose: () => void;
  onReset: () => void;
};

const DEFAULT_TRIP_FILTERS: TripFilterState = {
  operatorBadge: 'all',
  timeSlot: 'all',
  priceRange: 'all',
};

const timeSlotOptions: Array<{ labelKey: string; value: TripTimeSlot; helper?: string }> = [
  { labelKey: 'booking.filters.time.any', value: 'all' },
  { labelKey: 'booking.filters.time.morning', value: 'morning', helper: '05:00 - 11:59' },
  { labelKey: 'booking.filters.time.afternoon', value: 'afternoon', helper: '12:00 - 16:59' },
  { labelKey: 'booking.filters.time.evening', value: 'evening', helper: '17:00 - 21:59' },
  { labelKey: 'booking.filters.time.night', value: 'night', helper: '22:00 - 04:59' },
];

const priceRangeOptions: Array<{ labelKey: string; value: TripPriceRange; helper?: string }> = [
  { labelKey: 'booking.filters.price.any', value: 'all' },
  { labelKey: 'booking.filters.price.under350k', value: 'under_350k' },
  { labelKey: 'booking.filters.price.from350To450k', value: '350k_450k' },
  { labelKey: 'booking.filters.price.over450k', value: 'over_450k' },
];

const countActiveTripFilters = (filters: TripFilterState): number => {
  return [
    filters.operatorBadge !== DEFAULT_TRIP_FILTERS.operatorBadge,
    filters.timeSlot !== DEFAULT_TRIP_FILTERS.timeSlot,
    filters.priceRange !== DEFAULT_TRIP_FILTERS.priceRange,
  ].filter(Boolean).length;
};

const makeRouteLabel = (
  from: string,
  to: string,
): string => `${from} → ${to}`;

const makeRoundTripRouteLabel = (
  from: string,
  to: string,
): string => `${from} ⇄ ${to}`;

const makeHeaderContextLabel = (
  label: string,
  dateLabel: string,
  dateFallback: string,
  departureTime?: string,
): string => {
  return [label, dateLabel || dateFallback, departureTime].filter(Boolean).join(' • ');
};

const makeTravelDateRangeLabel = (
  outboundDate: string,
  returnDate?: string,
  departureFallback = '',
  returnFallback = '',
): string => {
  return `${outboundDate || departureFallback} ↔ ${returnDate || returnFallback}`;
};

function FilterChip({
  label,
  helper,
  selected,
  onPress,
}: FilterChipProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        selected ? styles.filterChipActive : null,
        pressed ? styles.filterChipPressed : null,
      ]}
    >
      <View style={styles.filterChipTextBlock}>
        <Text style={[styles.filterChipLabel, selected ? styles.filterChipLabelActive : null]} numberOfLines={1}>
          {label}
        </Text>
        {helper ? (
          <Text style={styles.filterChipHelper} numberOfLines={1}>
            {helper}
          </Text>
        ) : null}
      </View>
      {selected ? <Check size={14} weight="bold" color={theme.colors.primary} /> : null}
    </Pressable>
  );
}

function TripFilterSheet({
  visible,
  filters,
  operatorOptions,
  onApply,
  onClose,
  onReset,
}: TripFilterSheetProps): React.JSX.Element {
  const { t } = useTranslation();
  const { reduceMotion } = useMotion();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [draftFilters, setDraftFilters] = useState<TripFilterState>(filters);

  useEffect(() => {
    if (visible) {
      setDraftFilters(filters);
    }
  }, [filters, visible]);

  const hasActiveDraftFilters = countActiveTripFilters(draftFilters) > 0;

  const handleApply = useCallback(() => {
    onApply(draftFilters);
    onClose();
  }, [draftFilters, onApply, onClose]);

  const handleReset = useCallback(() => {
    setDraftFilters(DEFAULT_TRIP_FILTERS);
    onReset();
    onClose();
  }, [onClose, onReset]);

  const setOperator = useCallback((operatorBadge: string | 'all') => {
    setDraftFilters((current) => ({ ...current, operatorBadge }));
  }, []);

  const setTimeSlot = useCallback((timeSlot: TripTimeSlot) => {
    setDraftFilters((current) => ({ ...current, timeSlot }));
  }, []);

  const setPriceRange = useCallback((priceRange: TripPriceRange) => {
    setDraftFilters((current) => ({ ...current, priceRange }));
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.filterModalRoot}>
        <Pressable style={styles.filterBackdrop} onPress={onClose} />
        <View style={styles.filterSheet}>
          <View style={styles.filterSheetHandle} />

          <View style={styles.filterHeaderRow}>
            <View>
              <Text style={styles.filterTitle}>{t('booking.filters.title')}</Text>
              <Text style={styles.filterSubtitle}>
                {t('booking.filters.subtitle')}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('booking.filters.closeAccessibility')}
              onPress={onClose}
              style={({ pressed }) => [styles.filterCloseButton, pressed ? styles.headerButtonPressed : null]}
            >
              <X size={18} weight="bold" color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            <Text style={styles.filterSectionLabel}>{t('booking.filters.operator')}</Text>
            <View style={styles.filterChipGrid}>
              <FilterChip
                label={t('booking.filters.allOperators')}
                selected={draftFilters.operatorBadge === 'all'}
                onPress={() => setOperator('all')}
              />
              {operatorOptions.map((operator) => (
                <FilterChip
                  key={operator}
                  label={operator}
                  selected={draftFilters.operatorBadge === operator}
                  onPress={() => setOperator(operator)}
                />
              ))}
            </View>

            <Text style={styles.filterSectionLabel}>{t('booking.filters.departureTime')}</Text>
            <View style={styles.filterChipGrid}>
              {timeSlotOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={t(option.labelKey)}
                  helper={option.helper}
                  selected={draftFilters.timeSlot === option.value}
                  onPress={() => setTimeSlot(option.value)}
                />
              ))}
            </View>

            <View style={styles.filterSectionHeadingRow}>
              <Text style={styles.filterSectionLabel}>{t('booking.filters.vehicleType')}</Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>{t('booking.filters.comingSoon')}</Text>
              </View>
            </View>
            <View
              accessible
              accessibilityLabel={t('booking.filters.vehicleComingSoonAccessibility')}
              accessibilityState={{ disabled: true }}
              style={styles.disabledFilterShell}
            >
              <Text style={styles.disabledFilterTitle}>{t('booking.filters.vehicleDisabledTitle')}</Text>
              <Text style={styles.disabledFilterCopy}>
                {t('booking.filters.vehicleDisabledDescription')}
              </Text>
            </View>

            <Text style={styles.filterSectionLabel}>{t('booking.filters.fare')}</Text>
            <View style={styles.filterChipGrid}>
              {priceRangeOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={t(option.labelKey)}
                  helper={option.helper}
                  selected={draftFilters.priceRange === option.value}
                  onPress={() => setPriceRange(option.value)}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <Pressable
              accessibilityRole="button"
              onPress={handleReset}
              style={({ pressed }) => [styles.filterResetButton, pressed ? styles.filterActionPressed : null]}
            >
              <Text style={styles.filterResetText}>{t('booking.filters.reset')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleApply}
              style={({ pressed }) => [styles.filterApplyButton, pressed ? styles.filterActionPressed : null]}
            >
              <Text style={styles.filterApplyText}>
                {hasActiveDraftFilters
                  ? t('booking.filters.applyFilters')
                  : t('booking.filters.apply')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AnimatedRouteHeader({
  primary,
  secondary,
}: RouteHeaderSnapshot): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const { reduceMotion } = useMotion();
  const progress = useSharedValue(1);
  const [visibleSecondary, setVisibleSecondary] = useState<string | undefined>(secondary);

  useEffect(() => {
    setVisibleSecondary(secondary);
    if (reduceMotion) {
      progress.value = 1;
      return;
    }

    progress.value = 0;
    progress.value = withTiming(1, {
      duration: motionTokens.duration.emphasis,
      easing: Easing.out(Easing.quad),
    });
  }, [progress, reduceMotion, secondary]);

  const incomingStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{
      translateY: (1 - progress.value) * motionTokens.distance.standard,
    }],
  }));

  return (
    <View style={styles.routeHeaderShell}>
      <Text
        style={styles.routePrimary}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={0.82}
      >
        {primary}
      </Text>
      <View style={styles.routeSecondaryShell}>
        <Animated.View style={[styles.routeHeaderLayer, incomingStyle]}>
          {visibleSecondary ? (
            <Text
              style={styles.routeSecondary}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.86}
            >
              {visibleSecondary}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

export function CreateTicketBookingScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<CreateBookingRouteProp>();
  const [step, setStep] = useState(1);
  const [tripFilters, setTripFilters] = useState<TripFilterState>(DEFAULT_TRIP_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);
  const [initializedEntryKey, setInitializedEntryKey] = useState<string | null>(null);
  const bookingCompletionRef = useRef<BookingCompletionCoordinator | null>(null);
  if (!bookingCompletionRef.current) {
    bookingCompletionRef.current = new BookingCompletionCoordinator();
  }
  const {
    highestStepReached,
    bookingStatus,
    searchParams,
    currentLeg,
    trips,
    selectedTrip,
    outboundState,
    returnState,
    resetFlowPreservingSearch,
    setVoucherCode,
    restoreLegForEdit,
  } = useBookingStore(useShallow((state) => ({
    highestStepReached: state.highestStepReached,
    bookingStatus: state.bookingStatus,
    searchParams: state.searchParams,
    currentLeg: state.currentLeg,
    trips: state.trips,
    selectedTrip: state.selectedTrip,
    outboundState: state.outboundState,
    returnState: state.returnState,
    resetFlowPreservingSearch: state.resetFlowPreservingSearch,
    setVoucherCode: state.setVoucherCode,
    restoreLegForEdit: state.restoreLegForEdit,
  })));
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isRoundTrip = searchParams.isRoundTrip ?? false;
  const isSubmitting = bookingStatus === 'loading';
  const isTripSelectionStep = isRoundTrip ? step === 1 || step === 5 : step === 1;
  const hasActiveFilters = countActiveTripFilters(tripFilters) > 0;
  const bookingEntryKey = useMemo(
    () => createBookingEntryKey(searchParams, route.params?.intent),
    [route.params?.intent, searchParams],
  );
  const isBookingEntryInitialized = initializedEntryKey === bookingEntryKey;

  // Reset booking data when search params change (new booking)
  useEffect(() => {
    initializeBookingEntry(route.params?.intent, {
      resetFlowPreservingSearch,
      setVoucherCode,
    });
    setTripFilters(DEFAULT_TRIP_FILTERS);
    setStep(1);
    setInitializedEntryKey(bookingEntryKey);
  }, [
    bookingEntryKey,
    resetFlowPreservingSearch,
    route.params?.intent,
    setVoucherCode,
  ]);

  const operatorOptions = useMemo(() => {
    return Array.from(new Set(trips.map((trip) => trip.operatorBadge))).filter(Boolean);
  }, [trips]);

  const routeHeader = useMemo<RouteHeaderSnapshot | null>(() => {
    const from = searchParams.from.trim();
    const to = searchParams.to.trim();

    if (!from || !to) {
      return null;
    }

    if (!isRoundTrip) {
      const trip = selectedTrip ?? outboundState?.trip;

      return {
        primary: makeRouteLabel(from, to),
        secondary: makeHeaderContextLabel(
          t('booking.header.oneWay'),
          searchParams.date,
          t('booking.header.selectDate'),
          trip?.departureTime,
        ),
      };
    }

    const isCheckoutOrPaymentStep = step >= 9;

    const stepLeg = getRoundTripLegForStep(step) ?? currentLeg;
    const activeTrip = stepLeg === 'return'
      ? selectedTrip ?? returnState?.trip
      : selectedTrip ?? outboundState?.trip;
    const activeDate = stepLeg === 'return'
      ? searchParams.returnDate || t('booking.header.returnDate')
      : searchParams.date;

    if (isCheckoutOrPaymentStep) {
      return {
        primary: makeRoundTripRouteLabel(from, to),
        secondary: makeTravelDateRangeLabel(
          searchParams.date,
          searchParams.returnDate,
          t('booking.header.departureDate'),
          t('booking.header.returnDate'),
        ),
      };
    }

    return {
      primary: makeRoundTripRouteLabel(from, to),
      secondary: makeHeaderContextLabel(
        stepLeg === 'return'
          ? t('booking.header.return')
          : t('booking.header.outbound'),
        activeDate,
        t('booking.header.selectDate'),
        activeTrip?.departureTime,
      ),
    };
  }, [
    currentLeg,
    isRoundTrip,
    outboundState?.trip,
    returnState?.trip,
    searchParams.date,
    searchParams.from,
    searchParams.returnDate,
    searchParams.to,
    selectedTrip,
    step,
    t,
  ]);

  const navigateToFlowStep = useCallback((targetStep: number) => {
    if (isRoundTrip) {
      const targetLeg = getRoundTripLegForStep(targetStep);
      if (targetLeg) {
        restoreLegForEdit(targetLeg);
      }
    }

    setStep(targetStep);
  }, [isRoundTrip, restoreLegForEdit]);

  const isBookingInteractionLocked = useCallback(
    () => isSubmitting || bookingCompletionRef.current?.isRunning === true,
    [isSubmitting],
  );

  const handleBack = useCallback(() => {
    if (isBookingInteractionLocked()) return true;

    if (step > 1) {
      navigateToFlowStep(step - 1);
      return true; // Prevent default behavior
    } else {
      navigation.goBack();
      return true;
    }
  }, [isBookingInteractionLocked, navigateToFlowStep, navigation, step]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, [handleBack]));

  const handleStepPress = useCallback((targetStep: number) => {
    // Only completed/current steps are interactive. Once a user edits an
    // earlier leg they must walk its dependent steps again, which guarantees
    // saveOutboundLeg/saveReturnLeg refresh the payload snapshot before pay.
    if (
      !isBookingInteractionLocked()
      && targetStep <= Math.min(step, highestStepReached)
    ) {
      navigateToFlowStep(targetStep);
    }
  }, [highestStepReached, isBookingInteractionLocked, navigateToFlowStep, step]);

  const handleOpenFilters = useCallback(() => {
    setFilterVisible(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setFilterVisible(false);
  }, []);

  const handleApplyFilters = useCallback((nextFilters: TripFilterState) => {
    setTripFilters(nextFilters);
  }, []);

  const handleResetTripFilters = useCallback(() => {
    setTripFilters(DEFAULT_TRIP_FILTERS);
  }, []);

  const handleFinishBooking = useCallback((): Promise<void> => {
    return bookingCompletionRef.current!.run({
      createBooking: () => useBookingStore.getState().createBooking(),
      showTicket: () => navigation.replace('DigitalTicket', { source: 'checkout' }),
      openPayment: openPaymentRedirect,
      onPaymentOpenError: () => {
        Alert.alert(
          t('booking.paymentRedirect.errorTitle'),
          t('booking.paymentRedirect.errorDescription'),
        );
      },
    }).catch(() => undefined);
  }, [navigation, t]);

  const renderStep = () => {
    if (isRoundTrip) {
      // Round trip: 10 steps (4 outbound + 4 return + 2)
      switch (step) {
        case 1: case 5: return (
          <TripResultsStep
            onNext={setStep}
            autoSearchEnabled={isBookingEntryInitialized}
            filters={tripFilters}
            onClearFilters={handleResetTripFilters}
          />
        );
        case 2: case 6: return <SeatSelectionStep onNext={setStep} />;
        case 3: case 7: return <PickUpStep onNext={setStep} />;
        case 4: case 8: return <DropOffStep onNext={setStep} />;
        case 9: return <CheckoutStep onNext={setStep} onGoToStep={setStep} />;
        case 10: return <PaymentStep onNext={handleFinishBooking} />;
        default: return null;
      }
    } else {
      // One-way: 6 steps (4 outbound + 2)
      switch (step) {
        case 1: return (
          <TripResultsStep
            onNext={setStep}
            autoSearchEnabled={isBookingEntryInitialized}
            filters={tripFilters}
            onClearFilters={handleResetTripFilters}
          />
        );
        case 2: return <SeatSelectionStep onNext={setStep} />;
        case 3: return <PickUpStep onNext={setStep} />;
        case 4: return <DropOffStep onNext={setStep} />;
        case 5: return <CheckoutStep onNext={setStep} onGoToStep={setStep} />;
        case 6: return <PaymentStep onNext={handleFinishBooking} />;
        default: return null;
      }
    }
  };

  return (
    <View style={styles.root}>
      {/* Universal Gradient background */}
      <View style={styles.gradientContainer} pointerEvents="none">
        <Svg height="300" width="100%">
          <Defs>
            <LinearGradient id="mainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={theme.colors.primaryLight} stopOpacity={theme.isDark ? 0.18 : 0.14} />
              <Stop offset="100%" stopColor={theme.colors.background} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#mainGrad)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Global Header */}
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={handleBack}
              style={({ pressed }) => [styles.headerButton, pressed ? styles.headerButtonPressed : null]}
            >
              <ArrowLeft size={20} color={theme.colors.primary} weight="bold" />
            </Pressable>
          </View>

          <View style={styles.headerTitleSlot}>
            {routeHeader ? (
              <AnimatedRouteHeader
                primary={routeHeader.primary}
                secondary={routeHeader.secondary}
              />
            ) : (
              <View style={styles.routeHeaderShell} />
            )}
          </View>

          <View style={[styles.headerSide, styles.headerSideRight]}>
            {isTripSelectionStep ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('booking.filters.openAccessibility')}
                accessibilityState={{ selected: hasActiveFilters }}
                onPress={handleOpenFilters}
                style={({ pressed }) => [
                  styles.headerButton,
                  hasActiveFilters ? styles.filterButtonActive : null,
                  pressed ? styles.headerButtonPressed : null,
                ]}
              >
                <FunnelSimple
                  size={19}
                  weight="bold"
                  color={hasActiveFilters ? theme.colors.textInverse : theme.colors.primary}
                />
              </Pressable>
            ) : (
              <View style={styles.headerButtonGhost} />
            )}
          </View>
        </View>

        {/* Global Progress Bar */}
        <BookingProgressBar step={step} onStepPress={handleStepPress} />

        {/* Dynamic Content */}
        {renderStep()}
      </SafeAreaView>

      <TripFilterSheet
        visible={filterVisible}
        filters={tripFilters}
        operatorOptions={operatorOptions}
        onApply={handleApplyFilters}
        onClose={handleCloseFilters}
        onReset={handleResetTripFilters}
      />
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
    height: 300,
    zIndex: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerSide: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  headerTitleSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerButton: {
    ...theme.components.headerButton,
    position: 'relative',
  },
  headerButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  headerButtonGhost: {
    width: 40,
    height: 40,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  routeHeaderShell: {
    width: '100%',
    minWidth: 0,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  routeSecondaryShell: {
    width: '100%',
    height: 22,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  routeHeaderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routePrimary: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    maxWidth: '100%',
  },
  routeSecondary: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: '100%',
  },
  filterModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.effects.scrim,
  },
  filterSheet: {
    backgroundColor: theme.effects.glassSurfaceStrong,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.effects.glassBorderStrong,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '82%',
    ...theme.effects.floatingShadow,
  },
  filterSheetHandle: {
    width: 44,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.divider,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  filterTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
  filterSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  filterCloseButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: theme.effects.contentSurfaceSoft,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScrollContent: {
    paddingBottom: spacing.md,
  },
  filterSectionLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  filterSectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  comingSoonBadge: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  comingSoonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  disabledFilterShell: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.effects.contentBorder,
    backgroundColor: theme.effects.contentSurfaceSoft,
    opacity: 0.8,
  },
  disabledFilterTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  disabledFilterCopy: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textTertiary,
  },
  filterChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    minHeight: 42,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
    backgroundColor: theme.effects.contentSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: '100%',
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  filterChipPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  filterChipTextBlock: {
    minWidth: 0,
  },
  filterChipLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  filterChipLabelActive: {
    color: theme.colors.primary,
  },
  filterChipHelper: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  filterResetButton: {
    flex: 1,
    ...theme.components.secondaryButton,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterApplyButton: {
    flex: 1.4,
    ...theme.components.primaryButton,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  filterResetText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.primary,
  },
  filterApplyText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
});
