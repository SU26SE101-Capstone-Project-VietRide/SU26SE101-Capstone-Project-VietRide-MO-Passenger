const PLACEHOLDER_PATTERNS = ['YOUR_', 'PLACEHOLDER', 'TEST_', '<', '>'];

const hasUsablePublicApiKey = value => {
  const normalized = value?.trim() ?? '';
  const upper = normalized.toUpperCase();

  return (
    normalized.length > 0 &&
    !PLACEHOLDER_PATTERNS.some(pattern => upper.includes(pattern))
  );
};

const isProductionBuild = (environment = process.env) =>
  environment.EXPO_PUBLIC_APP_ENV === 'production' ||
  environment.EAS_BUILD_PROFILE === 'production' ||
  environment.EAS_BUILD_PROFILE === 'production-apk';

const resolveGoongPlacesRuntimeConfig = (
  environment = process.env,
  options = {},
) => {
  const requested = environment.EXPO_PUBLIC_GOONG_PLACES_ENABLED === 'true';
  const hasApiKey = hasUsablePublicApiKey(
    environment.EXPO_PUBLIC_GOONG_API_KEY,
  );

  if (options.productionRequired && !requested) {
    throw new Error(
      '[Goong] EXPO_PUBLIC_GOONG_PLACES_ENABLED must be exactly "true" for production builds.',
    );
  }

  if (options.productionRequired && !hasApiKey) {
    throw new Error(
      '[Goong] EXPO_PUBLIC_GOONG_API_KEY is required for production Places search.',
    );
  }

  // Never return or embed the key. Expo public variables are observable in the
  // client bundle; this helper exposes only a credential-free capability flag.
  return {
    enabled: requested && hasApiKey,
  };
};

module.exports = {
  isProductionBuild,
  resolveGoongPlacesRuntimeConfig,
};
