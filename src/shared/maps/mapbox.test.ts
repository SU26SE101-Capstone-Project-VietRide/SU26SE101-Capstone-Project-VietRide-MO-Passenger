const mockSetAccessToken = jest.fn(async (_token: string) => 'pk.test');
const mockSetTelemetryEnabled = jest.fn((_enabled: boolean) => undefined);

jest.mock('@rnmapbox/maps', () => ({
  __esModule: true,
  default: {
    setAccessToken: (token: string) => mockSetAccessToken(token),
    setTelemetryEnabled: (enabled: boolean) => (
      mockSetTelemetryEnabled(enabled)
    ),
  },
}));

describe('ensureMapboxReady', () => {
  const originalToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

  afterEach(() => {
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = originalToken;
    jest.resetModules();
    mockSetAccessToken.mockClear();
    mockSetTelemetryEnabled.mockClear();
  });

  it('waits for setAccessToken before reporting ready', async () => {
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = 'pk.live-token';
    jest.resetModules();
    mockSetAccessToken.mockResolvedValueOnce('pk.live-token');

    const { ensureMapboxReady } = require('./mapbox') as typeof import('./mapbox');
    const first = ensureMapboxReady();
    const second = ensureMapboxReady();

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
    expect(mockSetAccessToken).toHaveBeenCalledTimes(1);
    expect(mockSetAccessToken).toHaveBeenCalledWith('pk.live-token');
    expect(mockSetTelemetryEnabled).toHaveBeenCalledWith(false);
  });
});
