import { ApiRequestError } from '@shared/api/errors';
import {
  beginTokenSession,
  getTokenSessionEpoch,
} from '@shared/utils/storage';
import type { CreateParcelPayload } from '../types';
import {
  areParcelCreateIntentsEqual,
  areParcelPaymentIntentsEqual,
  ParcelSubmissionCoordinator,
} from './parcelSubmissionCoordinator';

const createBody = (
  quoteToken: string,
  overrides: Partial<CreateParcelPayload> = {},
): CreateParcelPayload => ({
  tripId: '11111111-1111-4111-8111-111111111111',
  quoteToken,
  dropoffStopId: null,
  bookingId: null,
  itemName: 'Documents',
  description: null,
  sizeCategory: 'MEDIUM',
  lengthCm: 40,
  widthCm: 30,
  heightCm: 20,
  estimatedWeightKg: 8,
  photoUrl: null,
  recipient: {
    fullName: 'Recipient',
    phoneNumber: '0912345678',
    email: null,
  },
  deliveryMethod: 'TERMINAL_PICKUP',
  paymentMethod: 'VNPAY',
  voucherCode: null,
  ...overrides,
});

describe('ParcelSubmissionCoordinator exact-payload retry', () => {
  beforeEach(() => {
    beginTokenSession();
  });

  it('replays original body+key after timeout when only quoteToken changed in UI input', async () => {
    const calls: Array<{ input: CreateParcelPayload; key: string }> = [];
    const submitter = jest.fn(async (input: CreateParcelPayload, key: string) => {
      calls.push({ input, key });
      if (calls.length === 1) {
        throw new ApiRequestError({
          message: 'timeout',
          code: 'REQUEST_TIMEOUT',
          statusCode: 408,
        });
      }
      return { parcelId: 'ok' };
    });

    const coordinator = new ParcelSubmissionCoordinator(
      'parcel-test',
      submitter,
      areParcelCreateIntentsEqual,
    );

    await expect(coordinator.submit(createBody('token-A'))).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
    });

    await expect(coordinator.submit(createBody('token-B'))).resolves.toEqual({
      parcelId: 'ok',
    });

    expect(calls).toHaveLength(2);
    expect(calls[0].input.quoteToken).toBe('token-A');
    expect(calls[1].input.quoteToken).toBe('token-A');
    expect(calls[1].key).toBe(calls[0].key);
  });

  it('blocks submit when recipient changes during retained ambiguous state', async () => {
    const submitter = jest.fn(async () => {
      throw new ApiRequestError({
        message: 'timeout',
        code: 'REQUEST_TIMEOUT',
        statusCode: 408,
      });
    });

    const coordinator = new ParcelSubmissionCoordinator(
      'parcel-test',
      submitter,
      areParcelCreateIntentsEqual,
    );

    await expect(coordinator.submit(createBody('token-A'))).rejects.toBeTruthy();
    await expect(
      coordinator.submit(createBody('token-A', {
        recipient: {
          fullName: 'Someone Else',
          phoneNumber: '0900000000',
          email: null,
        },
      })),
    ).rejects.toMatchObject({
      code: 'PARCEL_RETRY_INTENT_CHANGED',
    });
    expect(submitter).toHaveBeenCalledTimes(1);
  });

  it('blocks payment method changes while payment intent is retained', async () => {
    const submitter = jest.fn(async () => {
      throw new ApiRequestError({
        message: 'timeout',
        code: 'REQUEST_TIMEOUT',
        statusCode: 408,
      });
    });

    const coordinator = new ParcelSubmissionCoordinator(
      'parcel-pay',
      submitter,
      areParcelPaymentIntentsEqual,
    );

    await expect(coordinator.submit({
      parcelId: 'parcel-1',
      paymentMethod: 'VNPAY',
    })).rejects.toBeTruthy();

    await expect(coordinator.submit({
      parcelId: 'parcel-1',
      paymentMethod: 'WALLET',
    })).rejects.toMatchObject({
      code: 'PARCEL_RETRY_INTENT_CHANGED',
    });
  });

  it('retryRetainedAsync keeps the same idempotency key and body', async () => {
    const calls: Array<{ input: CreateParcelPayload; key: string }> = [];
    const submitter = jest.fn(async (input: CreateParcelPayload, key: string) => {
      calls.push({ input, key });
      if (calls.length === 1) {
        throw new ApiRequestError({
          message: 'network',
          code: 'NETWORK_ERROR',
          isNetworkError: true,
        });
      }
      return { parcelId: 'retry-ok' };
    });

    const coordinator = new ParcelSubmissionCoordinator(
      'parcel-test',
      submitter,
      areParcelCreateIntentsEqual,
    );

    await expect(coordinator.submit(createBody('token-A'))).rejects.toBeTruthy();
    expect(coordinator.hasRetainedAmbiguousSubmission()).toBe(true);
    await expect(coordinator.retryRetainedAsync()).resolves.toEqual({
      parcelId: 'retry-ok',
    });
    expect(calls[1].input).toEqual(calls[0].input);
    expect(calls[1].key).toBe(calls[0].key);
    expect(coordinator.hasRetainedAmbiguousSubmission()).toBe(false);
  });

  it('clears retained state when session changes before pending success', async () => {
    let resolveSubmit!: (value: { parcelId: string }) => void;
    const submitter = jest.fn(
      () =>
        new Promise<{ parcelId: string }>(resolve => {
          resolveSubmit = resolve;
        }),
    );

    const coordinator = new ParcelSubmissionCoordinator(
      'parcel-test',
      submitter,
      areParcelCreateIntentsEqual,
    );
    const pending = coordinator.submit(createBody('token-A'));

    beginTokenSession();
    resolveSubmit({ parcelId: 'stale-session' });

    await expect(pending).rejects.toMatchObject({
      code: 'SESSION_INVALIDATED',
    });
    expect(coordinator.getRetainedSubmissionForTests()).toBeNull();
  });

  it('shares one in-flight promise for concurrent presses', async () => {
    let resolveSubmit!: (value: { parcelId: string }) => void;
    const submitter = jest.fn(
      () =>
        new Promise<{ parcelId: string }>(resolve => {
          resolveSubmit = resolve;
        }),
    );

    const coordinator = new ParcelSubmissionCoordinator(
      'parcel-test',
      submitter,
      areParcelCreateIntentsEqual,
    );
    const first = coordinator.submit(createBody('token-A'));
    const second = coordinator.submit(createBody('token-B'));

    expect(submitter).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);

    resolveSubmit({ parcelId: 'shared' });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { parcelId: 'shared' },
      { parcelId: 'shared' },
    ]);
  });

  it.each([
    'PARCEL_QUOTE_INVALID',
    'PARCEL_QUOTE_EXPIRED',
    'PARCEL_QUOTE_STALE',
    'PARCEL_QUOTE_MISMATCH',
  ] as const)('clears retained state on definitive quote error %s', async (code) => {
    const submitter = jest.fn(async () => {
      throw new ApiRequestError({
        message: code,
        code,
        statusCode: 409,
      });
    });

    const coordinator = new ParcelSubmissionCoordinator(
      'parcel-test',
      submitter,
      areParcelCreateIntentsEqual,
    );
    await expect(coordinator.submit(createBody('token-A'))).rejects.toMatchObject({
      code,
    });
    expect(coordinator.getRetainedSubmissionForTests()).toBeNull();
  });

  it('does not reuse retained payload across session epochs', async () => {
    const submitter = jest.fn(async () => {
      throw new ApiRequestError({
        message: 'timeout',
        code: 'REQUEST_TIMEOUT',
        statusCode: 408,
      });
    });
    const coordinator = new ParcelSubmissionCoordinator(
      'parcel-test',
      submitter,
      areParcelCreateIntentsEqual,
    );
    const firstEpoch = getTokenSessionEpoch();
    await expect(coordinator.submit(createBody('token-A'))).rejects.toBeTruthy();
    expect(coordinator.getRetainedSubmissionForTests()?.sessionEpoch).toBe(firstEpoch);
    beginTokenSession();
    await expect(coordinator.submit(createBody('token-B'))).rejects.toBeTruthy();
    expect(coordinator.getRetainedSubmissionForTests()?.input.quoteToken).toBe(
      'token-B',
    );
  });
});
