const {
  isProductionBuild,
  resolveGoongPlacesRuntimeConfig,
} = require('./goongConfig');

describe('resolveGoongPlacesRuntimeConfig', () => {
  it.each([
    [{ EXPO_PUBLIC_APP_ENV: 'production' }],
    [{ EAS_BUILD_PROFILE: 'production' }],
    [{ EAS_BUILD_PROFILE: 'production-apk' }],
  ])('recognizes production build semantics for %p', environment => {
    expect(isProductionBuild(environment)).toBe(true);
  });

  it('enables Goong Places only with an explicit flag and usable public key', () => {
    expect(
      resolveGoongPlacesRuntimeConfig({
        EXPO_PUBLIC_GOONG_PLACES_ENABLED: 'true',
        EXPO_PUBLIC_GOONG_API_KEY: 'goong-mobile-api-key',
      }),
    ).toEqual({ enabled: true });
  });

  it.each([
    '',
    'YOUR_GOONG_API_KEY',
    '<GOONG_REST_API_KEY>',
    'TEST_KEY_FOR_LOCAL_BUILD',
    'placeholder-key',
  ])('keeps non-production Places disabled for unusable key %p', apiKey => {
    expect(
      resolveGoongPlacesRuntimeConfig({
        EXPO_PUBLIC_GOONG_PLACES_ENABLED: 'true',
        EXPO_PUBLIC_GOONG_API_KEY: apiKey,
      }),
    ).toEqual({ enabled: false });
  });

  it('does not enable Places when the flag is not exactly true', () => {
    expect(
      resolveGoongPlacesRuntimeConfig({
        EXPO_PUBLIC_GOONG_PLACES_ENABLED: 'TRUE',
        EXPO_PUBLIC_GOONG_API_KEY: 'goong-mobile-api-key',
      }),
    ).toEqual({ enabled: false });
  });

  it('fails a production build when Places is not explicitly enabled', () => {
    expect(() =>
      resolveGoongPlacesRuntimeConfig(
        {
          EXPO_PUBLIC_GOONG_PLACES_ENABLED: 'false',
          EXPO_PUBLIC_GOONG_API_KEY: 'goong-mobile-api-key',
        },
        { productionRequired: true },
      ),
    ).toThrow('EXPO_PUBLIC_GOONG_PLACES_ENABLED must be exactly "true"');
  });

  it.each(['YOUR_GOONG_API_KEY', '<GOONG_REST_API_KEY>'])(
    'fails a production build for public API key placeholder %p',
    apiKey => {
      expect(() =>
        resolveGoongPlacesRuntimeConfig(
          {
            EXPO_PUBLIC_GOONG_PLACES_ENABLED: 'true',
            EXPO_PUBLIC_GOONG_API_KEY: apiKey,
          },
          { productionRequired: true },
        ),
      ).toThrow('EXPO_PUBLIC_GOONG_API_KEY is required');
    },
  );

  it('never returns the public API key', () => {
    const result = resolveGoongPlacesRuntimeConfig({
      EXPO_PUBLIC_GOONG_PLACES_ENABLED: 'true',
      EXPO_PUBLIC_GOONG_API_KEY: 'goong-mobile-api-key',
    });

    expect(result).toEqual({ enabled: true });
    expect(result).not.toHaveProperty('apiKey');
  });
});
