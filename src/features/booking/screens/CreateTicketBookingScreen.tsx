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
  Animated,
  Easing,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft, Check, FunnelSimple, X } from 'phosphor-react-native';
import { useShallow } from 'zustand/react/shallow';
import { borderRadius, fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import {
  getPaymentRedirectErrorMessage,
  openPaymentRedirect,
  PAYMENT_REDIRECT_ERROR_TITLE,
} from '@shared/utils/paymentRedirect';

import { useBookingStore } from '../store/useBookingStore';
import { BookingProgressBar } from '../components/BookingProgressBar';
import type { BookingStackParamList } from '@app/navigation/types';
import type { TripFilterState, TripPriceRange, TripTimeSlot } from '../types';

// Import Steps
import { TripResultsScreen as TripResultsStep } from './TripResultsScreen';
import { SeatSelectionScreen as SeatSelectionStep } from './SeatSelectionScreen';
import { PickUpScreen as PickUpStep } from './PickUpScreen';
import { DropOffScreen as DropOffStep } from './DropOffScreen';
import { CheckoutScreen as CheckoutStep } from './CheckoutScreen';
import { PaymentScreen as PaymentStep } from './PaymentScreen';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'CreateTicketBooking'>;

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

const timeSlotOptions: Array<{ label: string; value: TripTimeSlot; helper?: string }> = [
  { label: 'Any time', value: 'all' },
  { label: 'Morning', value: 'morning', helper: '05:00 - 11:59' },
  { label: 'Afternoon', value: 'afternoon', helper: '12:00 - 16:59' },
  { label: 'Evening', value: 'evening', helper: '17:00 - 21:59' },
  { label: 'Night', value: 'night', helper: '22:00 - 04:59' },
];

const priceRangeOptions: Array<{ label: string; value: TripPriceRange; helper?: string }> = [
  { label: 'Any price', value: 'all' },
  { label: 'Under 350K', value: 'under_350k' },
  { label: '350K - 450K', value: '350k_450k' },
  { label: 'Over 450K', value: 'over_450k' },
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
  label: 'One-way' | 'Outbound' | 'Return',
  dateLabel: string,
  departureTime?: string,
): string => {
  return [label, dateLabel || 'Select date', departureTime].filter(Boolean).join(' • ');
};

const makeTravelDateRangeLabel = (
  outboundDate: string,
  returnDate?: string,
): string => {
  return `${outboundDate || 'Depart date'} ↔ ${returnDate || 'Return date'}`;
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
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.filterModalRoot}>
        <Pressable style={styles.filterBackdrop} onPress={onClose} />
        <View style={styles.filterSheet}>
          <View style={styles.filterSheetHandle} />

          <View style={styles.filterHeaderRow}>
            <View>
              <Text style={styles.filterTitle}>Filter trips</Text>
              <Text style={styles.filterSubtitle}>
                Choose operator, departure time and fare.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close trip filters"
              onPress={onClose}
              style={({ pressed }) => [styles.filterCloseButton, pressed ? styles.headerButtonPressed : null]}
            >
              <X size={18} weight="bold" color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            <Text style={styles.filterSectionLabel}>Operator</Text>
            <View style={styles.filterChipGrid}>
              <FilterChip
                label="All operators"
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

            <Text style={styles.filterSectionLabel}>Departure time</Text>
            <View style={styles.filterChipGrid}>
              {timeSlotOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  helper={option.helper}
                  selected={draftFilters.timeSlot === option.value}
                  onPress={() => setTimeSlot(option.value)}
                />
              ))}
            </View>

            <Text style={styles.filterSectionLabel}>Fare</Text>
            <View style={styles.filterChipGrid}>
              {priceRangeOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
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
              <Text style={styles.filterResetText}>Reset</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleApply}
              style={({ pressed }) => [styles.filterApplyButton, pressed ? styles.filterActionPressed : null]}
            >
              <Text style={styles.filterApplyText}>
                {hasActiveDraftFilters ? 'Apply Filters' : 'Apply'}
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
  const animation = useRef(new Animated.Value(1)).current;
  const [visibleSecondary, setVisibleSecondary] = useState<string | undefined>(secondary);
  const [previousSecondary, setPreviousSecondary] = useState<string | null>(null);
  const visibleRef = useRef(visibleSecondary);
  const keyRef = useRef(secondary ?? '');

  useEffect(() => {
    visibleRef.current = visibleSecondary;
  }, [visibleSecondary]);

  useEffect(() => {
    const nextKey = secondary ?? '';

    if (nextKey === keyRef.current) {
      return;
    }

    setPreviousSecondary(visibleRef.current ?? null);
    setVisibleSecondary(secondary);
    keyRef.current = nextKey;
    animation.setValue(0);

    const transition = Animated.timing(animation, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    transition.start(({ finished }) => {
      if (finished) {
        setPreviousSecondary(null);
      }
    });

    return () => transition.stop();
  }, [animation, secondary]);

  const incomingStyle = {
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
    ],
  };

  const outgoingStyle = {
    opacity: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
    ],
  };

  const renderSecondary = (value?: string | null) => {
    if (!value) {
      return null;
    }

    return (
      <Text
        style={styles.routeSecondary}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={0.86}
      >
        {value}
      </Text>
    );
  };

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
        {previousSecondary ? (
          <Animated.View style={[styles.routeHeaderLayer, outgoingStyle]}>
            {renderSecondary(previousSecondary)}
          </Animated.View>
        ) : null}
        <Animated.View style={[styles.routeHeaderLayer, incomingStyle]}>
          {renderSecondary(visibleSecondary)}
        </Animated.View>
      </View>
    </View>
  );
}

export function CreateTicketBookingScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const [step, setStep] = useState(1);
  const [tripFilters, setTripFilters] = useState<TripFilterState>(DEFAULT_TRIP_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);
  const {
    highestStepReached,
    searchParams,
    currentLeg,
    trips,
    selectedTrip,
    outboundState,
    returnState,
    resetFlowPreservingSearch,
  } = useBookingStore(useShallow((state) => ({
    highestStepReached: state.highestStepReached,
    searchParams: state.searchParams,
    currentLeg: state.currentLeg,
    trips: state.trips,
    selectedTrip: state.selectedTrip,
    outboundState: state.outboundState,
    returnState: state.returnState,
    resetFlowPreservingSearch: state.resetFlowPreservingSearch,
  })));
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isRoundTrip = searchParams.isRoundTrip ?? false;
  const isTripSelectionStep = isRoundTrip ? step === 1 || step === 5 : step === 1;
  const hasActiveFilters = countActiveTripFilters(tripFilters) > 0;

  // Reset booking data when search params change (new booking)
  useEffect(() => {
    resetFlowPreservingSearch();
    setTripFilters(DEFAULT_TRIP_FILTERS);
    setStep(1);
  }, [
    searchParams.date,
    searchParams.destinationLocationCode,
    searchParams.from,
    searchParams.isRoundTrip,
    searchParams.originLocationCode,
    searchParams.passengers,
    searchParams.returnDate,
    searchParams.to,
    resetFlowPreservingSearch,
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
        secondary: makeHeaderContextLabel('One-way', searchParams.date, trip?.departureTime),
      };
    }

    const isCheckoutOrPaymentStep = step >= 9;

    const stepLeg = step >= 5 && step <= 8
      ? 'return'
      : step >= 9
        ? currentLeg
        : 'outbound';
    const activeTrip = stepLeg === 'return'
      ? selectedTrip ?? returnState?.trip
      : selectedTrip ?? outboundState?.trip;
    const activeDate = stepLeg === 'return'
      ? searchParams.returnDate || 'Return date'
      : searchParams.date;

    if (isCheckoutOrPaymentStep) {
      return {
        primary: makeRoundTripRouteLabel(from, to),
        secondary: makeTravelDateRangeLabel(searchParams.date, searchParams.returnDate),
      };
    }

    return {
      primary: makeRoundTripRouteLabel(from, to),
      secondary: makeHeaderContextLabel(
        stepLeg === 'return' ? 'Return' : 'Outbound',
        activeDate,
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
  ]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
      return true; // Prevent default behavior
    } else {
      navigation.goBack();
      return true;
    }
  }, [step, navigation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, [handleBack]);

  const handleStepPress = (targetStep: number) => {
    if (targetStep <= highestStepReached) {
      // Set currentLeg based on target step for round trips
      if (searchParams.isRoundTrip) {
        if (targetStep >= 1 && targetStep <= 4) {
          useBookingStore.setState({ currentLeg: 'outbound' });
        } else if (targetStep >= 5 && targetStep <= 8) {
          useBookingStore.setState({ currentLeg: 'return' });
        }
        // Steps 9-10 (checkout/payment) can show either leg, keep current
      }
      setStep(targetStep);
    }
  };

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

  const handleFinishBooking = useCallback(async () => {
    try {
      const result = await useBookingStore.getState().createBooking();
      if (result.paymentRedirectUrl) {
        try {
          await openPaymentRedirect(result.paymentRedirectUrl);
        } catch (error) {
          Alert.alert(
            PAYMENT_REDIRECT_ERROR_TITLE,
            getPaymentRedirectErrorMessage(error),
          );
        }
      }

      navigation.navigate('DigitalTicket');
    } catch {
      // PaymentScreen observes bookingError from the store and keeps the user in place.
    }
  }, [navigation]);

  const renderStep = () => {
    if (isRoundTrip) {
      // Round trip: 10 steps (4 outbound + 4 return + 2)
      switch (step) {
        case 1: case 5: return (
          <TripResultsStep
            onNext={setStep}
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
              accessibilityLabel="Go back"
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
                accessibilityLabel="Open trip filters"
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
    backgroundColor: theme.isDark ? 'rgba(1, 10, 10, 0.64)' : 'rgba(19, 33, 31, 0.38)',
  },
  filterSheet: {
    backgroundColor: theme.isDark ? 'rgba(9, 27, 26, 0.98)' : 'rgba(252, 255, 255, 0.98)',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(184, 255, 249, 0.28)' : 'rgba(0, 91, 87, 0.14)',
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
    backgroundColor: theme.isDark ? 'rgba(22, 51, 49, 0.96)' : 'rgba(245, 251, 251, 0.98)',
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(184, 255, 249, 0.22)' : 'rgba(0, 91, 87, 0.12)',
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
  filterChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    minHeight: 42,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(184, 255, 249, 0.22)' : 'rgba(0, 91, 87, 0.12)',
    backgroundColor: theme.isDark ? 'rgba(20, 47, 45, 0.96)' : 'rgba(255, 255, 255, 0.98)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: '100%',
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.isDark ? 'rgba(85, 241, 232, 0.18)' : 'rgba(0, 154, 148, 0.14)',
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
