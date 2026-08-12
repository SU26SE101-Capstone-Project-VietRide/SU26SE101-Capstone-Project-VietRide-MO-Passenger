const resolveMapboxRuntimeConfig = (environment = process.env) => {
  const publicAccessToken = environment.EXPO_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';

  if (publicAccessToken && !publicAccessToken.startsWith('pk.')) {
    throw new Error(
      '[Mapbox] EXPO_PUBLIC_MAPBOX_TOKEN must be a public pk.* token. Never expose an sk.* token to Mobile.',
    );
  }

  return {
    enabled: publicAccessToken.length > 0,
  };
};

module.exports = {
  resolveMapboxRuntimeConfig,
};
