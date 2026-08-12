import {
  ApiRequestError,
  isAmbiguousIdempotentRequestError,
} from '@shared/api/errors';
import { createIdempotencyKey } from '@shared/api/idempotency';
import i18n from '@shared/i18n';
import {
  getTokenSessionEpoch,
  isTokenSessionEpochCurrent,
} from '@shared/utils/storage';
import type { CreateParcelPayload, StartParcelPaymentInput } from '../types';

export type IdempotentParcelSubmitter<TInput, TResult> = (
  input: TInput,
  idempotencyKey: string,
) => Promise<TResult>;

/**
 * Exact JSON-safe payload + key retained after an ambiguous outcome so retries
 * replay the same body BE fingerprinting expects (including quoteToken).
 */
export interface RetainedSubmission<TInput> {
  sessionEpoch: number;
  input: TInput;
  idempotencyKey: string;
}

interface InFlightParcelSubmission<TResult> {
  sessionEpoch: number;
  promise: Promise<TResult>;
}

/** Deep-clone JSON-safe create/payment payloads without logging or persistence. */
export const snapshotParcelSubmissionInput = <TInput>(input: TInput): TInput =>
  JSON.parse(JSON.stringify(input)) as TInput;

/**
 * Create intent may refresh quoteToken only. Recipient, package, trip, voucher,
 * payment method and other fields must match the retained body.
 */
export const areParcelCreateIntentsEqual = (
  left: CreateParcelPayload,
  right: CreateParcelPayload,
): boolean => {
  const normalize = (value: CreateParcelPayload) => {
    const rest = { ...value };
    delete (rest as { quoteToken?: string }).quoteToken;
    return rest;
  };
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
};

/** Payment intent must match parcel + stage/method completely. */
export const areParcelPaymentIntentsEqual = (
  left: StartParcelPaymentInput,
  right: StartParcelPaymentInput,
): boolean =>
  left.parcelId === right.parcelId
  && left.paymentMethod === right.paymentMethod
  && (left.paymentReturnMode ?? null) === (right.paymentReturnMode ?? null);

/**
 * Owns one immutable submission snapshot per parcel command.
 *
 * On ambiguous failure, retains exact input + key. Callers must use
 * retryRetainedAsync() or submit() with the same semantic intent; a changed
 * intent throws PARCEL_RETRY_INTENT_CHANGED instead of silently replaying.
 */
export class ParcelSubmissionCoordinator<TInput, TResult> {
  private retained: RetainedSubmission<TInput> | null = null;
  private inFlight: InFlightParcelSubmission<TResult> | null = null;

  constructor(
    private readonly scope: string,
    private readonly submitter: IdempotentParcelSubmitter<TInput, TResult>,
    private readonly areSemanticallyEqual: (
      left: TInput,
      right: TInput,
    ) => boolean,
  ) {}

  /** True when an ambiguous outcome is held for exact retry (not in-flight). */
  hasRetainedAmbiguousSubmission(): boolean {
    return this.retained !== null && this.inFlight === null;
  }

  /** Test/debug access — never log or persist retained.input quote tokens. */
  getRetainedSubmissionForTests(): RetainedSubmission<TInput> | null {
    return this.retained;
  }

  /**
   * Retry the exact retained body + key. Prefer this over submit() when the UI
   * knows an ambiguous submission is held.
   */
  retryRetainedAsync(): Promise<TResult> {
    const sessionEpoch = getTokenSessionEpoch();
    if (this.retained && this.retained.sessionEpoch !== sessionEpoch) {
      this.retained = null;
    }
    if (!this.retained) {
      return Promise.reject(new ApiRequestError({
        message: i18n.t('parcel.errors.retryNoRetainedRequest'),
        code: 'PARCEL_RETRY_NO_RETAINED',
      }));
    }
    return this.executeRetained(this.retained);
  }

  submit(input: TInput): Promise<TResult> {
    const sessionEpoch = getTokenSessionEpoch();

    if (this.retained && this.retained.sessionEpoch !== sessionEpoch) {
      this.retained = null;
    }

    if (this.inFlight?.sessionEpoch === sessionEpoch) {
      return this.inFlight.promise;
    }

    if (this.retained && this.retained.sessionEpoch === sessionEpoch) {
      if (!this.areSemanticallyEqual(this.retained.input, input)) {
        return Promise.reject(new ApiRequestError({
          message: i18n.t('parcel.errors.retryIntentChanged'),
          code: 'PARCEL_RETRY_INTENT_CHANGED',
        }));
      }
      return this.executeRetained(this.retained);
    }

    const retained: RetainedSubmission<TInput> = {
      sessionEpoch,
      input: snapshotParcelSubmissionInput(input),
      idempotencyKey: createIdempotencyKey(this.scope),
    };
    this.retained = retained;
    return this.executeRetained(retained);
  }

  private executeRetained(
    retained: RetainedSubmission<TInput>,
  ): Promise<TResult> {
    const { sessionEpoch, input: retainedInput, idempotencyKey } = retained;

    if (this.inFlight?.sessionEpoch === sessionEpoch) {
      return this.inFlight.promise;
    }

    const submission = (async (): Promise<TResult> => {
      try {
        const result = await this.submitter(retainedInput, idempotencyKey);

        if (!isTokenSessionEpochCurrent(sessionEpoch)) {
          throw new ApiRequestError({
            message: i18n.t('parcel.errors.sessionChanged'),
            code: 'SESSION_INVALIDATED',
          });
        }

        return result;
      } catch (error: unknown) {
        if (!isTokenSessionEpochCurrent(sessionEpoch)) {
          throw new ApiRequestError({
            message: i18n.t('parcel.errors.sessionChanged'),
            code: 'SESSION_INVALIDATED',
          });
        }
        throw error;
      }
    })();

    const activeSubmission = { sessionEpoch, promise: submission };
    this.inFlight = activeSubmission;

    submission.then(
      () => {
        if (this.inFlight === activeSubmission) {
          this.inFlight = null;
          this.retained = null;
        }
      },
      (error: unknown) => {
        if (this.inFlight === activeSubmission) {
          this.inFlight = null;
          const sessionStillCurrent = isTokenSessionEpochCurrent(sessionEpoch);
          if (
            !sessionStillCurrent
            || !isAmbiguousIdempotentRequestError(error, {
              retainOnRateLimit: true,
              retainOnUnknownStatus: true,
            })
          ) {
            this.retained = null;
          }
        }
      },
    );

    return submission;
  }
}
