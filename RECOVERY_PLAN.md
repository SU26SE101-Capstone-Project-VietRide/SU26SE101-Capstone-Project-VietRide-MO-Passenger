# VietRide Passenger Recovery Tracker

> Last updated: 2026-07-22
> Mobile baseline: `650bdb4`
> UI/product recovery reference: `28cc5b7`
> Backend source of truth: `origin/main@fcccf454` (`v1.40.0`)
> Rule: backend source code and DTOs win over documentation and older mobile mocks.

## Status model

| Status | Meaning |
| --- | --- |
| `TODO` | Not started. |
| `IN_PROGRESS` | Implementation exists, but at least one acceptance gate remains. |
| `VERIFIED` | The row's complete acceptance criteria passed with recorded evidence. |
| `BLOCKED_BE` | The product capability is preserved, but BE has no safe contract. |
| `FAILED_VERIFY` | A required verification gate was attempted and did not pass. |

`DONE` is not used. `BLOCKED_ENV` is a verification-scope result, not a task status.

## Verification scope

| Scope | Result | Evidence / boundary |
| --- | --- | --- |
| `UNIT_STATIC` | `PASS` | 2026-07-22 Expo 54 snapshot: `npx.cmd tsc --noEmit`, zero-warning ESLint and `git diff --check` pass; full Jest passes 76/76 suites and 405/405 tests; clean Android export bundles 4,542 modules and exits successfully. |
| `NATIVE_ANDROID_BUILD` | `PARTIAL_PASS` | Android prebuild regenerated successfully against Expo 54/RN 0.81 while retaining payment deep links, backup restrictions, blocked-permission removals and branded assets. The last compiled APK belongs to the earlier SDK 56 snapshot; a current SDK 54 native compile/install remains required. |
| `DEVICE_ANDROID` | `PARTIAL_PASS` | API 36 emulator: final universal internal APK clean-installed successfully; cold launch returned `Status: ok` and `MainActivity`. Frames 250-1050 ms show the logo in both native and final React launch states, dark system icons and no white or empty-logo frame. Exact `vietride://payments/return` resolved to the app, while `vietride://payments/return/evil` was unable to resolve. Existing Login/Home/Chatbot/History smoke remains valid; live Shuttle mutation, Wallet return, Tracking, RAG and Digital Ticket are still not end-to-end verified. |
| `LIVE_BE` | `PARTIAL_PASS` | Authenticated Android startup received 200 responses from `/locations`, `/users/me`, `/promotions` and `/wallet`. No safe booking/payment mutation sandbox was available, so no real Shuttle booking, top-up, tracking session or RAG stream was fabricated. |
| `DEVICE_IOS` | `BLOCKED_ENV` | Windows host; no EAS token, project ID, `eas.json`, or local iOS simulator was available. |
| `GOOGLE_MAPS_CLOUD` | `BLOCKED_ENV` | Google Cloud console IAM/key state could not be inspected from this session. Real Android/iOS keys remain unset; package/bundle and SHA-restricted credentials plus an authenticated physical/emulator map smoke are still required. |
| `EXPO_DOCTOR` | `PASS` | 2026-07-22 - online dependency check reports the SDK 54 matrix current and Expo Doctor passes all 17 enabled checks. The native-field sync check remains intentionally disabled because this repository tracks native Android; the current downgrade explicitly ran clean Android prebuild. |
| `ANDROID_RELEASE_PERF` | `PARTIAL_PASS` | 2026-07-18 - the physically short Windows build path produced a verified, installable universal internal APK. Production/Play and frame-performance certification remain open because the APK uses the tracked debug signer, the Maps value is `TEST_KEY_FOR_LOCAL_BUILD`, the passenger App Link/domain is not deployable, and no release frame trace was recorded. |

## Canonical work tracker

| ID | Priority | Capability | Source of truth | Status | Dependencies | Acceptance criteria | Evidence | Last updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R0 | P0 | Recovery governance | Mobile `650bdb4`, recovery ref `28cc5b7`, BE `origin/main@fcccf454` / `v1.40.0` | `VERIFIED` | None | One canonical tracker; disposition for every removed capability; no silent capability deletion | 2026-07-22 re-audit preserves separate sent-history and received-parcel scopes, retains explicit demo fixtures and reuses the existing Parcel detail, Trip, Tracking and query infrastructure; no product module was retired | 2026-07-22 |
| M1.1 | P0 | Typed navigation | Registered navigators and discriminated params | `VERIFIED` | M6, M5 | Every declared route has a registered screen and every caller supplies valid params | `navigationRegistry.contract.test.ts`; TypeScript; full Jest; Android Home/Chatbot/History navigation smoke | 2026-07-15 |
| M1.2 | P0 | Booking network DTO and payment lifecycle | BE `origin/main@0a1bd9f` Booking controller/request/result/status DTOs | `IN_PROGRESS` | Existing booking store, authenticated VNPay sandbox | Exact one-way/round-trip bodies; `{seatNumber}` wire seats only; contact local; header idempotency; WALLET confirmation; VNPay foreground reconciliation for every booking leg; live checkout confirmation | `bookingApi.test.ts`, `useBookingStore.create.test.ts`, `bookingCompletion.test.ts`, `bookingPayment.test.ts`, `useBookingPaymentReconciliation.test.tsx`; 2026-07-17 full static gates pass; live create/payment flow not run | 2026-07-17 |
| M1.3 | P0 | Demo-mode boundary | Expo build env and missing-BE capabilities | `VERIFIED` | Env typing | Dev defaults only under `__DEV__`; staging requires explicit opt-in; production always false | `demoMode.test.ts`; production Hermes bundle built with `DEMO_MODE=true` still rendered fail-closed guest/history boundary on Android | 2026-07-15 |
| M1.4 | P0 | Per-leg Shuttle booking request | BE `origin/main@0a1bd9f` create handlers, Shuttle DTOs, Station and Trip detail DTOs | `IN_PROGRESS` | M1.2, station/trip detail, foreground location, safe live booking sandbox | Exact active origin Station only; fetched trip must be `SCHEDULED` with valid departure; strict T-30 cutoff; outbound/return drafts isolated; coordinates memory-only; local `stationId` never enters wire DTO; pending-assignment wording; live one-way/round-trip confirmation | `shuttle.test.ts`, `useBookingStore.create.test.ts`, `stationApi.test.ts`, `useStationDetail.test.tsx`, `deviceLocation.test.ts`, Shuttle component tests; 35 focused tests and full 66-suite gate pass; Android bundle/Home smoke pass; live Shuttle submit not run | 2026-07-17 |
| M1.5 | P1 | Shuttle intent/assignment visibility | BE `origin/main@0a1bd9f` booking status plus notification/tracking contracts | `BLOCKED_BE` | Passenger booking-linked Shuttle read contract | Never infer Shuttle status from create/status responses; surface assignment only from authenticated server data; no History fabrication | Create result does not echo Shuttle; `GET /bookings/{id}` returns booking status only; notifications exist only after `SHUTTLE_ASSIGNED`/`SHUTTLE_UNFULFILLED`, so pending intent cannot be reconstructed | 2026-07-17 |
| M2.1 | P1 | Popular routes | Live location catalog | `VERIFIED` | Location catalog | No guessed IDs, fare or duration; unresolved shortcuts hidden | Resolver tests; Android Home rendered location-only route cards without fake price/duration; full static gates pass | 2026-07-15 |
| M2.2 | P1 | Recent searches | AsyncStorage local adapter | `IN_PROGRESS` | Expo-compatible AsyncStorage | User/guest namespace, schema migration, corrupt-data reset, dedupe/max 8, device persistence | Adapter/hook tests and Home empty state pass; end-to-end search persistence not run against a live catalog | 2026-07-15 |
| M2.3 | P1 | Home wallet card | Payment Wallet API | `IN_PROGRESS` | M3.1 | Real loading/error/balance states and typed Wallet navigation | Static implementation/gates pass; authenticated device flow not run | 2026-07-15 |
| M3.1 | P0 | Wallet ledger | BE `WalletController` | `IN_PROGRESS` | Auth session | Exact `/wallet` and paginated `/wallet/transactions`; user cache isolation; 100+ rows on device | Contract, isolation and 125-unique-row pagination tests pass; live authenticated ledger/device list not run | 2026-07-15 |
| M3.2 | P0 | VNPay top-up | BE `WalletController` | `IN_PROGRESS` | M3.1, redirect validator | Exact `/wallet/top-up`; single flight; ambiguous timeout safety; foreground refresh once; no fake success | Coordinator/AppState/double-tap/scoped-refresh tests pass; real redirect/return not run | 2026-07-15 |
| M3.3 | P1 | Unsupported financial surfaces | Current BE controller inventory | `IN_PROGRESS` | Profile navigation | Withdraw/Saved Payments/Add Card remain labelled, fail-closed shells; no PAN/CVV collection | Capability/navigation tests pass; authenticated device reachability not run | 2026-07-15 |
| M3.4 | P0 | Mobile payment-return custom deep link | Mobile `650bdb4`; BE `410614bdaa5f911edd6d33f86a342e163901b38c` / `v1.34.2` VNPay configuration and Booking status APIs | `VERIFIED` | M1.2, M3.2, signed Android device build | Accept only exact `vietride://payments/return` on cold/warm launch; reject ambiguous/spoofed URLs; never trust, persist or display gateway query data as success; mark only the authenticated user's Booking queries stale with `refetchType: 'none'`; leave Wallet reconciliation to its foreground single-flight owner; pass installed-APK resolution checks | `usePaymentDeepLink.test.tsx` and `PaymentDeepLinkHandler.test.tsx` cover exact parsing, hostile URL rejection, cold/warm listener delivery, dedupe and Booking-only stale marking. Final Jest gate passed 69 suites/361 tests. The final APK cold-launched with `Status: ok`/`MainActivity`; exact return URI resolved and `vietride://payments/return/evil` was unable to resolve | 2026-07-18 |
| M3.5 | P0 | HTTPS VNPay return bridge and verified App Link | BE `410614bdaa5f911edd6d33f86a342e163901b38c` / `v1.34.2`; passenger domain and production certificate ownership | `BLOCKED_BE` | `app.vietride.online` DNS, public HTTPS return route, passenger `assetlinks.json`, persistent production signing certificate | Keep `VNPAY_RETURN_URL=https://app.vietride.online/payments/return`; page/bridge may wake the app at the fixed mobile URI but must not forward or present query parameters as payment success; publish raw-200 passenger App-Link ownership for `com.vietride.passenger`; IPN/authenticated APIs remain authoritative | `app.vietride.online` currently has no DNS record or HTTPS return bridge. The apex-domain `assetlinks.json` currently identifies the driver package with a debug fingerprint, not the passenger package/domain; the passenger production certificate does not exist yet. Custom URI fallback is verified, but production HTTPS App Link remains BE/domain-blocked | 2026-07-18 |
| M4.1 | P1 | Booking-voucher promotions | Existing `bookingApi.getPromotions` | `IN_PROGRESS` | Booking API | Reuse API/query keys; no second client; loading/error/empty states | Hook/component tests and duplicate-owner audit pass; live response not run | 2026-07-15 |
| M4.2 | P1 | Received parcels | Existing `parcelApi.getReceivedParcels` and hook | `IN_PROGRESS` | Auth session | Reuse existing hook; real parcel cards route by UUID | Static gates and single-owner audit pass; authenticated device flow not run | 2026-07-15 |
| M4.3 | P1 | Editorial news and product promos | No current passenger BE contract | `BLOCKED_BE` | News/editorial endpoint and DTO | Preserve capability; do not restore invented copy, Picsum media or fake campaign data | BE controller inventory has voucher promotions only; this is distinct from M4.1 | 2026-07-15 |
| M4.4 | P1 | Referral rewards | No current passenger BE contract | `BLOCKED_BE` | Referral/reward endpoint and DTO | Preserve capability; do not invent invite rewards or coin balances | Recovery source contained hard-coded reward copy; no supporting BE contract exists | 2026-07-15 |
| M5 | P1 | Ticket and Parcel live trip tracking with native map | BE `origin/main@fcccf454` / `v1.40.0` Tracking gateway/controllers plus public Trip and Parcel DTOs | `IN_PROGRESS` | Auth, valid `tripId`, Parcel `dropoffStopId`, restricted Google Maps keys, live tracking session | Socket.IO joins/rejoins the trip using bearer auth without query/log leakage; validates and scopes live GPS/ETA/status events; REST latest is bootstrap/fallback only; trail/ETA/status obey focus/network/AppState/terminal lifecycles; Ticket and Parcel reuse one panel; native map safely renders/caps trail and stop markers; consume additive destination/stop arrival fields without inventing lifecycle state; null/403/404 and missing IDs fail clearly | v1.40 fields remain preserved; SDK 54 uses its Expo Go-compatible `react-native-maps@1.20.1` and a local native-key plugin backported without putting keys in the JS bundle. Tracking/map suites and current static gates pass; real Cloud credentials and authenticated live trip/map smoke remain unverified | 2026-07-22 |
| M6 | P0 | Unified Ticket/Parcel passenger history to detail | BE `origin/main@fcccf454` / `v1.40.0` `GET /v1/passenger/history` facade | `IN_PROGRESS` | M1.1, M5, authenticated passenger session | Required `type=TICKET|PARCEL`; server status filters and cancellable infinite pagination; user-isolated cache; Ticket/Parcel/`initialTab`; Ticket snapshot never reads checkout state; Parcel routes by parcel UUID; no fixture fallback on remote failure; explicit demo fixtures remain available only to legacy demo callers | Exact Zod facade, one infinite-query owner, memoized FlashList rows, stale/error/empty states and typed snapshot navigation implemented; current TypeScript, zero-warning ESLint and full 405-test gate pass. Authenticated facade pagination/detail flow is not yet run | 2026-07-22 |
| M7.1 | P1 | Parcel local photo draft | Expo ImagePicker and parcel draft | `IN_PROGRESS` | Permissions, `expo-image` | Camera/library/preview/remove; local URI never serialized | Picker and payload tests pass; native permission/camera device flow not run | 2026-07-15 |
| M7.2 | P1 | Parcel photo upload | No passenger upload controller | `BLOCKED_BE` | Authenticated upload contract | Preserve local UI; `photoUrl` remains `null` until remote URL contract exists | Controller audit found no passenger upload endpoint | 2026-07-15 |
| M8.1 | P0 | RAG policy assistant | BE `POST /v1/rag/chat` SSE and feedback | `IN_PROGRESS` | Auth, network | Token/done/error SSE, timeout/abort, conversation and feedback without mock fallback | API/parser/timeout/feedback tests pass; Android auth guard renders; live authenticated SSE not run | 2026-07-15 |
| M8.2 | P1 | Chat booking action | Catalog-backed deterministic intent extraction | `IN_PROGRESS` | M1.2, booking flow | Model output never becomes API payload; prefill only; explicit confirmation before booking/payment | Intent tests pass; Android shortcut opens booking UI without mutation; authenticated prefill/confirmation not run | 2026-07-15 |
| M8.3 | P1 | Chat tracking action | M6 history provider and M5 tracking | `IN_PROGRESS` | M5, M6 | Quick action opens Ticket history and lets user choose an eligible trip | Typed/static implementation passes; eligible-trip device flow not run | 2026-07-15 |
| M9 | P1 | Bus-type filter | Passenger trip-search response | `BLOCKED_BE` | Reliable vehicle metadata | Keep dormant; never hardcode every bus as one type | Current BE response lacks suitable vehicle metadata | 2026-07-15 |
| M10 | P1 | React Native performance and accessibility | `react-native-skills` | `FAILED_VERIFY` | All UI slices, release environment | Virtualized long lists, stable renders, responsive small screen/large font, release frame smoke | Static optimization tests and Android responsive regression pass; release frame gate is `BLOCKED_ENV`, so performance is not certified | 2026-07-15 |
| M11.1 | P0 | Deterministic date/time | Shared formatter contract | `VERIFIED` | None | Stable `DD/MM/YYYY HH:mm`; cached formatter | `format.test.ts`; TypeScript; full Jest and ESLint pass | 2026-07-15 |
| M11.2 | P0 | SecureStore Jest isolation | Production SecureStore adapter | `VERIFIED` | Jest mapper | Reset stored values, calls and mock implementations without production changes | `secureStoreMock.test.ts`; auth logout/cache isolation test; full Jest pass | 2026-07-15 |
| M12 | P0 | Full quality gate | Entire repository | `FAILED_VERIFY` | All modules | Static gates, Expo Doctor, authenticated Android flows, iOS, production release/performance | Current Expo 54 snapshot passes TypeScript, full zero-warning ESLint, 76/76 Jest suites with 405/405 tests, enabled Expo Doctor checks, dependency-matrix validation, diff check and Android bundle export. Live booking/payment/history/tracking, real Google Maps credentials, broader authenticated flows, iOS and production release/frame performance remain unverified, so the repository-wide gate stays open | 2026-07-22 |
| M13.1 | P1 | App icon, native splash and bootstrap loading | Mobile `650bdb4` theme/assets plus `app_logo_placeholder.png` | `IN_PROGRESS` | M13.2 current device artifact | Reuse one canonical logo source; replace default Expo launcher/splash assets for legacy and adaptive Android icons; use one accessible, theme-consistent JS bootstrap screen for font/auth hydration; preserve the separate operation overlay; verify continuous branded cold start without a default/white/blank logo frame | Expo 54 prebuild regenerated launcher/splash resources from the same configured source assets and `AppLaunchScreen.test.tsx` passes. Prior frames belong to the SDK 56 artifact; current SDK 54 clean-install frames are not yet captured | 2026-07-22 |
| M13.2 | P0 | Android internal release APK | Mobile `650bdb4`; Android package `com.vietride.passenger` | `IN_PROGRESS` | Production separately requires M3.5, persistent release key and real Maps key | Produce a release-variant APK labelled internal; verify signature, alignment, package/version/SDK/ABI metadata, clean install/launch and exact deep-link resolution; record the final artifact path, size and SHA-256; never represent debug-key or placeholder-Maps output as Play/production-ready | The previously verified artifact and SHA-256 remain historical SDK 56 evidence only. SDK 54 now prebuilds and exports successfully, but no current APK has been compiled, signed, installed or device-smoked | 2026-07-22 |
| M14 | P0 | Expo Go SDK 54 compatibility | Expo SDK 54 package matrix and store-distributed Expo Go | `IN_PROGRESS` | Physical Android and iOS Expo Go smoke | Resolve as SDK 54; align React/RN/native packages; emit Expo Go QR explicitly; bundle without the former SDK 56 store mismatch; retain current native capabilities | `expo@54.0.36`, React `19.1.0`, RN `0.81.5`; Expo dependency check passes; Doctor passes all enabled checks; `npm start` now selects `--go`; clean Android export bundles 4,542 modules. Physical Android/iOS Expo Go open remains not run | 2026-07-22 |

## Contract matrix

| Capability | Method/path | Request | Response notes | Mobile rule |
| --- | --- | --- | --- | --- |
| Create booking | `POST /bookings` | Pickup/dropoff, optional `shuttlePickup:{address,latitude,longitude}`, voucher, payment method; `seats: [{seatNumber}]` | WALLET -> `CONFIRMED`; VNPay -> `PENDING_PAYMENT`, `paymentId`, `paymentRedirectUrl`; Shuttle is not echoed | Passenger contact stays local; `Idempotency-Key` is an HTTP header; Shuttle UI/draft is implemented only for the exact origin Station after live Station/Trip eligibility checks |
| Create round trip | `POST /bookings/round-trip` | Independent outbound/return legs with pickup/dropoff/optional Shuttle/seats; group voucher/payment | WALLET confirms both legs; VNPay returns one `BOOKING_GROUP` redirect; Shuttle is not echoed | One shared leg payload builder and single-flight submit; Shuttle drafts remain independent per leg; poll both booking IDs before activating either ticket |
| Station Shuttle capability | `GET /stations/{stationId}` | Exact Station UUID | Active `StationDto` includes coordinates, `supportsShuttle`, `isActive` | Cache by Station ID; require exact response ID and fail closed on 404/mismatch; after v1.33 station merge, refetch trip/station data instead of weakening identity checks |
| Reconcile booking payment | `GET /bookings/{bookingId}` | UUID booking ID | `{bookingId,status}` only | Poll only while focused, foreground and online; only exact `CONFIRMED` is active; `EXPIRED` is payment expiry; later lifecycle states stay inactive and status-neutral |
| Shuttle assignment/status | No booking-linked passenger read endpoint | N/A | Create/status responses contain no Shuttle state; authenticated notifications start only at assigned/unfulfilled | Checkout/Ticket may show only that the request was sent and awaits arrangement; History must not invent pending/assigned state |
| Wallet | `GET /wallet` | None | `{userId,balance,currency}` | Cache key includes authenticated user ID |
| Wallet ledger | `GET /wallet/transactions` | `page`, `pageSize` | `CREDIT/DEBIT`, balances, references, note | Map network DTO to a separate UI model; use infinite pagination |
| Top-up | `POST /wallet/top-up` | `{amount,method:'VNPAY'}` | `{topUpRequestId,status,paymentRedirectUrl}` | Validate redirect; do not report success before payment result |
| VNPay browser return | `https://app.vietride.online/payments/return` configured as the BE ReturnUrl | Gateway query is untrusted browser input | BE `410614bdaa5f911edd6d33f86a342e163901b38c` has no deployed bridge/page contract at this path | Keep the ReturnUrl HTTPS; wake Mobile only at exact `vietride://payments/return` or a future verified HTTPS App Link; never derive payment success from query parameters |
| VNPay booking IPN | `POST /payments/vnpay-ipn` through the public v1 API base | Gateway server callback | Server-side payment processing is authoritative | Mobile does not call or emulate IPN; custom return marks authenticated Booking queries stale with no active refetch, while Wallet keeps its existing foreground single-flight reconciliation |
| Tracking realtime | Socket.IO on the public API origin with path `/tracking/socket.io` | Handshake `auth:{token}`; emit `joinTripTracking {tripId}` on every connect/reconnect | `gps:update`, `eta:update`, `trip:statusChanged`; current status event communicates delay, not terminal completion | Never put tokens in URL/query/logs; validate/filter every event by trip/stop; bounded reconnect and fail closed on auth/forbidden/not-found |
| Tracking latest | `GET /tracking/trips/{tripId}/latest` | UUID trip ID | `{latest: TrackingPoint|null}`; `null` is normal before the first GPS point | Bootstrap once and poll every five seconds only as the disconnected Socket.IO fallback while focused, online, foreground and non-terminal |
| Tracking trail | `GET /tracking/trips/{tripId}/trail` | UUID trip ID; paginated response capped by BE at 100 per request | Ordered GPS points | Initial fetch; refresh at most every five minutes; merge/dedupe/cap newest live points locally |
| Tracking ETA | `GET /tracking/trips/{tripId}/eta?stopId={stopId}` | Valid trip and stop UUIDs | `{eta: TrackingEta|null}`; `null` is normal | Poll every 60 seconds only while lifecycle-active and a destination stop is available; live socket ETA supersedes stale REST values |
| Public trip detail for map lifecycle | `GET /trips/{tripId}` | UUID trip ID | Public trip status, nullable `destinationArrivedAt`, and route stops with coordinates plus `isActive`, `status:PENDING|ARRIVED|SKIPPED`, nullable `actualArrivalTime` | Reuse the existing Trip query owner; poll status at most every 60 seconds while active, stop on a terminal trip, and map only validated coordinates |
| Parcel tracking identifiers | `GET /parcels/{parcelId}` | UUID parcel ID | Existing detail DTO exposes `tripId` and nullable `dropoffStopId` | Reuse the existing Parcel detail hook; enable live map only for the exact BE trackable parcel statuses and pass destination stop to ETA |
| RAG chat | `POST /rag/chat` through the v1 client base | `{message,conversationId?}` | SSE `token`, `done`, `error` | No fixture fallback; assistant text never becomes a network action payload |
| RAG feedback | `POST /rag/messages/{assistantMessageId}/feedback` | `{rating:1|-1}` | Standard success envelope | Validate UUID path segment |
| Unified passenger history | `GET /passenger/history` | Required `type=TICKET|PARCEL`; optional exact `status`, inclusive RFC3339 `from`, exclusive RFC3339 `to`; `page`, `pageSize<=100` | Fixed `createdAt DESC, id DESC` page; discriminated Ticket/Parcel items. Ticket upstream failure is 502, not an empty page; Parcel branch is sent-by-passenger only | One authenticated facade/query owner; type and user are part of the cache key; use cancellable infinite pagination; never silently switch an API failure to fixtures |
| History detail handoff | No individual passenger ticket-history detail endpoint; existing `GET /parcels/{parcelId}` for Parcel detail | Selected facade item or Parcel UUID | Ticket history item includes booking/ticket references, seats, route summary and status but no payment method, bus type, stop address or stop ID | Pass the serializable selected Ticket snapshot to Digital Ticket and omit unknown fields; never read checkout Zustand state or misuse `GET /bookings/{id}` as ticket detail; Parcel reuses its existing detail hook |
| Parcel photo upload | No passenger upload endpoint | N/A | Parcel create accepts only a URL | Local preview allowed; local URI never enters payload |

## Product-scope restoration matrix

| Removed or degraded capability | Disposition | Replacement / reason |
| --- | --- | --- |
| Password-reset mock API | `REPLACE_DATA_SOURCE` | Real Identity forgot/reset controllers; no duplicate mock client |
| Popular route cards/screen | `RESTORE` | Catalog-resolved locations; no fake fare or duration |
| Recent search cards | `RESTORE` | Versioned AsyncStorage provider scoped to user/guest |
| Monolithic booking mock data | `REPLACE_DATA_SOURCE` | Split into live API, local product data, or explicit demo provider |
| Wallet and Top-up | `REPLACE_DATA_SOURCE` | Real Payment APIs with React Query and lifecycle-safe mutation control |
| Withdraw, Saved Payments, Add Card | `KEEP_SHELL` | Visible/reachable labelled shells; no unsupported financial input |
| Booking history fixtures | `RESTORE` | Preserve the explicit development/staging-demo provider for missing-capability demos; production and normal authenticated History use the live passenger-history facade and never fall back to fixtures on failure |
| Digital Ticket history flow | `REPLACE_DATA_SOURCE` | Live selected Ticket facade snapshot, with guarded demo-detail fallback only for legacy demo routes; never misuse the status-only endpoint or fabricate fields the facade does not return |
| Sent Ticket/Parcel history | `RESTORE` | One live facade with required type-specific requests, infinite pagination, server filters and typed branch models; sent Parcel history remains distinct from Home received parcels |
| Tracking/MockMap | `REPLACE_DATA_SOURCE` | Shared Ticket/Parcel Socket.IO tracking with lifecycle-safe REST fallback and native Google map; do not restore `MockMapView` |
| Home booking-voucher promotions | `REPLACE_DATA_SOURCE` | Existing Booking promotions API/query keys |
| Editorial news/product promos | `BLOCKED_BE` | Distinct from booking vouchers; wait for a real editorial/campaign contract |
| Home recent shipments | `REPLACE_DATA_SOURCE` | Existing received-parcels API/hook |
| Referral rewards/invite card | `BLOCKED_BE` | No referral/reward contract; hard-coded coins/cash rewards are not restored |
| Home Wallet card | `RESTORE` | Real Wallet states and typed navigation |
| Parcel photo components | `RESTORE` | Shared native picker/local preview; upload stays BE-blocked |
| Bus-type filter | `BLOCKED_BE` | Dormant until passenger trip metadata supports it |
| RAG policy chatbot | `RESTORE` | Hardened BE SSE/feedback integration |
| Chat booking/tracking shortcuts | `RESTORE` | Deterministic prefill and explicit user-controlled navigation |
| Per-ticket Shuttle request | `RESTORE` | Theme-consistent optional origin-Station flow backed by current Booking/Station/Trip contracts; precise coordinates stay memory-only |
| Shuttle intent/history/assignment | `BLOCKED_BE` | Create/status responses do not expose Shuttle state; post-assignment notification/tracking cannot reconstruct pending intent by booking |
| Payment return deep link | `RESTORE` | Exact custom URI plus HTTPS App Link intake; query data is only a wake signal and authenticated BE state remains authoritative |
| Default Expo launcher/splash/loading | `REPLACE_DATA_SOURCE` | Reuse `app_logo_placeholder.png` through shared assets, generated native Android icon/splash resources and the shared bootstrap loading screen |

## Implementation rules

1. Never use blanket `git reset`, checkout or revert against user/Claude work.
2. Never invent an endpoint, identifier, response field, fare, duration or inventory value.
3. A missing BE capability remains local product behavior, a labelled shell or `BLOCKED_BE`; it is not deleted.
4. API failure never switches silently to fixture data.
5. Reuse API clients, auth refresh, error envelope, query keys and hooks before creating another abstraction.
6. Private cache keys include authenticated user ID and are cleared on session changes.
7. Large lists use virtualization, memoized rows, primitive props and stable callbacks.
8. Payment and booking submissions are single-flight and idempotency-safe across ambiguous failures.
9. No row becomes `VERIFIED` without evidence matching its full acceptance criteria.
10. No commit or push is created unless explicitly requested.

## Final acceptance gate

- [x] `npx.cmd tsc --noEmit`
- [ ] `npm.cmd test -- --runInBand` - intentionally deferred for the 2026-07-22 history slice per owner request; last full green snapshot was 76/76 suites, 402/402 tests on 2026-07-20
- [x] `npx.cmd eslint . --max-warnings=0`
- [x] `npx.cmd expo config --type public`
- [x] `git diff --check`
- [x] Android debug x86_64 native build and unauthenticated/guest smoke
- [x] Windows stable Metro startup, Android bundle and authenticated Home/API startup smoke
- [x] Android custom payment-return resolution/security smoke and branded native-to-JS cold launch
- [x] Android tracking Maps manifest merge and `arm64-v8a` debug native build
- [ ] Live one-way and round-trip Shuttle booking submit/confirmation
- [x] Expo Doctor enabled checks - PASS (17/17); tracked-native sync check intentionally disabled with current clean Android prebuild evidence
- [x] Expo SDK 54 dependency matrix and clean Android export
- [ ] Physical Android/iOS Expo Go launch on the current SDK 54 snapshot
- [ ] Authenticated Android: 100+ ledger, top-up return, ticket detail, tracking and live RAG
- [ ] iOS: safe areas, large text, keyboard, photo permission and map fallback - `BLOCKED_ENV`
- [x] Android internal release APK: assemble, sign/alignment inspect, clean install/cold-start, branded visual QA and exact deep-link resolution smoke
- [ ] Android production/Play release and frame gate - `IN_PROGRESS` (persistent production signing key and real Maps key absent); verified HTTPS App Link remains `BLOCKED_BE` until the domain route and `assetlinks.json` are deployed

## Progress log

### 2026-07-22 - Expo SDK 54 compatibility downgrade

- Downgraded the runtime coherently from Expo 56/RN 0.85/React 19.2 to Expo `54.0.36`/RN `0.81.5`/React `19.1.0`, including every Expo-managed native package, RN tooling, TypeScript and Jest preset. `npm start` and the stable launcher now select Expo Go explicitly.
- Rebuilt the lockfile from a clean dependency tree and regenerated Android with the SDK 54 Gradle/native template. Payment deep links, backup restrictions, permission removals and branding configuration remain represented; no feature, mock provider or product module was retired.
- Kept Expo Go's required `react-native-maps@1.20.1` and replaced the unavailable SDK 56-only maps plugin import with one shared SDK 54-compatible config plugin. Native Maps keys remain outside JavaScript and invalid key formats fail closed.
- Consolidated duplicate Expo configuration into `app.config.js`, eliminating config drift. Expo dependency validation passes; Doctor passes all 17 enabled checks; TypeScript, zero-warning ESLint, `git diff --check` and full Jest pass (76 suites, 405 tests).
- A clean Android export completed 4,542 modules in about 42 seconds and exited successfully; Metro's final displayed `99.9%` line is progress rendering, not a stalled process. The current SDK 54 physical Expo Go launch and native APK build remain open.
- Production dependency audit has no high/critical findings. React Native CLI was patched to compatible `20.2.0`, reducing moderate findings from 19 to 12; remaining advisories are in Expo 54 build tooling and npm's forced fix would upgrade to Expo 57, so it was intentionally not applied.

### 2026-07-22 - Unified passenger history and BE v1.40 contract sync

- Re-audited BE `origin/main@fcccf454` (`v1.40.0`). Passenger History is now the authenticated facade `GET /v1/passenger/history`; `type` is required and accepts only `TICKET` or `PARCEL`, with optional exact status/date filters and fixed descending infinite pagination. The Parcel branch contains sent parcels, while the existing received-parcels endpoint remains a separate Home capability.
- Added one runtime-validated passenger-history API/query owner using the existing API client, auth refresh, error envelope and React Query infrastructure. Cache keys are isolated by user/type/filter, inactive tabs are lazy, requests are cancellable, retries are bounded and remote errors never switch to fixtures.
- Rebuilt History on memoized FlashList rows with server-backed Ticket filters, pagination, refresh/stale/error/empty states and theme-consistent responsive cards. Ticket and Track presses are separate; Parcel reuses the existing detail flow by the facade parcel UUID.
- Digital Ticket now accepts the selected serializable Ticket snapshot and does not read checkout Zustand state for history routes. Fields absent from the facade (payment method, bus type, stop address/ID) are omitted rather than fabricated; legacy explicit-demo detail remains preserved without running when a live snapshot exists.
- Synced additive v1.40 Trip detail fields (`destinationArrivedAt`, stop `status`, `actualArrivalTime`, `isActive`) through the existing mapper. Current TypeScript, full zero-warning ESLint, Expo config and diff check pass. No new tests were added and the full Jest gate was intentionally deferred per owner request; authenticated device pagination/detail remains open, so M6 stays `IN_PROGRESS`.

### 2026-07-20 - Realtime Ticket/Parcel tracking and native Google Maps

- Re-audited BE `origin/main@16ea6000` (`v1.36.0`). Realtime tracking uses Socket.IO on the public API origin at `/tracking/socket.io`, joins on every connection, and consumes validated trip-scoped GPS/ETA/delay events; authenticated REST latest/trail/ETA remains the lifecycle-aware bootstrap and fallback.
- Added one shared live-tracking panel for Ticket and Parcel instead of parallel feature implementations. Ticket keeps the checkout/history `tripId`; Parcel reuses its existing detail hook for `tripId` and `dropoffStopId`. The public Trip query supplies validated route-stop coordinates and terminal status without relying on the missing passenger `booking/me` contract.
- Added a native Google map with a capped/deduplicated travelled trail, stable bus/stop markers, follow/recenter behavior and safe unavailable state. No Directions/Routes request, background location permission, untrusted key in JavaScript, or second API/query owner was introduced.
- Added native-only Android/iOS Maps key configuration, production fail-closed checks and `docs/GOOGLE_MAPS_SETUP.md`. The Google Cloud project configuration remains unverified; separate package/bundle-restricted keys and a real authenticated trip/map smoke are required before M5 can become `VERIFIED`.
- Current snapshot passes TypeScript, 76/76 Jest suites (402/402 tests), zero-warning ESLint, Expo public config, Android Maps manifest merge and an `arm64-v8a` debug APK build. The universal build from this long Windows workspace still hits the native CMake path-length limit, so it is not claimed as a current universal artifact.

### 2026-07-18 - Payment return, branded launch and Android internal release verification

- Re-audited Mobile `650bdb4` against BE `410614bdaa5f911edd6d33f86a342e163901b38c` (`v1.34.2`). The BE requires an HTTPS VNPay ReturnUrl and exposes the server IPN; `app.vietride.online` currently has no DNS/HTTPS return bridge, while apex `assetlinks.json` identifies the driver package with a debug fingerprint rather than the passenger app.
- Verified exact custom-scheme payment return handling. Mobile rejects spoofed/ambiguous URLs, ignores gateway query data as a result, deduplicates cold/warm delivery and marks only the authenticated user's Booking queries stale with `refetchType: 'none'`; Wallet continues to own foreground single-flight reconciliation.
- Replaced default Expo branding with the existing placeholder logo across app config, legacy/adaptive Android launcher resources, native splash resources and the shared font/auth bootstrap screen. The static `defaultSource` with zero fade passes focused coverage; final clean-install frames 250-1050 ms show native and JS logos, dark system icons and no white or empty-logo frame.
- Final snapshot passes TypeScript, full Jest (69/69 suites, 361/361 tests in 35.43 s), zero-warning ESLint, Expo config and diff check. The final APK cold-launched with `Status: ok`/`MainActivity`; exact `vietride://payments/return` resolved and `vietride://payments/return/evil` did not.
- The polished universal internal APK passed alignment, apksigner verification (`v2=true`, `v3=false`), package/version/SDK/ABI inspection, clean installation, cold launch and exact/hostile deep-link smoke. Final artifact: `artifacts/VietRide-0.0.1-internal-release.apk`, 59,932,571 bytes, SHA-256 `9C765608E938CDA14954C971AA9CB984AA8C3367DA9DAA014816FFA356C65780`. Production remains open because only a debug signer and placeholder Maps key are available.
- Deletion of the default `ic_launcher_background.xml` is intentional: `vietride_splash.xml` and branded launcher resources replace it, so no product capability was removed.
- BE handoff remains fixed: `VNPAY_RETURN_URL=https://app.vietride.online/payments/return`, booking IPN `https://api.vietride.online/v1/payments/vnpay-ipn`, mobile fallback `vietride://payments/return`, Android package `com.vietride.passenger`.

### 2026-07-17 - Shuttle booking and Windows Metro recovery against BE v1.33.0

- Re-audited the latest fetched BE ref `origin/main@0a1bd9f` (`v1.33.0`) without changing the BE worktree. One-way and round-trip Shuttle DTOs remain independent optional leg fields; exact origin Station eligibility, `SCHEDULED` status and strict T-30 cutoff remain authoritative.
- Added the theme-consistent Shuttle option to the existing pickup step, a responsive keyboard-safe address/location sheet, independent outbound/return memory-only drafts, one shared leg payload builder and pending-assignment summaries in Checkout, Payment and Digital Ticket.
- Reused the existing API/auth/query infrastructure and shared location implementation. Station detail is prefetched, precise coordinates are never persisted/logged, local Station binding is stripped from payloads, and incomplete Trip Detail now fails closed.
- Diagnosed the Windows 99% stall as Expo SDK 56 opening roughly one fallback `fs.watch` handle for each of 12,613 directories before binding Metro. Added `npm run start:stable`, which uses the supported CI/no-watch path and LAN binding without deleting caches or dependencies.
- `npm run start:stable` bound `0.0.0.0:8081`; Android bundled 4,587 modules and Expo Go reached authenticated Home with successful live GET responses. Fast Refresh is intentionally unavailable in this fallback mode.
- Passed TypeScript, full Jest (66 suites/347 tests), zero-warning ESLint, Expo config and `git diff --check`; no tracked file was deleted. Live Shuttle mutation, iOS, current native rebuild and release performance remain unverified, so M1.4/M12 are not marked `VERIFIED`.

### 2026-07-15 - Booking flow synchronized with BE v1.30.0

- Re-audited local BE HEAD `5be88a5` (`v1.30.0`). The public create DTOs are unchanged from `e2b85a1`; v1.30 adds internal payment context/invoice settlement and later booking lifecycle completion.
- Preserved the exact one-way/round-trip payloads, station/stop identity and local-only passenger contact; added user-scoped `GET /bookings/{bookingId}` reconciliation for VNPay.
- WALLET confirmation now goes directly to the ticket; VNPay stays pending until every one-way/round-trip booking ID is exactly `CONFIRMED`. `EXPIRED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`, `PARTIAL_NO_SHOW`, `REFUNDED` and `DISRUPTED` cannot render as an active ticket.
- Added bounded foreground/focus/online polling, transient retry, abort on focus loss, fatal 403/404 fail-closed behavior, user/booking cache isolation and a shared AppState hook reused by Booking and Tracking.
- Added single-flight create/navigation/redirect handling, deterministic idempotency retry policy (retain on network/timeout/408/5xx, rotate after definitive rejection), checkout-step fixes and immutable submitted payment-method display.
- Passed `npx.cmd tsc --noEmit`, full Jest (60 suites/304 tests), zero-warning ESLint and `git diff --check`; no tracked file was deleted. `LIVE_BE` checkout remains `NOT_RUN` and M1.2 remains `IN_PROGRESS`.

### 2026-07-15 - Corrective recovery implementation and verification

- Re-audited the Claude batch against BE `e2b85a1`; corrected booking, wallet, tracking and RAG contracts without blanket revert.
- Restored product scope through live adapters, local storage, labelled shells or explicit demo providers; no tracked module was deleted.
- Completed user-scoped Wallet/Top-up infrastructure, provider-safe History/Digital Ticket, Tracking lifecycle, Home sections, parcel local photos and deterministic chatbot actions.
- Added auth logout cache-isolation coverage and a shared responsive auth footer after Android small-screen/large-font smoke found overflow.
- Passed TypeScript, 55 Jest suites/256 tests, zero-warning ESLint, Expo config, diff check and Android debug native build.
- Recorded remaining blockers honestly: no authenticated live test account, no iOS environment, Expo Doctor external network denial, no real Maps key and Windows release CMake path limit.
