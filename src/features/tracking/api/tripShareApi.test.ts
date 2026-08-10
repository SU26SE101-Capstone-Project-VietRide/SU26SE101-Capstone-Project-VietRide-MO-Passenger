import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

import { apiClient } from '@shared/api/axiosInstance';
import type { ApiSuccessEnvelope } from '@shared/api/errors';
import { createTripShareLink } from './tripShareApi';

jest.mock('@shared/api/axiosInstance', () => ({
  apiClient: { request: jest.fn(), delete: jest.fn() },
}));

const TRIP_ID = '11111111-1111-4111-8111-111111111111';
const IDEMPOTENCY_KEY = '22222222-2222-4222-8222-222222222222';
const SHARE_URL =
  'https://share.vietride.vn/trip#token=v1.'
  + '33333333-3333-4333-8333-333333333333.'
  + 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const successEnvelope = <T>(data: T): ApiSuccessEnvelope<T> => ({
  success: true,
  statusCode: 200,
  data,
});

describe('tripShareApi', () => {
  const requestMock = jest.mocked(apiClient.request);

  beforeEach(() => {
    requestMock.mockReset();
  });

  it('sends a bodyless create request with only auth and idempotency application headers', async () => {
    const payload = {
      shareUrl: SHARE_URL,
      expiresAt: '2026-07-20T15:00:00+07:00',
    };
    requestMock.mockResolvedValueOnce({ data: successEnvelope(payload) });

    await expect(
      createTripShareLink(TRIP_ID, IDEMPOTENCY_KEY),
    ).resolves.toEqual(payload);

    expect(requestMock).toHaveBeenCalledTimes(1);
    const requestConfig = requestMock.mock.calls[0]?.[0];

    expect(requestConfig).toEqual(expect.objectContaining({
      method: 'PUT',
      url: `/tracking/trips/${TRIP_ID}/share-link`,
    }));
    expect(requestConfig).not.toHaveProperty('data');
    if (!requestConfig) {
      throw new Error('Expected a share-link request config.');
    }

    let adapterConfig: InternalAxiosRequestConfig | undefined;
    const wireClient = axios.create({
      baseURL: 'https://api.vietride.test/v1',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      adapter: async (config) => {
        adapterConfig = config;
        return {
          config,
          data: {},
          headers: new AxiosHeaders(),
          status: 200,
          statusText: 'OK',
        };
      },
    });
    wireClient.interceptors.request.use((config) => {
      config.headers.Authorization = 'Bearer access-token';
      return config;
    });

    await wireClient.request(requestConfig);

    expect(adapterConfig?.data).toBeUndefined();
    expect(adapterConfig?.headers.toJSON()).toEqual({
      Authorization: 'Bearer access-token',
      'Idempotency-Key': IDEMPOTENCY_KEY,
    });
  });

  it('rejects an offsetless expiry at the response boundary', async () => {
    requestMock.mockResolvedValueOnce({
      data: successEnvelope({
        shareUrl: SHARE_URL,
        expiresAt: '2026-07-20T15:00:00',
      }),
    });

    await expect(
      createTripShareLink(TRIP_ID, IDEMPOTENCY_KEY),
    ).rejects.toMatchObject({ code: 'INVALID_API_RESPONSE' });
  });
});
