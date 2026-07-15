export const OUTBOUND_STEPS = 4;
export const RETURN_STEPS = 4;

export const CHECKOUT_STEP = OUTBOUND_STEPS + RETURN_STEPS + 1;
export const PAYMENT_STEP = CHECKOUT_STEP + 1;

export type BookingLeg = 'outbound' | 'return';

export interface BookingStepConfiguration {
  totalSteps: number;
  checkoutStep: number;
  paymentStep: number;
}

export const getBookingStepConfiguration = (
  isRoundTrip: boolean,
): BookingStepConfiguration => {
  const checkoutStep = isRoundTrip
    ? CHECKOUT_STEP
    : OUTBOUND_STEPS + 1;
  const paymentStep = isRoundTrip
    ? PAYMENT_STEP
    : checkoutStep + 1;

  return {
    totalSteps: paymentStep,
    checkoutStep,
    paymentStep,
  };
};

export const getTotalSteps = (isRoundTrip: boolean): number =>
  getBookingStepConfiguration(isRoundTrip).totalSteps;

export const getRoundTripLegForStep = (step: number): BookingLeg | null => {
  if (!Number.isInteger(step) || step < 1) {
    return null;
  }

  if (step <= OUTBOUND_STEPS) {
    return 'outbound';
  }

  if (step <= OUTBOUND_STEPS + RETURN_STEPS) {
    return 'return';
  }

  return null;
};
