jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));

import {
  createGoongPlacesProvider,
  type PlacesFetch,
} from './goongPlacesProvider';

const jsonResponse = (
  payload: unknown,
  status = 200,
): Awaited<ReturnType<PlacesFetch>> => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(payload),
});

describe('Goong Places provider', () => {
  it('calls Autocomplete V2 with the locked bias and normalizes predictions', async () => {
    const fetchImplementation = jest.fn<ReturnType<PlacesFetch>, Parameters<PlacesFetch>>()
      .mockResolvedValue(jsonResponse({
        status: 'OK',
        predictions: [
          {
            place_id: 'goong-place-1',
            description: 'Bến Thành, Quận 1, Hồ Chí Minh',
            structured_formatting: {
              main_text: 'Bến Thành',
              secondary_text: 'Quận 1, Hồ Chí Minh',
            },
          },
          { description: 'Malformed item without an identifier' },
        ],
      }));
    const provider = createGoongPlacesProvider({
      apiKey: 'test-rest-key',
      fetchImplementation,
    });

    await expect(provider.autocomplete({
      query: '  Bến   Thành  ',
      location: { latitude: 10.772, longitude: 106.698 },
      radiusMeters: 10_000,
      maxResults: 99,
    })).resolves.toEqual([
      {
        placeId: 'goong-place-1',
        primaryText: 'Bến Thành',
        secondaryText: 'Quận 1, Hồ Chí Minh',
        fullText: 'Bến Thành, Quận 1, Hồ Chí Minh',
      },
    ]);

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchImplementation.mock.calls[0];
    const url = new URL(requestUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://rsapi.goong.io/v2/place/autocomplete',
    );
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      input: 'Bến Thành',
      limit: '5',
      more_compound: 'true',
      location: '10.772,106.698',
      radius: '10',
      api_key: 'test-rest-key',
    });
    expect(url.searchParams.has('origin')).toBe(false);
    expect(url.searchParams.has('has_deprecated_administrative_unit')).toBe(false);
    expect(requestInit.method).toBe('GET');
    expect(requestInit.signal).toBeInstanceOf(AbortSignal);
  });

  it('resolves Place Detail V2 into the internal Goong-tagged domain shape', async () => {
    const fetchImplementation = jest.fn<ReturnType<PlacesFetch>, Parameters<PlacesFetch>>()
      .mockResolvedValue(jsonResponse({
        status: 'OK',
        result: {
          place_id: 'canonical-place-id',
          name: 'Chợ Bến Thành',
          formatted_address: 'Lê Lợi, Quận 1, Hồ Chí Minh',
          geometry: { location: { lat: '10.772', lng: 106.698 } },
        },
      }));
    const provider = createGoongPlacesProvider({
      apiKey: 'test-rest-key',
      fetchImplementation,
    });

    await expect(provider.resolvePlace({ placeId: 'suggestion-id' })).resolves.toEqual({
      provider: 'goong',
      placeId: 'canonical-place-id',
      displayName: 'Chợ Bến Thành',
      formattedAddress: 'Lê Lợi, Quận 1, Hồ Chí Minh',
      latitude: 10.772,
      longitude: 106.698,
    });

    const url = new URL(fetchImplementation.mock.calls[0][0]);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://rsapi.goong.io/v2/place/detail',
    );
    expect(url.searchParams.get('place_id')).toBe('suggestion-id');
  });

  it('rejects malformed detail envelopes separately from incomplete geometry', async () => {
    const fetchImplementation = jest.fn<ReturnType<PlacesFetch>, Parameters<PlacesFetch>>();
    const provider = createGoongPlacesProvider({
      apiKey: 'test-rest-key',
      fetchImplementation,
    });

    fetchImplementation.mockResolvedValueOnce(jsonResponse(null));
    await expect(provider.resolvePlace({ placeId: 'place-1' })).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });

    fetchImplementation.mockResolvedValueOnce(jsonResponse({
      status: 'OK',
      result: {
        place_id: 'place-1',
        name: 'Missing geometry',
      },
    }));
    await expect(provider.resolvePlace({ placeId: 'place-1' })).rejects.toMatchObject({
      code: 'INVALID_PLACE',
    });
  });

  it('treats a non-empty but wholly malformed prediction array as unavailable', async () => {
    const fetchImplementation = jest.fn<ReturnType<PlacesFetch>, Parameters<PlacesFetch>>()
      .mockResolvedValue(jsonResponse({
        status: 'OK',
        predictions: [{ description: 'Missing place id' }],
      }));
    const provider = createGoongPlacesProvider({
      apiKey: 'test-rest-key',
      fetchImplementation,
    });

    await expect(provider.autocomplete({ query: 'Bến Thành' })).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
  });

  it('distinguishes network failures and invalid JSON using redacted errors', async () => {
    const invalidJsonResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new Error('secret provider body')),
    };
    const fetchImplementation = jest.fn<ReturnType<PlacesFetch>, Parameters<PlacesFetch>>()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(invalidJsonResponse);
    const provider = createGoongPlacesProvider({
      apiKey: 'test-rest-key',
      fetchImplementation,
    });

    await expect(provider.autocomplete({ query: 'Bến Thành' })).rejects.toMatchObject({
      code: 'OFFLINE',
    });
    await expect(provider.autocomplete({ query: 'Bến Thành' })).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
  });

  it('maps quota/configuration failures without exposing key, query, or provider payload', async () => {
    const secretKey = 'do-not-leak-this-key';
    const secretQuery = 'private passenger address';
    const fetchImplementation = jest.fn<ReturnType<PlacesFetch>, Parameters<PlacesFetch>>()
      .mockResolvedValueOnce(jsonResponse({ error: secretKey }, 429))
      .mockResolvedValueOnce(jsonResponse({ error: secretQuery }, 401));
    const provider = createGoongPlacesProvider({
      apiKey: secretKey,
      fetchImplementation,
    });

    let quotaError: unknown;
    try {
      await provider.autocomplete({ query: secretQuery });
    } catch (error) {
      quotaError = error;
    }
    const typedQuotaError = quotaError as Error & { code?: string };
    expect(typedQuotaError.code).toBe('QUOTA');
    expect(`${typedQuotaError.name}: ${typedQuotaError.message}`).not.toContain(secretKey);
    expect(`${typedQuotaError.name}: ${typedQuotaError.message}`).not.toContain(secretQuery);

    let configurationError: unknown;
    try {
      await provider.autocomplete({ query: secretQuery });
    } catch (error) {
      configurationError = error;
    }
    const typedConfigurationError = configurationError as Error & { code?: string };
    expect(typedConfigurationError.code).toBe('CONFIGURATION');
    expect(`${typedConfigurationError.name}: ${typedConfigurationError.message}`)
      .not.toContain(secretKey);
    expect(`${typedConfigurationError.name}: ${typedConfigurationError.message}`)
      .not.toContain(secretQuery);
  });

  it('fails closed before transport when the REST API key is absent', async () => {
    const fetchImplementation = jest.fn<ReturnType<PlacesFetch>, Parameters<PlacesFetch>>();
    const provider = createGoongPlacesProvider({
      apiKey: '  ',
      fetchImplementation,
    });

    await expect(provider.autocomplete({ query: 'Bến Thành' })).rejects.toMatchObject({
      code: 'CONFIGURATION',
    });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it('links caller cancellation through an adapter-owned AbortController', async () => {
    const fetchImplementation: PlacesFetch = jest.fn((_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const error = new Error('transport aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }));
    const provider = createGoongPlacesProvider({
      apiKey: 'test-rest-key',
      fetchImplementation,
    });
    const callerController = new AbortController();
    const request = provider.autocomplete(
      { query: 'Bến Thành' },
      { signal: callerController.signal },
    );

    const adapterSignal = (fetchImplementation as jest.Mock).mock.calls[0][1].signal;
    expect(adapterSignal).not.toBe(callerController.signal);
    expect(adapterSignal.aborted).toBe(false);
    callerController.abort();

    await expect(request).rejects.toMatchObject({ code: 'ABORTED' });
    expect(adapterSignal.aborted).toBe(true);
  });

  it('maps adapter timeouts to the locked UNAVAILABLE error', async () => {
    jest.useFakeTimers();
    try {
      const fetchImplementation: PlacesFetch = jest.fn((_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const error = new Error('transport aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }));
      const provider = createGoongPlacesProvider({
        apiKey: 'test-rest-key',
        fetchImplementation,
        requestTimeoutMs: 25,
      });
      const request = provider.autocomplete({ query: 'Bến Thành' });
      const capturedError = request.catch(error => error as unknown);

      jest.advanceTimersByTime(25);
      await expect(capturedError).resolves.toMatchObject({ code: 'UNAVAILABLE' });
    } finally {
      jest.useRealTimers();
    }
  });
});
