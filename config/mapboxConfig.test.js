const { resolveMapboxRuntimeConfig } = require('./mapboxConfig');

describe('resolveMapboxRuntimeConfig', () => {
  it('enables Mapbox only for a configured public token', () => {
    expect(resolveMapboxRuntimeConfig({
      EXPO_PUBLIC_MAPBOX_TOKEN: '  pk.mobile-public-token  ',
    })).toEqual({ enabled: true });
  });

  it('keeps Mapbox disabled when the runtime token is absent', () => {
    expect(resolveMapboxRuntimeConfig({})).toEqual({ enabled: false });
  });

  it('rejects secret tokens before Expo can embed them in Mobile', () => {
    expect(() => resolveMapboxRuntimeConfig({
      EXPO_PUBLIC_MAPBOX_TOKEN: 'sk.never-ship-this',
    })).toThrow('must be a public pk.* token');
  });
});
