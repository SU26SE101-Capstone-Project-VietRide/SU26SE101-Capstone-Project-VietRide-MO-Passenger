import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { logError, logRequest, logResponse } from './apiLogger';

const makeConfig = (
  overrides: Partial<InternalAxiosRequestConfig> = {},
): InternalAxiosRequestConfig => ({
  headers: new AxiosHeaders(),
  method: 'post',
  url: '/v1/bookings',
  ...overrides,
});

const consoleOutput = (spy: jest.SpyInstance): string =>
  spy.mock.calls.flat().join('\n');

describe('API logger redaction', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redacts headers, query parameters, nested PII, and precise location', () => {
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
    const config = makeConfig({
      headers: new AxiosHeaders({
        Authorization: 'Bearer header-secret',
        'Idempotency-Key': 'idempotency-secret',
      }),
      url: '/v1/bookings?token=url-query-secret',
      params: {
        page: 1,
        accessToken: 'query-access-secret',
        filter: { email: 'query@example.com' },
      },
      data: JSON.stringify({
        tripId: 'trip-safe-value',
        contactInformation: {
          fullName: 'Nguyen Secret',
          phone: '0901234567',
        },
        seats: [
          {
            seatNumber: 'A01',
            passenger: {
              idNumber: '012345678901',
              nested: { refreshToken: 'nested-token-secret' },
            },
          },
        ],
        shuttlePickup: {
          address: '123 Secret Street',
          latitude: 10.123456,
          longitude: 106.123456,
          coordinates: [10.123456, 106.123456],
        },
        pickupLatitude: 12.654321,
        privateKey: 'private-key-secret',
      }),
    });

    logRequest(config);

    const output = consoleOutput(debugSpy);
    expect(output).toContain('trip-safe-value');
    expect(output).toContain('A01');
    expect(output).toContain('"page": 1');
    expect(output).toContain('Auth: [REDACTED]');
    expect(output).toContain('Idempotency-Key: [REDACTED]');
    [
      'header-secret',
      'idempotency-secret',
      'url-query-secret',
      'query-access-secret',
      'query@example.com',
      'Nguyen Secret',
      '0901234567',
      '012345678901',
      'nested-token-secret',
      '123 Secret Street',
      '10.123456',
      '106.123456',
      '12.654321',
      'private-key-secret',
    ].forEach(secret => expect(output).not.toContain(secret));
  });

  it('redacts sensitive response values inside nested objects and arrays', () => {
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
    const response = {
      config: makeConfig({
        method: 'get',
        url: '/v1/users/94941918-55a6-4a73-8e13-4eb8a2d64ea1?phone=0900000000',
      }),
      data: {
        success: true,
        data: [
          {
            status: 'PENDING',
            profile: {
              emailAddress: 'response@example.com',
              homeAddress: '456 Hidden Avenue',
              location: { lat: 11.1, lng: 107.2 },
            },
          },
        ],
      },
      headers: {},
      status: 200,
      statusText: 'OK',
    } as AxiosResponse;

    logResponse(response);

    const output = consoleOutput(debugSpy);
    expect(output).toContain('/v1/users/:id');
    expect(output).toContain('PENDING');
    expect(output).not.toContain('94941918-55a6-4a73-8e13-4eb8a2d64ea1');
    expect(output).not.toContain('0900000000');
    expect(output).not.toContain('response@example.com');
    expect(output).not.toContain('456 Hidden Avenue');
    expect(output).not.toContain('11.1');
    expect(output).not.toContain('107.2');
  });

  it('sanitizes both the error response and original request body', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const config = makeConfig({
      data: {
        password: 'request-password-secret',
        pickup: {
          address: '789 Private Road',
          latitude: 9.8765,
          longitude: 105.4321,
        },
      },
    });
    const response = {
      config,
      data: {
        error: {
          code: 'VALIDATION_ERROR',
          details: [{ cookie: 'response-cookie-secret' }],
        },
      },
      headers: {},
      status: 422,
      statusText: 'Unprocessable Entity',
    } as AxiosResponse;
    const error = new AxiosError(
      'Bearer message-token-secret failed for passenger@example.com',
      'ERR_BAD_REQUEST',
      config,
      undefined,
      response,
    );

    logError(error);

    const output = consoleOutput(warnSpy);
    expect(output).toContain('VALIDATION_ERROR');
    expect(output).toContain('custom error message omitted');
    [
      'message-token-secret',
      'passenger@example.com',
      'request-password-secret',
      '789 Private Road',
      '9.8765',
      '105.4321',
      'response-cookie-secret',
    ].forEach(secret => expect(output).not.toContain(secret));
  });
});
