import type { BookingResult } from '../types';
import {
  BookingCompletionCoordinator,
  completeBookingFlow,
} from './bookingCompletion';

const pendingResult: BookingResult = {
  bookingId: '11111111-1111-4111-8111-111111111111',
  bookingCode: 'VR-PENDING',
  status: 'PENDING_PAYMENT',
  totalAmount: 250_000,
  discountAmount: 0,
  paymentId: '22222222-2222-4222-8222-222222222222',
  paymentRedirectUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  tickets: [],
};

describe('booking completion side effects', () => {
  it('navigates and opens VNPay exactly once after a rapid double tap', async () => {
    let resolveBooking: ((result: BookingResult) => void) | undefined;
    const createBooking = jest.fn(() => new Promise<BookingResult>((resolve) => {
      resolveBooking = resolve;
    }));
    const showTicket = jest.fn();
    const openPayment = jest.fn().mockResolvedValue(undefined);
    const coordinator = new BookingCompletionCoordinator();
    const dependencies = {
      createBooking,
      showTicket,
      openPayment,
      onPaymentOpenError: jest.fn(),
    };

    const first = coordinator.run(dependencies);
    const second = coordinator.run(dependencies);

    expect(second).toBe(first);
    expect(coordinator.isRunning).toBe(true);
    expect(createBooking).toHaveBeenCalledTimes(1);
    resolveBooking?.(pendingResult);
    await Promise.all([first, second]);

    expect(coordinator.isRunning).toBe(false);
    expect(showTicket).toHaveBeenCalledTimes(1);
    expect(openPayment).toHaveBeenCalledTimes(1);
    expect(openPayment).toHaveBeenCalledWith(pendingResult.paymentRedirectUrl);
  });

  it('does not open a redirect for a confirmed wallet booking', async () => {
    const showTicket = jest.fn();
    const openPayment = jest.fn();

    await completeBookingFlow({
      createBooking: async () => ({
        ...pendingResult,
        status: 'CONFIRMED',
        paymentId: null,
        paymentRedirectUrl: null,
      }),
      showTicket,
      openPayment,
      onPaymentOpenError: jest.fn(),
    });

    expect(showTicket).toHaveBeenCalledTimes(1);
    expect(openPayment).not.toHaveBeenCalled();
  });

  it('reports a redirect error without undoing the created booking', async () => {
    const error = new Error('Linking failed.');
    const onPaymentOpenError = jest.fn();

    await expect(completeBookingFlow({
      createBooking: async () => pendingResult,
      showTicket: jest.fn(),
      openPayment: async () => { throw error; },
      onPaymentOpenError,
    })).resolves.toBeUndefined();

    expect(onPaymentOpenError).toHaveBeenCalledWith(error);
  });
});
