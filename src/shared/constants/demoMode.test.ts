jest.mock('./config', () => ({
  appConfig: { env: 'development' },
}));

import { resolveDemoMode } from './demoMode';

describe('resolveDemoMode', () => {
  it('defaults on only for development in a development bundle', () => {
    expect(resolveDemoMode({
      environment: 'development',
      flag: undefined,
      isDevelopmentBuild: true,
    })).toBe(true);
    expect(resolveDemoMode({
      environment: 'development',
      flag: undefined,
      isDevelopmentBuild: false,
    })).toBe(false);
  });

  it('supports an explicit development override', () => {
    expect(resolveDemoMode({
      environment: 'development',
      flag: 'false',
      isDevelopmentBuild: true,
    })).toBe(false);
    expect(resolveDemoMode({
      environment: 'development',
      flag: 'true',
      isDevelopmentBuild: false,
    })).toBe(true);
  });

  it('requires an explicit staging opt-in', () => {
    expect(resolveDemoMode({
      environment: 'staging',
      flag: undefined,
      isDevelopmentBuild: true,
    })).toBe(false);
    expect(resolveDemoMode({
      environment: 'staging',
      flag: 'true',
      isDevelopmentBuild: false,
    })).toBe(true);
  });

  it('cannot be enabled in production and rejects unknown environments', () => {
    expect(resolveDemoMode({
      environment: 'production',
      flag: 'true',
      isDevelopmentBuild: true,
    })).toBe(false);
    expect(resolveDemoMode({
      environment: 'preview',
      flag: 'true',
      isDevelopmentBuild: true,
    })).toBe(false);
  });
});
