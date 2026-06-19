/** CreateTicketBookingScreen — Single screen for the entire ticket booking flow
 *
 * Matches Parcel flow architecture: single screen, local step state,
 * centralized header and progress bar.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, StatusBar, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ArrowLeft } from 'phosphor-react-native';
import { spacing } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

import { useBookingStore } from '../store/useBookingStore';
import { BookingProgressBar } from '../components/BookingProgressBar';
import type { BookingStackParamList } from '@app/navigation/types';

// Import Steps
import { TripResultsScreen as TripResultsStep } from './TripResultsScreen';
import { SeatSelectionScreen as SeatSelectionStep } from './SeatSelectionScreen';
import { PickUpScreen as PickUpStep } from './PickUpScreen';
import { DropOffScreen as DropOffStep } from './DropOffScreen';
import { CheckoutScreen as CheckoutStep } from './CheckoutScreen';
import { PaymentScreen as PaymentStep } from './PaymentScreen';

type NavProp = NativeStackNavigationProp<BookingStackParamList, 'CreateTicketBooking'>;

export function CreateTicketBookingScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const [step, setStep] = useState(1);
  const { highestStepReached, saveOutboundLeg, totalSteps: getTotalSteps, searchParams } = useBookingStore();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isRoundTrip = searchParams.isRoundTrip ?? false;

  // Reset booking data when search params change (new booking)
  useEffect(() => {
    const current = useBookingStore.getState();
    useBookingStore.setState({
      ...current,
      currentLeg: 'outbound',
      outboundState: null,
      returnState: null,
      selectedTrip: null,
      selectedSeats: [],
      selectedPickUp: null,
      selectedDropOff: null,
      // Do NOT reset pickUpPoints and dropOffPoints - they contain MOCK data
      contactInfo: { fullName: '', phone: '', email: '', phoneCountryCode: '' },
      paymentMethod: 'vnpay',
      highestStepReached: 0,
      tripResultsStatus: 'loading',
      trips: [],
    });
    setStep(1);
  }, [searchParams.from, searchParams.to, searchParams.date, searchParams.isRoundTrip]);

  const totalSteps = getTotalSteps();

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

  const handleFinishBooking = () => {
    navigation.navigate('DigitalTicket', { bookingRef: 'VR-' + Date.now().toString().slice(-8) });
  };

  const renderStep = () => {
    if (isRoundTrip) {
      // Round trip: 10 steps (4 outbound + 4 return + 2)
      switch (step) {
        case 1: case 5: return <TripResultsStep onNext={setStep} />;
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
        case 1: return <TripResultsStep onNext={setStep} />;
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
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, pressed ? styles.backBtnPressed : null]}
          >
            <View style={styles.backBubble}>
              <ArrowLeft size={20} color={theme.colors.primary} weight="bold" />
            </View>
          </Pressable>
        </View>

        {/* Global Progress Bar */}
        <BookingProgressBar step={step} onStepPress={handleStepPress} />

        {/* Dynamic Content */}
        {renderStep()}
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    ...theme.components.headerButton,
  },
  backBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  backBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
