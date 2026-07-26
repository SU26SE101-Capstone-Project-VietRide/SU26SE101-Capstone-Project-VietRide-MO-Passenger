# Firebase and Google login implementation status

Last updated: 2026-07-26

## Status

This slice is implemented against the current backend source, but it is not
claimed as device-verified yet. The canonical tracker is
[`RECOVERY_PLAN.md`](./RECOVERY_PLAN.md), rows `M15.1` to `M15.3`.

## Implemented

- Corrected the Firebase custom-token contract to `{ token, purpose, uploadPath
  }` and treats `uploadPath` as a prefix. Every client upload now appends its
  own UUID-v4 filename instead of writing to the folder itself.
- Added a lazy Firebase client with awaited in-memory persistence, serialized
  temporary Firebase sessions, explicit sign-out, throttled progress support
  and no Firebase credential persisted in SecureStore.
- Normalized avatar images locally to JPEG, resized them to 1024px maximum and
  checks the final file is below 5 MiB. HEIC/large camera originals are not
  rejected before conversion.
- Replaced the invented avatar PATCH response with the real
  `{ userId, avatarUrl }` response and merges it only into the matching active
  account/session. Retry state retains its idempotency key for timeout/5xx
  ambiguity and temporary image files are cleaned after a definitive result.
- Wired avatar selection into Edit Profile and reused one `UserAvatar` based on
  `expo-image` across profile surfaces. The unsupported display-name PATCH is
  disabled rather than sent to a nonexistent BE endpoint.
- Replaced the outdated `GoogleSignin` calls with the current Nitro One Tap
  flow: silent attempt, account picker fallback, explicit fallback, ID token
  exchange with `/auth/google`, then the existing secure VietRide session
  storage.
- Added a mandatory phone-completion gate for authenticated users with no
  phone number. It calls the existing complete-profile endpoint and refreshes
  the VietRide JWT before Main is mounted.
- Added the Nitro config plugin when the iOS reversed client ID is available,
  Expo 54-compatible image manipulation, explicit Nitro Modules dependency,
  EAS build defaults and complete setup instructions.

## Verification evidence

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Pass |
| `npm run lint -- --max-warnings=0` | Pass |
| `npx expo install --check` | Pass; Expo SDK 54 dependency matrix is current |
| Expo config with native Google option | Pass; plugin resolves when an iOS reversed client ID is provided |
| Expo Doctor | 16/17; the only warning is that `react-native-nitro-google-signin` is not yet marked New Architecture-tested in React Native Directory |
| Android Gradle smoke | Reaches Expo/Nitro native configuration with JDK 21 and Android SDK, then fails on the existing Windows CMake long-object-path limitation in this repository path |

Jest was deliberately not run for this implementation pass, per the owner
request. Existing stale test sources were updated only to keep TypeScript
compilation valid after the BE contract correction.

## Remaining external work

1. Create/configure Web, Android and iOS OAuth clients in Google Cloud and add
   test users while the OAuth audience is Testing.
2. Fill Firebase/Google variables in `.env` or EAS environment. Never add an
   Admin SDK credential or client secret to the mobile app.
3. Build from a physically short Windows path or use EAS Build. Local builds
   must use Android Studio JDK 21 rather than system Java 25.
4. Run a real-device Google sign-in, no-phone completion, Firebase avatar
   upload and account-switch/logout smoke.

See [`FIREBASE_GOOGLE_AUTH_SETUP.md`](./FIREBASE_GOOGLE_AUTH_SETUP.md) for the
exact console and build steps.
