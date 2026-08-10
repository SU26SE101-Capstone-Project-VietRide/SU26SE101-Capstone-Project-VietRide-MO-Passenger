import type { BookingResult, RoundTripResult } from '../types';

type BookingSubmissionResult = BookingResult | RoundTripResult;

export interface BookingCompletionDependencies {
  createBooking: () => Promise<BookingSubmissionResult>;
  showTicket: () => void;
  /** Opens VNPay for a pending booking charge (full BE result, not URL alone). */
  openPayment: (charge: BookingSubmissionResult) => Promise<void>;
  onPaymentOpenError: (error: unknown) => void;
}

export async function completeBookingFlow({
  createBooking,
  showTicket,
  openPayment,
  onPaymentOpenError,
}: BookingCompletionDependencies): Promise<void> {
  const result = await createBooking();
  showTicket();

  if (result.status !== 'PENDING_PAYMENT') return;

  try {
    await openPayment(result);
  } catch (error) {
    onPaymentOpenError(error);
  }
}

/** Coalesces the API result and its navigation/redirect side effects. */
export class BookingCompletionCoordinator {
  private active: Promise<void> | null = null;

  get isRunning(): boolean {
    return this.active !== null;
  }

  run(dependencies: BookingCompletionDependencies): Promise<void> {
    if (this.active) return this.active;

    const submission = completeBookingFlow(dependencies);
    this.active = submission;

    const release = (): void => {
      if (this.active === submission) this.active = null;
    };
    submission.then(release, release);

    return submission;
  }
}
