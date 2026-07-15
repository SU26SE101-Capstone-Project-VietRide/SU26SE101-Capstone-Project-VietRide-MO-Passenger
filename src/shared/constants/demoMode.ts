/**
 * Controls fixture-backed screens that do not yet have a production API.
 * Local product features such as shortcuts and recent searches are not demos.
 */
import { appConfig, type Environment } from './config';

interface DemoModeOptions {
  readonly environment: Environment | string | undefined;
  readonly flag: string | undefined;
  readonly isDevelopmentBuild: boolean;
}

/** Pure policy resolver kept separate from build-time environment access. */
export const resolveDemoMode = ({
  environment,
  flag,
  isDevelopmentBuild,
}: DemoModeOptions): boolean => {
  // Production is always fail-closed; no public env override is accepted.
  if (environment === 'production') {
    return false;
  }

  if (environment === 'staging') {
    // Staging fixtures require an explicit opt-in.
    return flag === 'true';
  }

  if (environment !== 'development') {
    return false;
  }

  if (flag === 'true') {
    return true;
  }
  if (flag === 'false') {
    return false;
  }

  // Demo data defaults on only inside a development bundle.
  return isDevelopmentBuild;
};

export const isDemoMode: boolean = resolveDemoMode({
  environment: appConfig.env,
  flag: process.env.EXPO_PUBLIC_DEMO_MODE,
  isDevelopmentBuild: __DEV__,
});
