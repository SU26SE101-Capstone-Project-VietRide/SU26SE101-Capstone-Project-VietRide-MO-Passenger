# Payment Redirect URL in History — Mobile Plan

## Scope

Use `paymentRedirectUrl: string | null` supplied by existing Passenger History data. Do not create a new Mobile API, hook, storage layer, or local payment session. The app must resume the same VNPay redirect only when BE exposes a non-null URL.

The button copy is **“Tiếp tục thanh toán”**, not “Thanh toán lại”, because the app must not create a new booking, parcel, payment, or VNPay transaction.

## Reuse existing code

- `usePassengerHistory` and `passengerHistoryKeys` for fetching and cache isolation.
- `openPaymentRedirect` for validated external URL opening.
- `isTrustedPaymentRedirectUrl` for schema-level defense in depth.
- `isParcelPaymentPending` for Parcel deposit/final eligibility.
- `useIsAppActive` for foreground reconciliation.
- Existing FlashList, memoized rows, i18n, theme tokens, error mapping, and `PaymentDeepLinkHandler`.

No duplicate URL opener, duplicate History hook, or parallel API client is allowed.

## Phase 1 — Contract parsing and types

1. Add `paymentRedirectUrl: string | null` to the common Passenger History item base type so Ticket and Parcel rows are both supported.
2. Extend the Zod response schema, not only TypeScript types.
3. Parse the field as:

```ts
z.string()
  .trim()
  .min(1)
  .max(2048)
  .url()
  .refine(isTrustedPaymentRedirectUrl)
  .nullable()
  .default(null)
```

`default(null)` lets a newly deployed Mobile app remain compatible with an older BE response during rollout.

4. Never persist the signed URL in Zustand, AsyncStorage, navigation state, analytics, or logs.

## Phase 2 — History UI

Implement the CTA in `BookingHistoryScreen`.

### Visibility rules

| Item | Show “Tiếp tục thanh toán” when |
| --- | --- |
| Ticket | `status === 'PENDING_PAYMENT'` and URL is non-null |
| Parcel deposit/final | `isParcelPaymentPending(status)` and URL is non-null |

### Interaction design

- Keep the CTA in its own footer `Pressable`; do not nest it inside card navigation.
- Minimum touch target: 44 px.
- Preserve existing theme colors, spacing, typography, dark mode, dynamic text handling, and FlashList layout.
- Add row-level opening state: spinner and accessibility state only on the active row.
- Use one screen-level single-flight ref. While an external redirect is opening, other CTA presses are ignored.
- Route card press opens ticket/parcel details only. CTA opens VNPay only.
- When navigating to a detail screen, remove `paymentRedirectUrl` from the navigation payload so a signed URL is not retained in navigation state.

## Phase 3 — Payment return and lifecycle

1. Before opening the redirect, mark that the screen is awaiting a payment return.
2. Reuse `useIsAppActive`: when the app returns foreground after that action, refetch active history exactly once.
3. Update `PaymentDeepLinkHandler` to invalidate active user-scoped Passenger History queries after the VNPay deep-link return.
4. Do not infer payment success from query parameters. Only refreshed BE history, Booking status, and Parcel status are authoritative.
5. If the URL is no longer valid, use the existing payment error presentation; after refresh BE returns `null` and the CTA disappears.

## Performance requirements

- Keep `TicketHistoryRow` and `ParcelHistoryRow` memoized.
- Pass primitive opening state and stable callbacks into rows.
- Keep `renderItem`, key extractors, pagination callbacks, and list headers/footers stable.
- Do not refetch every History row and do not poll while the screen is backgrounded.
- Reuse the user-scoped React Query key so logout/account switching cannot show another user’s cached redirect.

## Device and release verification

- Ticket one-way and round-trip both resume the correct VNPay session.
- Parcel deposit and final-payment cards show the CTA only when BE gives a valid URL.
- Double tap opens only one external browser/payment session.
- Closing VNPay, returning via deep link, and returning via app foreground each refresh History correctly.
- Small Android/iOS screens, large font, keyboard, long history lists, dark/light theme, and offline/error cases remain usable.
- Run TypeScript, ESLint, native Android/iOS build, and manual device flow verification. Mobile Jest work remains out of scope unless explicitly requested.
