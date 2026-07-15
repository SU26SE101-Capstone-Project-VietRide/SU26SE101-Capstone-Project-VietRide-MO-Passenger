# VietRide Passenger Recovery Tracker

> Last updated: 2026-07-15  
> Mobile baseline: `413b9bf`  
> UI/product recovery reference: `28cc5b7`  
> Backend source of truth: `e2b85a1` (`v1.27.0`)  
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
| `UNIT_STATIC` | `PASS` | 2026-07-15 - `npx.cmd tsc --noEmit` -> PASS; `npx.cmd jest --runInBand` -> PASS (55 suites, 256 tests); `npx.cmd eslint . --max-warnings=0` -> PASS; `git diff --check` -> PASS; `npx.cmd expo config --type public` -> PASS. |
| `NATIVE_ANDROID_BUILD` | `PASS` | 2026-07-15 - `.\gradlew.bat app:assembleDebug -PreactNativeArchitectures=x86_64 -x lint -x test --configure-on-demand --build-cache` -> `BUILD SUCCESSFUL` (317 tasks). Merged debug manifest contains camera/coarse/fine location and excludes record-audio/read-storage/write-storage. |
| `DEVICE_ANDROID` | `PARTIAL_PASS` | API 36 emulator: Login -> Guest Home -> Chatbot auth guard -> booking shortcut -> History Ticket/Parcel; background/foreground returned without fatal JS/native log. A 720x1280, font-scale 1.3, keyboard smoke exposed an auth-footer overflow; the shared footer was fixed and rechecked with all form actions reachable. Authenticated Wallet/Top-up/Tracking/RAG/Digital Ticket flows were not run. |
| `LIVE_BE` | `NOT_RUN` | No authenticated safe test account or non-mutating payment/booking sandbox was available. No real booking, top-up, tracking session or RAG stream was fabricated. |
| `DEVICE_IOS` | `BLOCKED_ENV` | Windows host; no EAS token, project ID, `eas.json`, or local iOS simulator was available. |
| `EXPO_DOCTOR` | `BLOCKED_ENV` | 2026-07-15 - `npx.cmd expo-doctor` -> 18/20; the two external Expo/React Native Directory checks failed with network `EACCES`, while local checks passed. |
| `ANDROID_RELEASE_PERF` | `BLOCKED_ENV` | A real Maps key is absent and release CMake/Ninja canonicalizes the long Windows workspace path, then fails the 260-character object-path limit. The debug `gfxinfo` sample is intentionally not accepted as release-performance evidence. Temporary bundle, drive mapping and junction artifacts were removed. |

## Canonical work tracker

| ID | Priority | Capability | Source of truth | Status | Dependencies | Acceptance criteria | Evidence | Last updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R0 | P0 | Recovery governance | Git `413b9bf`, `28cc5b7`, BE `e2b85a1` | `VERIFIED` | None | One canonical tracker; disposition for every removed capability; no silent deletion | `git diff --name-status --diff-filter=D` -> no tracked deletion; restoration matrix includes product-only, replaced and BE-blocked scope | 2026-07-15 |
| M1.1 | P0 | Typed navigation | Registered navigators and discriminated params | `VERIFIED` | M6, M5 | Every declared route has a registered screen and every caller supplies valid params | `navigationRegistry.contract.test.ts`; TypeScript; full Jest; Android Home/Chatbot/History navigation smoke | 2026-07-15 |
| M1.2 | P0 | Booking network DTO | BE Booking controller/request/result DTOs | `IN_PROGRESS` | Existing booking store | `{seatNumber}` wire seats only; contact local; header idempotency; exact result status/payment ID; live checkout confirmation | Contract/store tests, TypeScript and lint pass; `LIVE_BE` booking flow not run | 2026-07-15 |
| M1.3 | P0 | Demo-mode boundary | Expo build env and missing-BE capabilities | `VERIFIED` | Env typing | Dev defaults only under `__DEV__`; staging requires explicit opt-in; production always false | `demoMode.test.ts`; production Hermes bundle built with `DEMO_MODE=true` still rendered fail-closed guest/history boundary on Android | 2026-07-15 |
| M2.1 | P1 | Popular routes | Live location catalog | `VERIFIED` | Location catalog | No guessed IDs, fare or duration; unresolved shortcuts hidden | Resolver tests; Android Home rendered location-only route cards without fake price/duration; full static gates pass | 2026-07-15 |
| M2.2 | P1 | Recent searches | AsyncStorage local adapter | `IN_PROGRESS` | Expo-compatible AsyncStorage | User/guest namespace, schema migration, corrupt-data reset, dedupe/max 8, device persistence | Adapter/hook tests and Home empty state pass; end-to-end search persistence not run against a live catalog | 2026-07-15 |
| M2.3 | P1 | Home wallet card | Payment Wallet API | `IN_PROGRESS` | M3.1 | Real loading/error/balance states and typed Wallet navigation | Static implementation/gates pass; authenticated device flow not run | 2026-07-15 |
| M3.1 | P0 | Wallet ledger | BE `WalletController` | `IN_PROGRESS` | Auth session | Exact `/wallet` and paginated `/wallet/transactions`; user cache isolation; 100+ rows on device | Contract, isolation and 125-unique-row pagination tests pass; live authenticated ledger/device list not run | 2026-07-15 |
| M3.2 | P0 | VNPay top-up | BE `WalletController` | `IN_PROGRESS` | M3.1, redirect validator | Exact `/wallet/top-up`; single flight; ambiguous timeout safety; foreground refresh once; no fake success | Coordinator/AppState/double-tap/scoped-refresh tests pass; real redirect/return not run | 2026-07-15 |
| M3.3 | P1 | Unsupported financial surfaces | Current BE controller inventory | `IN_PROGRESS` | Profile navigation | Withdraw/Saved Payments/Add Card remain labelled, fail-closed shells; no PAN/CVV collection | Capability/navigation tests pass; authenticated device reachability not run | 2026-07-15 |
| M4.1 | P1 | Booking-voucher promotions | Existing `bookingApi.getPromotions` | `IN_PROGRESS` | Booking API | Reuse API/query keys; no second client; loading/error/empty states | Hook/component tests and duplicate-owner audit pass; live response not run | 2026-07-15 |
| M4.2 | P1 | Received parcels | Existing `parcelApi.getReceivedParcels` and hook | `IN_PROGRESS` | Auth session | Reuse existing hook; real parcel cards route by UUID | Static gates and single-owner audit pass; authenticated device flow not run | 2026-07-15 |
| M4.3 | P1 | Editorial news and product promos | No current passenger BE contract | `BLOCKED_BE` | News/editorial endpoint and DTO | Preserve capability; do not restore invented copy, Picsum media or fake campaign data | BE controller inventory has voucher promotions only; this is distinct from M4.1 | 2026-07-15 |
| M4.4 | P1 | Referral rewards | No current passenger BE contract | `BLOCKED_BE` | Referral/reward endpoint and DTO | Preserve capability; do not invent invite rewards or coin balances | Recovery source contained hard-coded reward copy; no supporting BE contract exists | 2026-07-15 |
| M5 | P1 | Live trip tracking | BE tracking controllers/DTOs | `IN_PROGRESS` | Auth, network, real Maps config | Exact paths and polling lifecycle; null/403/404; focused native-map device flow | API/lifecycle tests, typed screen and debug native build pass; real trip/map flow not run | 2026-07-15 |
| M6 | P0 | History to Digital Ticket | Missing history/detail BE contract plus received parcels API | `IN_PROGRESS` | M1.1, M5 | `remote/demo/unavailable`; Ticket/Parcel/initialTab; no checkout-state leak; one tap/one navigation | Provider/view-model/navigation tests pass; Android Ticket/Parcel tabs pass; authenticated fixture/ticket flow not run | 2026-07-15 |
| M7.1 | P1 | Parcel local photo draft | Expo ImagePicker and parcel draft | `IN_PROGRESS` | Permissions, `expo-image` | Camera/library/preview/remove; local URI never serialized | Picker and payload tests pass; native permission/camera device flow not run | 2026-07-15 |
| M7.2 | P1 | Parcel photo upload | No passenger upload controller | `BLOCKED_BE` | Authenticated upload contract | Preserve local UI; `photoUrl` remains `null` until remote URL contract exists | Controller audit found no passenger upload endpoint | 2026-07-15 |
| M8.1 | P0 | RAG policy assistant | BE `POST /v1/rag/chat` SSE and feedback | `IN_PROGRESS` | Auth, network | Token/done/error SSE, timeout/abort, conversation and feedback without mock fallback | API/parser/timeout/feedback tests pass; Android auth guard renders; live authenticated SSE not run | 2026-07-15 |
| M8.2 | P1 | Chat booking action | Catalog-backed deterministic intent extraction | `IN_PROGRESS` | M1.2, booking flow | Model output never becomes API payload; prefill only; explicit confirmation before booking/payment | Intent tests pass; Android shortcut opens booking UI without mutation; authenticated prefill/confirmation not run | 2026-07-15 |
| M8.3 | P1 | Chat tracking action | M6 history provider and M5 tracking | `IN_PROGRESS` | M5, M6 | Quick action opens Ticket history and lets user choose an eligible trip | Typed/static implementation passes; eligible-trip device flow not run | 2026-07-15 |
| M9 | P1 | Bus-type filter | Passenger trip-search response | `BLOCKED_BE` | Reliable vehicle metadata | Keep dormant; never hardcode every bus as one type | Current BE response lacks suitable vehicle metadata | 2026-07-15 |
| M10 | P1 | React Native performance and accessibility | `react-native-skills` | `FAILED_VERIFY` | All UI slices, release environment | Virtualized long lists, stable renders, responsive small screen/large font, release frame smoke | Static optimization tests and Android responsive regression pass; release frame gate is `BLOCKED_ENV`, so performance is not certified | 2026-07-15 |
| M11.1 | P0 | Deterministic date/time | Shared formatter contract | `VERIFIED` | None | Stable `DD/MM/YYYY HH:mm`; cached formatter | `format.test.ts`; TypeScript; full Jest and ESLint pass | 2026-07-15 |
| M11.2 | P0 | SecureStore Jest isolation | Production SecureStore adapter | `VERIFIED` | Jest mapper | Reset stored values, calls and mock implementations without production changes | `secureStoreMock.test.ts`; auth logout/cache isolation test; full Jest pass | 2026-07-15 |
| M12 | P0 | Full quality gate | Entire repository | `FAILED_VERIFY` | All modules | Static gates, Expo Doctor, authenticated Android flows, iOS, production release/performance | TypeScript/Jest/ESLint/diff/Expo config/debug build pass; Expo external checks, iOS, live BE and release perf remain unverified | 2026-07-15 |

## Contract matrix

| Capability | Method/path | Request | Response notes | Mobile rule |
| --- | --- | --- | --- | --- |
| Create booking | `POST /bookings` | Supported pickup/dropoff/shuttle/payment/voucher fields; `seats: [{seatNumber}]` | Top-level `status`, `paymentId` | Passenger contact stays local; `Idempotency-Key` is an HTTP header |
| Wallet | `GET /wallet` | None | `{userId,balance,currency}` | Cache key includes authenticated user ID |
| Wallet ledger | `GET /wallet/transactions` | `page`, `pageSize` | `CREDIT/DEBIT`, balances, references, note | Map network DTO to a separate UI model; use infinite pagination |
| Top-up | `POST /wallet/top-up` | `{amount,method:'VNPAY'}` | `{topUpRequestId,status,paymentRedirectUrl}` | Validate redirect; do not report success before payment result |
| Tracking latest | `GET /tracking/trips/{tripId}/latest` | UUID trip ID | Latest data may be `null` | Poll only while focused, online, foreground and non-terminal |
| Tracking trail | `GET /tracking/trips/{tripId}/trail` | UUID trip ID | Ordered GPS points | Initial fetch; refresh at most every five minutes; append/cap latest locally |
| Tracking ETA | `GET /tracking/trips/{tripId}/eta` | Valid trip and stop IDs | ETA/distance | Poll every 60 seconds only when a stop is available |
| RAG chat | `POST /rag/chat` through the v1 client base | `{message,conversationId?}` | SSE `token`, `done`, `error` | No fixture fallback; assistant text never becomes a network action payload |
| RAG feedback | `POST /rag/messages/{assistantMessageId}/feedback` | `{rating:1|-1}` | Standard success envelope | Validate UUID path segment |
| History/ticket detail | No usable passenger contract | N/A | Status endpoint is not ticket detail | Production unavailable; fixtures require authenticated explicit demo provider |
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
| Booking history fixtures | `RESTORE` | Authenticated explicit development/staging-demo provider; production unavailable |
| Digital Ticket history flow | `RESTORE` | Demo ticket-detail fixture; never misuse the status-only endpoint |
| Tracking/MockMap | `REPLACE_DATA_SOURCE` | Real REST tracking plus native map; do not restore `MockMapView` |
| Home booking-voucher promotions | `REPLACE_DATA_SOURCE` | Existing Booking promotions API/query keys |
| Editorial news/product promos | `BLOCKED_BE` | Distinct from booking vouchers; wait for a real editorial/campaign contract |
| Home recent shipments | `REPLACE_DATA_SOURCE` | Existing received-parcels API/hook |
| Referral rewards/invite card | `BLOCKED_BE` | No referral/reward contract; hard-coded coins/cash rewards are not restored |
| Home Wallet card | `RESTORE` | Real Wallet states and typed navigation |
| Parcel photo components | `RESTORE` | Shared native picker/local preview; upload stays BE-blocked |
| Bus-type filter | `BLOCKED_BE` | Dormant until passenger trip metadata supports it |
| RAG policy chatbot | `RESTORE` | Hardened BE SSE/feedback integration |
| Chat booking/tracking shortcuts | `RESTORE` | Deterministic prefill and explicit user-controlled navigation |

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
- [x] `npx.cmd jest --runInBand` - 55 suites, 256 tests
- [x] `npx.cmd eslint . --max-warnings=0`
- [x] `npx.cmd expo config --type public`
- [x] `git diff --check`
- [x] Android debug x86_64 native build and unauthenticated/guest smoke
- [ ] Expo Doctor external checks - `BLOCKED_ENV` (network `EACCES`)
- [ ] Authenticated Android: 100+ ledger, top-up return, ticket detail, tracking and live RAG
- [ ] iOS: safe areas, large text, keyboard, photo permission and map fallback - `BLOCKED_ENV`
- [ ] Android production release/frame gate - `BLOCKED_ENV` (real Maps key and Windows CMake path limit)

## Progress log

### 2026-07-15 - Corrective recovery implementation and verification

- Re-audited the Claude batch against BE `e2b85a1`; corrected booking, wallet, tracking and RAG contracts without blanket revert.
- Restored product scope through live adapters, local storage, labelled shells or explicit demo providers; no tracked module was deleted.
- Completed user-scoped Wallet/Top-up infrastructure, provider-safe History/Digital Ticket, Tracking lifecycle, Home sections, parcel local photos and deterministic chatbot actions.
- Added auth logout cache-isolation coverage and a shared responsive auth footer after Android small-screen/large-font smoke found overflow.
- Passed TypeScript, 55 Jest suites/256 tests, zero-warning ESLint, Expo config, diff check and Android debug native build.
- Recorded remaining blockers honestly: no authenticated live test account, no iOS environment, Expo Doctor external network denial, no real Maps key and Windows release CMake path limit.
