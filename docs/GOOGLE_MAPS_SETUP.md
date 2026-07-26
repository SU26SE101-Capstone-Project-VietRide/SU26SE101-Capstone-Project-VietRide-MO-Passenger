# Google Maps native setup

Cloud project: `vietride-204c0`

## Architecture and product scope

Ticket and Parcel tracking reuse one React Native map component. Google Maps is
used only as the native basemap through these products:

- Maps SDK for Android.
- Maps SDK for iOS.

The travelled trail, current vehicle position, stops and ETA come from VietRide's
authenticated Tracking REST/Socket.IO contracts. The passenger app does not call
Routes, Directions, Places, Geocoding, Traffic, Roads, Fleet Engine or the
Consumer SDK. It also does not request the passenger's location for live trip
tracking. A Map ID and Cloud-based map style are intentionally not required.

## Regional production gate

The official Google Maps Platform Prohibited Territories page currently lists
Vietnam. VietRide targets Vietnam, so the repository defaults to:

```text
GOOGLE_MAPS_PRODUCTION_ELIGIBLE=false
```

Production builds therefore omit Google Maps credentials and native
initialization and show the app's explicit map-unavailable state. This is a
fail-closed release guard, not a workaround for the Terms.

Set `GOOGLE_MAPS_PRODUCTION_ELIGIBLE=true` only after receiving documented
confirmation from Google and qualified legal review that the specific billing,
distribution and service footprint is eligible and does not distribute, market
or make Google Maps Platform functionality available in a prohibited territory.
An eligible production target then also requires its platform-specific key.

Review the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?sign=1&utm_campaign=gmp_git_agentskills_v1)
and [Prohibited Territories](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories?hl=en&utm_campaign=gmp_git_agentskills_v1)
again immediately before every production release because these rules can
change. This repository flag cannot waive or reinterpret those terms.

## Cloud Console

Only after the regional gate is cleared:

1. Confirm billing is linked to the project.
2. Enable [Maps SDK for Android](https://console.cloud.google.com/apis/library/maps-android-backend.googleapis.com?project=vietride-204c0).
3. Enable [Maps SDK for iOS](https://console.cloud.google.com/apis/library/maps-ios-backend.googleapis.com?project=vietride-204c0).
4. Create separate platform keys in [Credentials](https://console.cloud.google.com/apis/credentials?project=vietride-204c0).

Restrict the Android key to:

- Android application `com.vietride.passenger`.
- Every signing certificate SHA-1 used to distribute a build. The repository
  debug certificate SHA-1 is
  `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`; never use it
  as the production signing identity.
- API restriction: Maps SDK for Android only.

Restrict the iOS key to:

- Bundle identifier `com.vietride.passenger`.
- API restriction: Maps SDK for iOS only.

The release SHA-1 must come from the actual EAS/Play signing certificate. Do not
substitute the App Links SHA-256 fingerprint. Follow Google's
[API key restriction guidance](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentskills_v1)
and [API security best practices](https://developers.google.com/maps/api-security-best-practices?utm_campaign=gmp_git_agentskills_v1).

## Build secrets and native integration

Never put an Android Maps key in `AndroidManifest.xml`, `app.config.js`, or any
tracked file. The manifest contains only the Gradle placeholder
`${GOOGLE_MAPS_ANDROID_API_KEY}`.

For a local Android build, put the rotated key in the ignored
`android/local.properties` file:

```text
GOOGLE_MAPS_ANDROID_API_KEY=...
```

CI may instead provide the same value as a protected environment variable or a
Gradle `-PGOOGLE_MAPS_ANDROID_API_KEY=...` property. Expo prebuild still needs a
key-enabled build environment to retain the native Maps integration; do not
commit that environment file. Keep the remaining build flags in that protected
environment:

```text
GOOGLE_MAPS_ANDROID_API_KEY=...
GOOGLE_MAPS_IOS_API_KEY=...
GOOGLE_MAPS_PRODUCTION_ELIGIBLE=false
```

Never prefix credentials with `EXPO_PUBLIC_`, paste them into logs/chat, or
commit them. `app.config.js` exposes only non-secret availability booleans so the
UI can fail closed. A production build that provides a key while eligibility is
false fails configuration instead of silently embedding it.

The Expo config plugin:

- Adds Maps SDK for Android `19.2.0`, selects the latest renderer and registers
  internal usage attribution `gmp_git_agentskills_v1` only for a key-enabled
  Android build.
- Adds the `react-native-google-maps` pod, initializes `GMSServices`, registers
  the same usage attribution and declares the SDK's documented iOS URL schemes
  only for a key-enabled iOS build.
- Removes stale native key/configuration entries when the build is ineligible or
  a platform key is absent.

After changing a key, eligibility or native map configuration, create a new
native binary. An OTA JavaScript update cannot change native credentials or SDK
initialization. Expo Go is not the release verification target for key-restricted
native Maps configuration.

References: [Android SDK setup](https://developers.google.com/maps/documentation/android-sdk/start?utm_campaign=gmp_git_agentskills_v1),
[Android MapsApiSettings](https://developers.google.com/android/reference/com/google/android/gms/maps/MapsApiSettings?utm_campaign=gmp_git_agentskills_v1),
[Android renderer](https://developers.google.com/maps/documentation/android-sdk/renderer?utm_campaign=gmp_git_agentskills_v1), and
[iOS SDK configuration](https://developers.google.com/maps/documentation/ios-sdk/config?utm_campaign=gmp_git_agentskills_v1).

## UX, performance and data handling

- The SDK's Google logo and legal attribution must stay visible and unobscured.
- The map fits the known trail/stops once after native readiness, then follows
  the vehicle with bounded camera animation. A user pan or pinch disables follow
  mode until the explicit Follow bus control is pressed.
- Trail points are validated, deduplicated and capped before render. Markers use
  `tracksViewChanges={false}` and static memoized inputs to avoid per-frame React
  work. The route is a two-layer native polyline for contrast, not a remotely
  computed route.
- Buildings, POIs, traffic, indoor UI, pitch, rotation, native toolbar and the
  user-location layer are disabled because they do not serve this tracking flow.
- Tracking coordinates remain VietRide backend data. Do not send them to a new
  Google API or persist precise passenger/device location without a separately
  reviewed product requirement and privacy disclosure.

Google Maps SDKs may collect diagnostic and usage information independently of
the route data supplied by the app. Store privacy declarations and Google SDK
disclosures must be reviewed before an eligible release. See the
[Android policies and attribution requirements](https://developers.google.com/maps/documentation/android-sdk/policies?utm_campaign=gmp_git_agentskills_v1)
and [iOS SDK overview/legal notices](https://developers.google.com/maps/documentation/ios-sdk/overview?utm_campaign=gmp_git_agentskills_v1).

## Release checklist

- [ ] Regional/Terms eligibility is documented; only then set the production
      eligibility flag to `true`.
- [ ] Billing and only the two required Maps SDK APIs are enabled.
- [ ] Android and iOS use separate, application- and API-restricted keys.
- [ ] Release SHA-1 and iOS bundle ID restrictions match the actual artifacts.
- [ ] A fresh native binary is built; no placeholder or unrestricted key exists.
- [ ] Authenticated Ticket and Parcel tracking are smoked on physical Android
      and iOS, including pan/pinch/follow, background/foreground and terminal trips.
- [ ] Google attribution remains visible at all text sizes and screen sizes.
- [ ] iOS open-source license/legal notices and both stores' privacy disclosures
      are present and reviewed.
- [ ] Billing budgets/alerts are configured and expected usage is monitored.

Usage of Google Maps Platform products and services may incur costs against your Google Cloud project billing account.

Only code snippets explicitly copied or adapted from Google Maps Platform
documentation or the agent-skill reference are within those sources' Apache 2.0
license scope. Google Maps data/services and VietRide application code are not
relicensed by that scope.
