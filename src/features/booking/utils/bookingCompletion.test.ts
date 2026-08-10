import type { BookingResult } from '../types';
import {
  BookingCompletionCoordinator,
  completeBookingFlow,
} from './bookingCompletion';

const pendingResult: BookingResult = {
  bookingId: '11111111-1111-4111-8111-111111111111',
  bookingCode: 'VR-1',
  status: 'PENDING_PAYMENT',
  totalAmount: 100_000,
  discountAmount: 0,
  paymentId: '22222222-2222-4222-8222-222222222222',
  paymentRedirectUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  paymentReturnMode: 'MOBILE_SDK',
  vnpaySdk: {
    tmnCode: 'TMNCODE',
    scheme: 'vietride',
    isSandbox: true,
  },
  tickets: [],
};

describe('completeBookingFlow', () => {
  it('opens payment once with the full charge result after a rapid double tap', async () => {
    let resolveBooking: ((result: BookingResult) => void) | undefined;
    const createBooking = jest.fn(() => new Promise<BookingResult>((resolve) => {
      resolveBooking = resolve;
    }));
    const openPayment = jest.fn().mockResolvedValue(undefined);
    const coordinator = new BookingCompletionCoordinator();
    const showTicket = jest.fn();

    const first = coordinator.run({
      createBooking,
      showTicket,
      openPayment,
      onPaymentOpenError: jest.fn(),
    });
    const second = coordinator.run({
      createBooking,
      showTicket,
      openPayment,
      onPaymentOpenError: jest.fn(),
    });

    expect(createBooking).toHaveBeenCalledTimes(1);
    resolveBooking?.(pendingResult);
    await Promise.all([first, second]);

    expect(openPayment).toHaveBeenCalledTimes(1);
    expect(openPayment).toHaveBeenCalledWith(pendingResult);
    expect(showTicket).toHaveBeenCalledTimes(1);
  });

  it('skips payment open when booking is already confirmed', async () => {
    const openPayment = jest.fn();

    await completeBookingFlow({
      createBooking: async () => ({
        ...pendingResult,
        status: 'CONFIRMED',
        paymentId: null,
        paymentRedirectUrl: null,
        vnpaySdk: null,
      }),
      showTicket: jest.fn(),
      openPayment,
      onPaymentOpenError: jest.fn(),
    });

    expect(openPayment).not.toHaveBeenCalled();
  });

  it('reports payment open errors without rejecting the flow', async () => {
    const error = new Error('open failed');
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
