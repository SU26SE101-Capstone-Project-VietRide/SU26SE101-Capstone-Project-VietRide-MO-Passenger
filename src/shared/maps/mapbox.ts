import Mapbox from '@rnmapbox/maps';

// Public pk.* tokens are designed to ship with Mobile apps. Secret sk.*
// download/admin tokens must stay in local or EAS native-build credentials.
const publicAccessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim();

let readyPromise: Promise<boolean> | null = null;

const hasPublicToken = (): boolean =>
  Boolean(publicAccessToken?.startsWith('pk.'));

/**
 * MapView crashes natively if it mounts before setAccessToken resolves —
 * common on the first tracking open in an Expo development client.
 */
export function ensureMapboxReady(): Promise<boolean> {
  if (readyPromise) {
    return readyPromise;
  }

  if (!hasPublicToken() || !publicAccessToken) {
    readyPromise = Promise.resolve(false);
    return readyPromise;
  }

  readyPromise = Mapbox.setAccessToken(publicAccessToken)
    .then(() => {
      Mapbox.setTelemetryEnabled(false);
      return true;
    })
    .catch(() => false);

  return readyPromise;
}

export function preloadMapbox(): void {
  ensureMapboxReady().catch(() => false);
}

export default Mapbox;
