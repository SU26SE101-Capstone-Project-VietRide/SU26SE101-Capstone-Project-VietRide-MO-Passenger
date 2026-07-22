# Google Maps native setup

Cloud project: `vietride-204c0`

The tracking map uses only the native Google Maps SDK to render stop markers
and the travelled GPS trail. It does not call Directions, Routes, Geocoding or
Places from the passenger app.

## Cloud Console

1. Confirm billing is linked to the project.
2. Enable [Maps SDK for Android](https://console.cloud.google.com/apis/library/maps-android-backend.googleapis.com?project=vietride-204c0).
3. Enable [Maps SDK for iOS](https://console.cloud.google.com/apis/library/maps-ios-backend.googleapis.com?project=vietride-204c0) before shipping iOS with the Google provider.
4. Create separate keys in [Credentials](https://console.cloud.google.com/apis/credentials?project=vietride-204c0).

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

The release SHA-1 must come from the actual release/EAS/Play signing
certificate; do not substitute the App Links SHA-256 fingerprint.

## Build secrets

Inject the keys as native build environment variables:

```text
GOOGLE_MAPS_ANDROID_API_KEY=...
GOOGLE_MAPS_IOS_API_KEY=...
```

Never prefix these values with `EXPO_PUBLIC_`, paste them into chat, or commit
them. `app.config.js` exposes only non-secret availability booleans to the UI.
Production EAS builds fail when the key for their target platform is missing;
the checked-in Android Gradle build also fails closed for release tasks.

After changing either key, create a new native binary. An OTA JavaScript update
cannot change native Google Maps credentials.

References: [Android SDK setup](https://developers.google.com/maps/documentation/android-sdk/start),
[iOS SDK setup](https://developers.google.com/maps/documentation/ios-sdk/config), and
[API security best practices](https://developers.google.com/maps/api-security-best-practices).
