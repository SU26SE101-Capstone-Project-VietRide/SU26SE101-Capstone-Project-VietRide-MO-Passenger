# Firebase avatar upload and Google Sign-In setup

This mobile app never contains a Google client secret, Firebase Admin key, or
VietRide refresh token outside SecureStore. Google only returns an ID token to
the device; the Identity service validates it and creates the VietRide session.
Firebase is used only with a short-lived custom token minted by the backend.

## Runtime flows

```text
Google button -> native Google SDK -> Google ID token -> POST /auth/google
              -> VietRide access/refresh tokens -> SecureStore

Avatar picker -> normalize locally to JPEG -> POST /firebase/custom-token
              -> temporary Firebase auth -> Storage upload -> PATCH /users/me/avatar
```

The app queues Firebase uploads because Firebase auth is intentionally
in-memory and is cleared after each upload. The BE response `uploadPath` is a
prefix such as `avatars/{userId}/`; the client appends a generated UUID-v4
filename before writing. Never change that to a public unrestricted path.

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select
   the VietRide project.
2. In **Google Auth Platform**, complete Branding, Audience and Contact
   information. While the app is in Testing, add every developer/tester in
   **Audience > Test users**.
3. Keep Data Access to the minimum profile/email/OpenID permissions. VietRide
   does not request Drive, Calendar, Gmail, or offline access.
4. Create a **Web application** OAuth client. Put its client ID in both:
   - Mobile: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
   - Identity BE: `GOOGLE_OAUTH_CLIENT_ID`.
   These IDs must be identical because the BE validates the ID token audience.
5. Create an **Android** OAuth client with package
   `com.vietride.passenger`. Register the SHA-1 for every signing identity
   that will run the app: local debug, EAS development/preview/production, and
   Google Play App Signing when Play distribution is enabled.
6. Create an **iOS** OAuth client with bundle ID
   `com.vietride.passenger`. Copy its `REVERSED_CLIENT_ID` value into
   `EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID`.

The Android/iOS client IDs identify native builds. They are not substitutes for
the Web client ID sent to the backend.

## 2. Firebase Console

1. Use the intended Firebase project for each environment and register the Web
   app used by the Firebase JavaScript SDK.
2. Copy the public Web configuration into the `EXPO_PUBLIC_FIREBASE_*`
   variables below. Firebase API keys are identifiers, not server secrets;
   still restrict them in Google Cloud to the project and expected app origins
   where applicable.
3. Configure Firebase Storage rules to require authenticated custom-token
   claims and permit only the exact allowed folder/purpose. The backend remains
   the authority that mints the custom token. Do not enable broad anonymous or
   public writes.
4. Keep the Firebase Admin SDK/service-account credential exclusively on the
   backend. Avatar upload still does not need native Firebase files. System
   push notifications do require the public native client files, but they are
   injected locally/EAS and ignored by Git. See `PUSH_NOTIFICATIONS_SETUP.md`.
   Never place an Admin JSON file in this repository or in an app build.

## 3. Mobile environment

Copy `.env.example` to `.env` locally and replace the placeholders:

```dotenv
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID=com.googleusercontent.apps.YOUR_IOS_CLIENT_ID
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
EXPO_PUBLIC_FIREBASE_WEB_STORAGE_BUCKET=YOUR_PROJECT_ID.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

`app.config.js` fails a staging/production config evaluation when any required
Google/Firebase value is absent. The Google native config plugin is added only
when the iOS reversed client ID is present; this keeps an unconfigured local
checkout launchable while making the Google button report a clear setup error.

## 4. Build and run

Google Sign-In uses a native Nitro module, so Expo Go cannot run this feature.
Use a development client:

```powershell
npx expo start --dev-client
```

For a local Android build, use a supported JDK. Expo SDK 54/React Native 0.81
does not build with the machine's Java 25 used during the original audit. The
Android Studio JDK 21 works:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
npx expo run:android
```

For cloud development builds, first log into the correct Expo account and link
the project, then run:

```powershell
eas credentials
eas build --platform android --profile development
eas build --platform ios --profile development
```

`eas.json` defines development, preview and production profiles. EAS credentials
must be configured in the EAS account before it can sign a release; no mobile
source code can create or retrieve those credentials automatically.

## 5. Verification checklist

- `npx expo install --check`
- `npx expo config --type public` with real environment values; it must list
  `react-native-nitro-google-signin` in `plugins`.
- Install a fresh dev client after any native dependency/config change.
- Test Google login with an account added as a test user when the OAuth audience
  is Testing.
- For a first-time Google user, confirm the mandatory phone screen appears,
  then confirms the profile and refreshes the VietRide JWT before opening Main.
- Pick HEIC, PNG and large camera photos; the app must normalize output before
  the Firebase upload and show the returned avatar URL after the BE PATCH.
- Test app logout/account change during an avatar upload; a stale request must
  not assign an avatar to the new account.
