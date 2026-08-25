# Goong Places setup

VietRide Passenger uses Goong Places REST API V2 for Shuttle pickup/drop-off
address search. Ticket, Parcel, and Shuttle tracking maps continue to use the
existing Mapbox renderer. Device location (`expo-location`), live Socket.IO
tracking, Firebase, and Google Login are separate concerns and remain unchanged.

## Required Mobile configuration

Create a dedicated Goong REST API key and configure both public variables:

```env
EXPO_PUBLIC_GOONG_PLACES_ENABLED=true
EXPO_PUBLIC_GOONG_API_KEY=YOUR_GOONG_API_KEY
```

`EXPO_PUBLIC_*` values are embedded in the Mobile bundle and are observable by
a determined user. The Goong key must therefore be least privilege, monitored,
and protected with the restrictions and quotas available for the Goong project.
It must never be described as a server secret.

Production and `production-apk` builds fail closed unless the enabled flag is
exactly `true` and the key is non-empty and non-placeholder. The key is read by
application code through static `process.env.EXPO_PUBLIC_GOONG_API_KEY` access;
`app.config.js` embeds only the credential-free
`extra.serviceCapabilities.goongPlaces` boolean. Never copy the key into Expo
`extra`, logs, crash breadcrumbs, screenshots, or error messages.

Goong has separate Maptiles and REST API key types. This app currently needs the
REST API key only because map rendering remains on Mapbox.

URL or IP restrictions do not provide reliable native-app identity protection.
Treat the direct Mobile key as observable, combine every restriction Goong can
enforce with quotas and monitoring, and never rely on URL/IP allowlists alone.

## Local development

1. Copy the two Goong variables from `.env.example` into the untracked `.env`.
2. Use a real development Goong REST key; placeholder values intentionally keep
   Places disabled.
3. Restart Metro after changing an `EXPO_PUBLIC_*` value.
4. Rebuild the development client once after pulling the Google native module
   cleanup, because native dependencies and `app.config.js` changed.

Expo Go is still not the supported runtime for this project because it uses
other custom/native dependencies such as Nitro Google Sign-In, Firebase
Messaging, Notifee, and Mapbox.

## EAS environments

Configure `EXPO_PUBLIC_GOONG_PLACES_ENABLED=true` and a dedicated
`EXPO_PUBLIC_GOONG_API_KEY` in every EAS environment that should support Shuttle
address search. Production profiles require them at config evaluation time.

Continue configuring these unrelated values as before:

- `EXPO_PUBLIC_MAPBOX_TOKEN` for tracking maps;
- Firebase Web and native client configuration for push/storage;
- Google OAuth client identifiers for Google Login;
- `GOOGLE_SERVICES_ANDROID_FILE` and `GOOGLE_SERVICE_INFO_PLIST` file variables.

Do not restore the old native Google map/places keys or their production
eligibility flag; the Google Maps/Places native integration has been removed.

## Quota validation and rollout

Before production rollout, run an internal preview for seven consecutive days
with representative Shuttle address-search usage. Record daily request count,
peak requests per day, provider errors, timeouts, empty results, and selection
success rate.

After preview:

1. Set the production daily hard cap to the greater of Goong's provider default
   and two times the highest preview request count observed in one day.
2. Set the monthly cap to 30 times that daily cap.
3. Configure usage alerts at 50%, 75%, and 90% of both caps.
4. Stop the release if Goong cannot confirm and enforce the required hard cap;
   monitoring or a soft alert alone is not sufficient approval.

Roll out one build progressively to 10%, then 50%, then 100% of production
users. Hold every stage for at least 24 hours and advance only when request
volume, quota headroom, provider errors/timeouts, empty-result rate, and
selection success stay within the accepted preview baseline.

Because the key is called directly from Mobile, incident response is:

1. revoke the affected Goong key immediately;
2. let Places fail closed with its existing unavailable/error state—do not
   silently fall back to Google or another unapproved provider;
3. create a new dedicated key and ship it through a new Mobile build;
4. resume the 10% → 50% → 100% rollout gates for the rotated build.

## Verification

Before shipping:

1. Run the config unit tests and TypeScript/lint gates.
2. Evaluate Expo public config with a non-production test environment and verify
   `extra.serviceCapabilities.goongPlaces` is the expected boolean and no Goong
   key appears in `extra`.
3. Build and install a fresh Android dev client/APK after the native cleanup.
4. Test Vietnamese diacritics, street/landmark searches, empty results, offline
   behavior, stale-query protection, and selection-to-coordinate resolution.
5. Regression-test Shuttle booking, Ticket/Parcel/Shuttle tracking, Mapbox map
   load, location permission, Firebase push, and Google Login.

Official references:

- Goong REST API V2: https://help.goong.io/kb/rest-api-v2/
- Goong Autocomplete V2: https://help.goong.io/kb/rest-api-v2/autocomplete-rest-api-v2/autocomplete-v2/
- Goong Place Detail V2: https://help.goong.io/kb/rest-api-v2/place-detail-rest-api-v2/place-detail-place-detail-v2/
- Goong account and key setup: https://help.goong.io/kb/gioi-thieu-tong-quan/dang-ky-va-tao-key/dang-ky-tai-khoan-va-tao-key/
