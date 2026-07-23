const PLACEHOLDER_PATTERNS = ['YOUR_KEY', 'PLACEHOLDER'];

const normalizeNativeKey = (value) => {
  const normalized = value?.trim() ?? '';
  const upper = normalized.toUpperCase();
  const isPlaceholder = upper.startsWith('TEST_')
    || PLACEHOLDER_PATTERNS.some((pattern) => upper.includes(pattern));

  return normalized && !isPlaceholder ? normalized : null;
};

const resolveGoogleMapsNativeConfig = (
  environment = process.env,
  enabled = true,
) => enabled
  ? {
      androidApiKey: normalizeNativeKey(environment.GOOGLE_MAPS_ANDROID_API_KEY),
      iosApiKey: normalizeNativeKey(environment.GOOGLE_MAPS_IOS_API_KEY),
    }
  : { androidApiKey: null, iosApiKey: null };

module.exports = {
  resolveGoogleMapsNativeConfig,
};
