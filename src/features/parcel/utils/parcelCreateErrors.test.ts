import { ApiRequestError } from '@shared/api/errors';
import { classifyParcelCreateConflict } from './parcelCreateErrors';

describe('classifyParcelCreateConflict', () => {
  it('classifies quote and trip freshness codes without a catch-all 409', () => {
    expect(classifyParcelCreateConflict(new ApiRequestError({
      message: 'expired',
      code: 'PARCEL_QUOTE_EXPIRED',
      statusCode: 409,
    }))).toBe('quote_expired');

    expect(classifyParcelCreateConflict(new ApiRequestError({
      message: 'mismatch',
      code: 'PARCEL_QUOTE_MISMATCH',
      statusCode: 409,
    }))).toBe('quote_invalid');

    expect(classifyParcelCreateConflict(new ApiRequestError({
      message: 'trip',
      code: 'TRIP_NOT_ACCEPTING_PARCEL',
      statusCode: 409,
    }))).toBe('trip_freshness');

    expect(classifyParcelCreateConflict(new ApiRequestError({
      message: 'code',
      code: 'PARCEL_CODE_COLLISION',
      statusCode: 409,
    }))).toBe('code_collision');

    expect(classifyParcelCreateConflict(new ApiRequestError({
      message: 'pending',
      code: 'IDEMPOTENCY_REQUEST_PENDING',
      statusCode: 409,
    }))).toBe('idempotency_pending');

    expect(classifyParcelCreateConflict(new ApiRequestError({
      message: 'dropoff',
      code: 'DROP_OFF_STOP_NOT_FOUND',
      statusCode: 409,
    }))).toBe('dropoff_unavailable');
  });

  it('treats network/timeout as ambiguous', () => {
    expect(classifyParcelCreateConflict(new ApiRequestError({
      message: 'timeout',
      code: 'REQUEST_TIMEOUT',
      statusCode: 408,
    }))).toBe('ambiguous');

    expect(classifyParcelCreateConflict(new ApiRequestError({
      message: 'network',
      code: 'NETWORK_ERROR',
      isNetworkError: true,
    }))).toBe('ambiguous');
  });
});
