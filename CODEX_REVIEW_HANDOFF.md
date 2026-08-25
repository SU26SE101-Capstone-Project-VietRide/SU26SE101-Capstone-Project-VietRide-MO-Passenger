# Codex Review Handoff — Passenger Goong Places + Responsive Splash

## Scope delivered

This change migrates Passenger Mobile address search from native Google Places to Goong REST API V2 while preserving the existing UI, navigation, Shuttle business rules, store shape, Backend payloads, RNMapbox tracking maps, GPS, Socket.IO, Google Sign-In, Firebase/FCM, and `expo-location`.

The follow-up Splash redesign replaces the fixed, overflow-hidden bootstrap layout with an adaptive safe-area/ScrollView brand stack and gives both Expo/iOS prebuild and committed Android density resources a padded launch mark. It changes no bootstrap timing, translations, authentication, navigation, or business behavior.

Backend code and public contracts were not changed. Deferred Backend work and the accepted direct-mobile-key risk are recorded in `BE-GAPS.md`. The existing untracked `vietride-goong-skills/` directory was read as source material and was not modified.

## Skills and implementation choices

| Skill | How it affected this change |
|---|---|
| `brainstorming` | The user's approved plans were treated as locked design and scope boundaries; the Splash Adaptive Brand Stack was recorded before implementation. |
| `vietride-session-workflow` | Required cross-repository evidence, `BE-GAPS.md`, independent review, explicit verification, and this handoff. |
| `native-data-fetching` | Drove the `fetch` adapter boundary, abort/timeout handling, typed error mapping, stale-request protection, and response normalization. |
| `react-native-skills` / `vercel-react-native-skills` | Preserved the screen hierarchy and existing native rendering path while moving provider behavior behind a hook. |
| `building-native-ui` | Kept layout, spacing, typography, accessibility, keyboard behavior, loading/empty/error behavior, and navigation interactions unchanged. |
| `frontend-design` | Kept the existing driver mark and restrained teal atmosphere as the single signature element instead of introducing unrelated launch decoration or copy. |

## Change map

- `src/shared/places/`
  - Adds provider-neutral `PlacesProvider`, normalized types, stable error taxonomy, Goong V2 adapter, and `usePlacesSearch` cancellation/stale guards.
  - Autocomplete sends `input`, station `location=lat,lng`, `radius=10`, `limit=5`, and `more_compound=true`.
  - Place Detail rejects absent or invalid geometry; raw Goong responses and transport errors do not escape the adapter.
- `src/features/booking/screens/ShuttlePlacesAddressPickerScreen.tsx`
  - Keeps the existing rendered structure and behavior while replacing the native Google session facade with Goong search/detail.
  - Keeps 280 ms debounce, minimum 3 characters, maximum 5 suggestions, and the existing 10 km Shuttle precheck.
  - Query changes, clear, back, and unmount cancel/invalidate pending search and Place Detail requests. A stale detail cannot save or navigate even if the transport ignores abort.
- `config/goongConfig.js`, `app.config.js`, `.env.example`
  - Add `EXPO_PUBLIC_GOONG_API_KEY` and exact-true `EXPO_PUBLIC_GOONG_PLACES_ENABLED` semantics.
  - Production builds fail closed for disabled, missing, blank, test, or placeholder keys, including angle-bracket placeholders.
  - Only a boolean capability enters Expo `extra`; the API key is never copied into config output.
- Native cleanup
  - Removes the retired Google map package, local Places native module, config plugin, Android SDK dependency, manifest metadata, Gradle key plumbing, and native Maps initialization.
  - Removes the now-unused ignored local Google map environment/property entries without exposing their values. Provider-side credential revocation remains deferred until replacement rollout succeeds.
  - Retains RNMapbox, Firebase/FCM, Google Sign-In, `expo-location`, and Socket.IO.
- Documentation
  - Replaces the Google Maps setup guide with `docs/GOONG_PLACES_SETUP.md`.
  - Documents public-key residual risk, environment separation, preview measurement, quota/cap gates, alert thresholds, fail-closed rotation, staged rollout, and delayed Google-key revocation.
- Responsive Splash
  - `src/shared/components/AppLaunchScreen.tsx` now uses a safe-area `ScrollView`; copy has no line cap, compact/large-text progress stacks vertically, and bounded logo/gap geometry responds to width, usable height, insets, and font scale.
  - `src/shared/layout/appLaunchLayout.ts` centralizes deterministic compact/regular/large geometry and is covered down to 320×480 at font scale 2.0 plus large tablet cases.
  - Expo splash config and all five committed Android density assets use `app_icon_adaptive_foreground.png`, whose transparent safe zone protects the raster wordmark.
  - `scripts/generate-app-icons.py` uses a pinned Pillow toolchain from `scripts/requirements-icons.txt`; pixel hashes and alpha bounds prevent generated Splash drift. Launcher and notification assets remain byte-unchanged.
  - The approved design is recorded in `docs/superpowers/specs/2026-08-25-responsive-app-launch-screen-design.md`.

## Contract and UI invariants

- Store/Backend data remains `{ address, latitude, longitude }`; `placeId` and `provider` are never persisted or sent.
- No API route, database field, Socket.IO event, ETA field, fare rule, or Shuttle eligibility rule changed.
- RNMapbox map canvases, styles, tracking, pan/follow behavior, route geometry, and Mapbox credentials remain untouched.
- The picker component tree and style definitions remain unchanged. The only required visible provider copy changes from Google attribution to Goong attribution.

## Automated verification

- `npm ci`: passed.
- Final full Jest after both changes: 171 suites, 965 tests passed, 0 snapshots.
- Independent post-review Places/picker rerun: 4 suites, 25 tests passed, including pending-detail → clear → stale-detail resolution with no store write/navigation.
- Goong/config targeted Jest: 2 suites, 17 tests passed; production flag/key gate, serialization, normalization, abort/stale handling, error mapping, and redaction are covered by the combined focused suites.
- Final `npx tsc --noEmit`: passed.
- Final `npm run lint`: passed.
- `npm run check:i18n`: passed with 1,873 EN/VI keys in parity.
- Focused Splash gate: 3 suites, 20 tests passed. It covers 320/360/390/430 width geometry, short height, safe-area pressure, font scales 1.4/2.0, complete VI/EN copy, compact column progress, large dark tablet layout, status-bar theme, alpha margins, and deterministic density pixels.
- The pinned icon generator was rerun twice; only the five intended `splashscreen_logo.png` density files differ from baseline. Source and generated marks retain at least 10% transparent margin (actual mdpi–xxxhdpi margins: 23–95 px).
- Android `:app:processDebugResources`: passed (320 tasks), proving the regenerated Splash resources package successfully.
- Sanitized Expo public config: Goong capability present, Goong key absent, Mapbox plugin retained.
- Expo Doctor: 16/17 checks passed. The remaining React Native Directory metadata warning concerns existing packages (`react-native-responsive-fontsize`, `@react-native/new-app-screen`, `expo-doctor`, `firebase`, and `socket.io-client`) and is not caused by this migration.
- Android arm64 `:app:assembleDebug` with Android Studio JBR 21: passed (661 tasks, 9m47s) from an identical temporary short-path copy because Ninja rejects the repository's physical Windows path at 260 characters. The temporary copy and drive mapping were removed afterward.
- Fresh APK evidence before temporary cleanup: 111,215,038 bytes, SHA-256 `5707A99D3EE171712F47F20EEF3573C17E95B5BD501CAC72846153C48DB48D96`.
- Exact scan of the fresh merged manifest and generated autolinking output found zero retired Google Maps/Places SDK, metadata, package, module, or key-plumbing identifiers. Mapbox/Firebase/Google Sign-In entries remain as intended.
- A final repository-wide exact scan (excluding the read-only `vietride-goong-skills/` source pack and historical `artifacts/`) found zero retired Google Maps/Places identifiers after stale ignored Expo/Kotlin/native-module build logs and caches were removed.

## Manual and release gates still required

These require real provider/account/device state and were intentionally not fabricated:

- Configure separate development, preview, and production Goong REST keys; do not reuse a Maptiles or Backend key.
- Run the seven-day preview, calculate the production daily/monthly caps from measured peak traffic, configure 50/75/90% alerts, and stop production if Goong cannot confirm a hard cap.
- Smoke-test Vietnamese diacritics, street names, and landmarks in Ho Chi Minh City and Hanoi on Android dev-client and iOS TestFlight.
- Compare before/after screenshots on the same device, theme, and font scale; cover Shuttle pickup/drop-off plus Ticket/Parcel/Shuttle tracking, dark/light maps, pan/follow, Google Login, and FCM.
- Smoke the native-to-React Splash handoff on a small Android device and iOS TestFlight, including Vietnamese/English, light/dark, a short viewport, and large accessibility text. Automated layout/resource gates cannot replace a real-device screenshot check.
- Complete EAS preview builds for Android and iOS, then release 10% → 50% → 100% with 24 hours at each stage.
- Revoke retired Google Maps/Places credentials only after the replacement binaries pass smoke testing and rollout completes. If the public Goong key is abused, revoke it immediately so search fails closed and rotate it in a new binary.

## Review focus and known risks

- Verify Goong request query serialization and the documented `radius` conversion at the adapter boundary.
- Verify every provider error is normalized/redacted and no URL, query string, API key, raw JSON, or Axios/fetch error reaches UI or telemetry.
- Verify clear/query/back/unmount invalidates pending detail as well as autocomplete.
- Verify production config rejects the exact placeholders shown in setup documentation and never serializes the key.
- Verify the tracked native dependency graph and generated Android manifest contain no Google Maps/Places SDK residue.
- Verify Splash copy stays complete and scrollable at large font scales, the wordmark remains inside native platform masks, and no artificial launch delay was introduced.
- Direct mobile REST embeds an observable credential; this accepted residual risk remains `BLOCKED_BE_SECURITY` until a separately authorized Backend proxy exists.
- Trip/Tracking Google Routes and Operator `googlePlaceId` remain deferred under `BLOCKED_BE_GOOGLE_ROUTES` and `BLOCKED_BE_PLACE_ID`; this change must not be described as making the entire VietRide system Google-free.

## Independent review

The first independent pass found two P1 issues: stale Place Detail could win after clear, and the documented angle-bracket key placeholder passed the production gate. Both were fixed with regression coverage. The final independent read-only re-review passed with no remaining actionable findings; its focused rerun passed 4 suites / 25 tests and `git diff --check`.

The Splash review initially requested stronger alpha/reproducibility and pressured-layout evidence. Source/density alpha bounds, pinned-generator pixel hashes, complete compact Vietnamese copy, large dark tablet rendering, and fresh gate evidence were added. The final independent re-review returned **APPROVE** with no blocker, should-fix, or nit findings.

No commit, push, release, key revocation, or Backend mutation was performed.
