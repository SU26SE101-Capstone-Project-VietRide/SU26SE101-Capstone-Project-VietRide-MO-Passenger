import Mapbox from '@rnmapbox/maps';

// Public pk.* tokens are designed to ship with Mobile apps. Secret sk.*
// download/admin tokens must stay in local or EAS native-build credentials.
const publicAccessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim();

if (publicAccessToken?.startsWith('pk.')) {
  // Run once when the shared adapter is initialized.
  // eslint-disable-next-line no-void
  void Mapbox.setAccessToken(publicAccessToken);
}

export default Mapbox;
