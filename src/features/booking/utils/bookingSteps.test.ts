import {
  getBookingStepConfiguration,
  getRoundTripLegForStep,
  getTotalSteps,
} from './bookingSteps';

describe('booking step configuration', () => {
  it('uses checkout step 5 and payment step 6 for one-way bookings', () => {
    expect(getBookingStepConfiguration(false)).toEqual({
      totalSteps: 6,
      checkoutStep: 5,
      paymentStep: 6,
    });
    expect(getTotalSteps(false)).toBe(6);
  });

  it('uses checkout step 9 and payment step 10 for round-trip bookings', () => {
    expect(getBookingStepConfiguration(true)).toEqual({
      totalSteps: 10,
      checkoutStep: 9,
      paymentStep: 10,
    });
    expect(getTotalSteps(true)).toBe(10);
  });
});

describe('getRoundTripLegForStep', () => {
  it.each([1, 2, 3, 4])('maps step %i to the outbound leg', (step) => {
    expect(getRoundTripLegForStep(step)).toBe('outbound');
  });

  it.each([5, 6, 7, 8])('maps step %i to the return leg', (step) => {
    expect(getRoundTripLegForStep(step)).toBe('return');
  });

  it.each([0, -1, 1.5, 9, 10, 11])(
    'does not assign a leg to non-leg step %s',
    (step) => {
      expect(getRoundTripLegForStep(step)).toBeNull();
    },
  );
});
