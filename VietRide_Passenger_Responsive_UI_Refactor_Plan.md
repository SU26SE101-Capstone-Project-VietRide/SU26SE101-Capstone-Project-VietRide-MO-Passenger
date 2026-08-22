# VietRide Passenger — Responsive UI Refactor Plan

> **Target:** `SU26SE101-Capstone-Project-VietRide-MO-Passenger`  
> **Tech stack:** Expo 54 · React Native 0.81.5 · React 19 · TypeScript  
> **Coding standard:** Vercel Labs `react-native-skills`  
> **Scope:** Responsive UI refactor without changing business logic, API contracts, navigation flows, or the current visual identity.

---

## 0. Objectives

This refactor must **not redesign the application** and must **not change existing business flows**.

The objective is:

```text
Current UI
    │
    ├── preserve UX / business logic
    ├── preserve navigation
    ├── preserve API / stores
    ├── preserve visual identity
    │
    ▼
Responsive UI Architecture
    │
    ├── 320px
    ├── 360px
    ├── 375px
    ├── 390px
    ├── 412px
    └── 430px+
```

The final result must guarantee:

- No horizontal overflow.
- No overlapping components.
- No hidden or inaccessible buttons.
- No incorrect text clipping.
- No cards exceeding screen width.
- No bottom navigation covering content.
- No keyboard covering critical inputs or actions.
- No notch/home-indicator overlap.
- Large font scale remains usable.
- No performance regression.
- No scattered responsive magic numbers throughout the project.

---

# PHASE 0 — Freeze Baseline & Create Safety Net

**Goal:** know exactly how the application behaves before changing responsive layout.

Create a dedicated branch:

```bash
git checkout -b refactor/responsive-layout
```

Do not modify `main` directly.

Run the existing quality checks before changing UI:

```bash
npm run lint
npm run check:i18n
npm test -- --runInBand
npx tsc --noEmit
```

The project already has the required foundations:

- Expo 54
- React Native 0.81.5
- TypeScript
- Jest
- ESLint
- FlashList
- Reanimated
- `expo-image`
- `react-native-safe-area-context`
- responsive font support

Therefore, **do not add another responsive library unless there is a proven technical need**.

## Baseline Device Matrix

Test at minimum:

| Width | Target case |
|---:|---|
| 320 | Very small phone |
| 360 | Small Android |
| 375 | Compact iPhone |
| 390 | Reference modern iPhone |
| 412 | Common Android |
| 430 | Large iPhone |

Font scale:

```text
1.0
1.2
1.4
```

For important screens, capture screenshots before refactoring for later comparison.

---

# PHASE 1 — Build the Responsive Foundation

This is the most important phase.

Do **not** repeat responsive conditions independently across screens:

```ts
const isSmall = width < 360;
```

```ts
const isTiny = width < 370;
```

```ts
const isPhone = width < 400;
```

That approach creates inconsistent breakpoint logic and long-term maintenance problems.

## Proposed Structure

```text
src/shared/layout/
├── responsive.ts
└── responsive.test.ts

src/shared/hooks/
├── useResponsiveLayout.ts
└── index.ts
```

## `responsive.ts`

Keep responsive classification as pure logic:

```ts
export const responsiveBreakpoints = {
  compact: 360,
  large: 430,
} as const;

export type WidthClass =
  | 'compact'
  | 'regular'
  | 'large';

export function getWidthClass(width: number): WidthClass {
  if (width < responsiveBreakpoints.compact) {
    return 'compact';
  }

  if (width >= responsiveBreakpoints.large) {
    return 'large';
  }

  return 'regular';
}
```

Requirements:

- No React.
- No state.
- No theme dependency.
- No device detection.
- Easy to unit test.

## `useResponsiveLayout.ts`

```ts
import { useWindowDimensions } from 'react-native';

import { spacing } from '@shared/theme';
import { getWidthClass } from '@shared/layout/responsive';

export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();

  const widthClass = getWidthClass(width);

  const isCompact = widthClass === 'compact';
  const isLarge = widthClass === 'large';

  const contentPaddingHorizontal = isCompact
    ? spacing.md
    : isLarge
      ? spacing.xl
      : spacing.lg;

  return {
    width,
    height,
    fontScale,
    widthClass,
    isCompact,
    isLarge,
    contentPaddingHorizontal,
  } as const;
}
```

`isCompact`, `isLarge`, and other layout classifications are **derived values**.

Do not store them in `useState`.

---

# PHASE 2 — Responsive Coding Standard

All new and modified responsive code should follow this layout priority:

```text
Flexbox
 ↓
minWidth: 0
 ↓
flexShrink
 ↓
flexWrap
 ↓
percentage / flex
 ↓
width class
 ↓
onLayout
 ↓
fixed dimensions only when justified
```

Avoid widespread usage of:

```ts
width: SCREEN_WIDTH * 0.83
```

Avoid module-level:

```ts
Dimensions.get('window').width
```

Do not introduce libraries only for basic responsive scaling such as:

```text
react-native-size-matters
react-native-responsive-screen
react-native-device-info
```

`useWindowDimensions()` plus Flexbox and local layout measurement should be sufficient.

---

# PHASE 3 — Clean Style System

The project already uses `useThemedStyles(...)` and `StyleSheet.create()`.

Preserve this architecture.

Preferred pattern:

```tsx
<View
  style={[
    styles.row,
    isCompact ? styles.rowCompact : null,
  ]}
/>
```

Avoid unnecessary inline style objects such as:

```tsx
<View
  style={{
    flexDirection: isCompact ? 'column' : 'row',
    padding: isCompact ? 12 : 20,
  }}
/>
```

Define reusable variants:

```ts
row: {
  flexDirection: 'row',
  gap: spacing.sm,
},

rowCompact: {
  flexDirection: 'column',
},
```

Styling rules:

- Use `gap` between children.
- Use `padding` for internal spacing.
- Keep layout values in theme tokens when possible.
- Use `borderCurve: 'continuous'` where compatible with rounded UI.
- Do not perform a project-wide visual rewrite just to modernize style syntax.
- Clean files incrementally when they are already being modified.

---

# PHASE 4 — Refactor Shared Components First

Do not start with HomeScreen.

Fix shared primitives first because multiple screens depend on them.

Recommended order:

```text
CustomTabBar
ProfileHeader
Button
Input
ItemPicker
ScannableCodeCard
Shared cards
```

---

## 4.1 CustomTabBar — Priority P0

The tab bar contains several fixed dimensions:

```text
bar       76
button    56
fab slot  68
fab       58
active    46
```

Do not rewrite working animation architecture.

The current approach should keep animations focused on:

```text
transform
opacity
```

instead of animating layout properties such as:

```text
width
height
top
left
margin
padding
```

## Compact Layout

```text
320–359px

outer margin     12
bar height       ~68
fab slot         ~56
fab              ~52
active circle    ~42
```

## Regular Layout

```text
360–429px

margin           16
height           76
fab slot         68
fab              58
```

## Large Layout

```text
>= 430px

keep dimensions close to regular
increase available breathing room
do not scale FAB indefinitely
```

Touch targets should remain approximately `44x44` or larger.

---

# PHASE 5 — HomeScreen

Home is a **P0 responsive screen**.

Audit:

```text
Home
├── ProfileHeader
├── Ticket / Parcel tabs
├── Origin
├── Destination + swap
├── Departure date
├── Passenger count
├── Return date
├── Round-trip switch
├── Search / Continue
├── Wallet
├── Popular routes
├── Recent searches
├── Promotions
└── Recent parcels
```

Do not create desktop-oriented breakpoints.

This is a passenger mobile app.

Use only:

```text
compact phone
regular phone
large phone
```

## Home Compact Strategy

Regular layout:

```text
[ Date              ][ Passenger ]
```

Compact layout:

```text
[ Date                         ]
[ Passenger                    ]
```

Round trip regular:

```text
[ Return date ][ Round trip ● ]
```

Round trip compact:

```text
[ Return date                ]
[ Round trip              ● ]
```

Do not truncate important controls just to keep two columns.

## Destination Row

Target structure:

```text
┌──────────────────────┐ ┌────┐
│ Destination          │ │ ↕  │
└──────────────────────┘ └────┘
```

The destination selector should use:

```ts
flex: 1,
minWidth: 0,
```

The swap button should retain a fixed touch target.

Do not use a fixed selector width.

---

# PHASE 6 — Booking Flow

Audit the complete booking flow:

```text
City Picker
Date Picker
Trip Search
Trip Result
Trip Detail
Seat Selection
Passenger Info
Pickup / Dropoff
Checkout
Payment
Digital Ticket
Cancellation
```

## 6.1 SeatGrid — Preserve Existing Responsive Logic

SeatGrid already has one of the better responsive implementations in the codebase.

It uses screen dimensions and calculates:

```text
cardWidth
innerWidth
availableWidth
seatSize
matrixWidth
```

Seat sizes are constrained approximately within:

```text
34 → 58
```

Treat SeatGrid as a **reference implementation** rather than rewriting it.

Add regression tests for:

```text
320px
360px
390px
430px
```

Expected conditions:

```text
seatSize >= MIN_SEAT_SIZE
seatSize <= MAX_SEAT_SIZE
seat matrix remains usable
seat matrix does not unexpectedly overflow
```

Do not change working seat business logic.

---

# PHASE 7 — Digital Ticket / QR

`ScannableCodeCard` currently has a default QR size.

Keep scanner reliability as the priority.

Use the pattern:

```text
available width
       ↓
preferred QR size
       ↓
clamp(min, preferred, max)
```

Example:

```ts
const qrSize = Math.min(
  184,
  Math.max(148, availableWidth - spacing.xl * 2),
);
```

Whenever possible, let the parent know the available width and pass the final size to the QR component.

Avoid unnecessary global screen dependencies inside reusable components.

---

# PHASE 8 — Parcel Flow

Parcel is **P0/P1** because the flow is long and includes fixed bottom actions.

Audit:

```text
Create Parcel
├── Station selection
├── Package size
├── Dimensions
├── Weight
├── Category
├── Date selection
├── Trip options
├── Sender
├── Recipient
├── Pricing
├── Voucher
├── Payment
└── Action bar
```

Preserve correct existing bottom safe-area handling.

## Two-Button Action Rows

Regular:

```text
[ Change terminal ][ Check more ]
```

Compact:

```text
[ Change terminal             ]
[ Check more                  ]
```

Example:

```ts
actions: {
  flexDirection: 'row',
  gap: spacing.sm,
},

actionsCompact: {
  flexDirection: 'column',
},
```

Do not force button text into multiple lines just to preserve a horizontal row.

---

# PHASE 9 — Booking History

History already contains defensive responsive patterns such as:

```text
minWidth: 0
flexWrap
maxWidth
FlashList
```

Therefore this is primarily:

```text
verify
↓
fix edge cases
↓
do not rewrite
```

Audit:

- Ticket cards.
- Parcel cards.
- Status badges.
- Reference numbers.
- Route names.
- Vehicle information.
- Detail rows.
- Action buttons.
- Long localized text.

---

# PHASE 10 — List Performance Audit

List performance is a critical part of the Vercel React Native skillset.

Audit the entire app for:

```text
.map(...)
ScrollView + dynamic data
FlatList
FlashList
horizontal ScrollView
```

## Static Collections

Examples:

```text
2 tabs
3 payment methods
4 package sizes
```

Do not mechanically convert every tiny static group into FlashList.

## Dynamic Collections

Examples:

```text
Trip results
Booking history
Parcel history
Stations
Notifications
Messages
Large search results
```

Prefer:

```text
FlashList
```

The project already includes `@shopify/flash-list`.

Do not add another list library unless necessary.

---

# PHASE 11 — Clean List Item Architecture

When modifying a hot list, apply the following rules.

## Avoid Inline Objects

Avoid:

```tsx
renderItem={({ item }) => (
  <TripCard
    style={{ opacity: item.disabled ? 0.5 : 1 }}
  />
)}
```

Prefer stable styles or derive the state inside the memoized row.

## Prefer Primitive Props for Hot List Items

If a row only needs a small subset of data, prefer:

```tsx
<HistoryCard
  id={booking.id}
  status={booking.status}
  departure={booking.departure}
/>
```

instead of unnecessarily passing large reconstructed objects.

Do not over-apply this rule when a component legitimately needs most of the item.

## Stable Callbacks

Avoid creating unnecessary callback instances inside hot `renderItem` functions.

Use stable callbacks when performance matters.

---

# PHASE 12 — Chatbot

Chatbot is **P1**.

Audit header structure:

```text
Back
Avatar
Bot name
Status
New conversation
```

Use defensive layout:

```ts
botInfo: {
  flex: 1,
  minWidth: 0,
},
```

For names/status that should remain one line:

```tsx
numberOfLines={1}
```

Audit composer with:

```text
keyboard closed
keyboard opened
long placeholder
streaming
offline state
profile-required state
long user messages
long assistant messages
font scale 1.4
```

Do not double-apply keyboard inset and safe-area inset.

---

# PHASE 13 — Tracking

Tracking already contains strong adaptive behavior.

Preserve existing logic when it correctly uses:

```text
onLayout
container dimensions
adaptive sheet height
```

Do not rewrite Tracking solely for architectural consistency.

Regression test:

```text
short phone
tall phone
expanded sheet
collapsed sheet
parcel tracking
trip tracking
shuttle tracking
```

---

# PHASE 14 — Measurement Standard

For responsive layout measurement, prefer:

```text
useWindowDimensions
onLayout
```

Use imperative measurement only where the component truly needs it.

Important compatibility constraint:

```text
Current project:
React Native 0.81.5
```

Do not blindly copy APIs or examples requiring React Native 0.82+.

For the current version:

```text
RN 0.81
    │
    ├── useWindowDimensions
    ├── onLayout
    └── legacy measure only if necessary
```

---

# PHASE 15 — Safe Area Standard

Do not enforce one single safe-area wrapper pattern across every screen.

Use the correct strategy by screen type.

## Scrollable Content

Prefer native scroll inset handling where appropriate:

```tsx
contentInsetAdjustmentBehavior="automatic"
```

## Fixed Top UI

Use proper top safe area handling.

## Fixed Bottom Actions

Use:

```text
useSafeAreaInsets().bottom
```

only where needed.

Avoid double-applying:

```text
SafeAreaView
+
manual padding
+
content inset
```

for the same edge.

---

# PHASE 16 — Profile, Wallet & Settings

Priority **P2**.

Audit patterns:

```text
title + value
icon + text + action
balance + actions
transaction rows
settings rows
profile header
language selection
theme selection
```

Long text rows should commonly use:

```ts
flex: 1,
minWidth: 0,
```

Where wrapping is allowed:

```ts
flexShrink: 1,
```

Identifiers or codes may instead use:

```tsx
numberOfLines={1}
ellipsizeMode="middle"
```

Choose based on semantic meaning.

---

# PHASE 17 — Image Standard

For application images/media, continue using:

```text
expo-image
```

Do not introduce new React Native `Image` usage unless there is a specific technical reason.

Example:

```tsx
<Image
  style={styles.image}
  contentFit="cover"
/>
```

Let the parent component determine responsive geometry.

Do not make layout dependent on the original image asset size.

---

# PHASE 18 — Do Not Overuse `useMemo` / `useCallback`

Clean code does **not** mean wrapping every expression in memoization.

Use memoization where it produces measurable or likely benefit:

```text
FlashList renderItem
expensive layout calculations
large derived arrays
stable list callbacks
Reanimated integrations
expensive memoized children
```

Do not use `useMemo` for trivial operations such as:

```ts
const isCompact = width < 360;
```

Keep the code understandable first.

---

# PHASE 19 — Responsive Test Helpers

Pure responsive functions should be covered by unit tests.

Example:

```ts
describe('getWidthClass', () => {
  it.each([
    [320, 'compact'],
    [359, 'compact'],
    [360, 'regular'],
    [390, 'regular'],
    [429, 'regular'],
    [430, 'large'],
  ])('resolves %ipx', (width, expected) => {
    expect(getWidthClass(width)).toBe(expected);
  });
});
```

Do not snapshot the whole application just to claim responsive coverage.

Prefer behavioral tests.

---

# PHASE 20 — Screen Regression Matrix

After each module is refactored, verify:

| Screen | 320 | 360 | 390 | 430 | Font 1.4 |
|---|:---:|:---:|:---:|:---:|:---:|
| Login | ✓ | ✓ | ✓ | ✓ | ✓ |
| Register | ✓ | ✓ | ✓ | ✓ | ✓ |
| Home Ticket | ✓ | ✓ | ✓ | ✓ | ✓ |
| Home Parcel | ✓ | ✓ | ✓ | ✓ | ✓ |
| Trip Search | ✓ | ✓ | ✓ | ✓ | ✓ |
| Seat Map | ✓ | ✓ | ✓ | ✓ | ✓ |
| Checkout | ✓ | ✓ | ✓ | ✓ | ✓ |
| Digital Ticket | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create Parcel | ✓ | ✓ | ✓ | ✓ | ✓ |
| History Ticket | ✓ | ✓ | ✓ | ✓ | ✓ |
| History Parcel | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tracking | ✓ | ✓ | ✓ | ✓ | ✓ |
| Chatbot | ✓ | ✓ | ✓ | ✓ | ✓ |
| Profile | ✓ | ✓ | ✓ | ✓ | ✓ |
| Wallet | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# PHASE 21 — Refactor Priority

Recommended implementation priority:

```text
P0
│
├── Responsive foundation
├── CustomTabBar
├── Home
├── Booking core
├── Checkout
├── Digital Ticket
└── Parcel
       │
       ▼
P1
│
├── History
├── Chatbot
├── Notifications
└── Tracking verification
       │
       ▼
P2
│
├── Profile
├── Wallet
├── Settings
├── Auth polish
└── Secondary screens
```

Do not modify the entire app in one uncontrolled batch.

---

# PHASE 22 — Commit Strategy

Avoid one huge commit such as:

```text
fix responsive
```

with dozens of unrelated files.

Recommended commits:

```text
refactor(ui): add responsive layout primitives

fix(ui): adapt floating tab bar for compact screens

fix(home): support compact phone layouts

fix(booking): harden booking layouts across phone widths

fix(parcel): adapt parcel actions for compact screens

fix(history): harden ticket and parcel cards

fix(chatbot): adapt header and composer layout

test(ui): add responsive layout coverage

chore(ui): clean responsive styling patterns
```

Each phase should be independently reviewable and revertible.

---

# PHASE 23 — Out of Scope / Forbidden Changes

During this responsive refactor:

```text
❌ Do not rewrite API architecture
❌ Do not rewrite React Query architecture
❌ Do not rewrite Zustand stores
❌ Do not change backend contracts
❌ Do not change navigation flows
❌ Do not change VNPay logic
❌ Do not change Firebase logic
❌ Do not change tracking business logic
❌ Do not change seat-selection business rules
❌ Do not redesign visual identity
❌ Do not add unnecessary responsive dependencies
❌ Do not scale the entire UI with width / 390
❌ Do not convert every pixel to percentages
❌ Do not scatter dozens of arbitrary breakpoints
❌ Do not add a global ResponsiveProvider unless it is justified
```

Responsive concerns belong primarily in the presentation layer.

---

# PHASE 24 — Definition of Done Per Screen

A screen is only considered complete when all applicable checks pass:

```text
[ ] No horizontal overflow at 320px
[ ] No overlapping components
[ ] No clipped interactive content
[ ] No content hidden behind bottom navigation
[ ] No keyboard covering important input/action
[ ] Correct Android safe-area behavior
[ ] Correct iOS safe-area behavior
[ ] Long Vietnamese text remains usable
[ ] Long English text remains usable
[ ] Font scale 1.4 remains usable
[ ] Touch targets remain accessible
[ ] Dark mode works
[ ] Light mode works
[ ] Loading state works
[ ] Empty state works
[ ] Error state works
[ ] Disabled state works
[ ] Existing unit tests pass
[ ] TypeScript passes
[ ] ESLint passes
[ ] i18n check passes
[ ] No new console warnings
```

---

# PHASE 25 — Final Quality Gate

Before merging:

```bash
npm run lint
npm run check:i18n
npm test -- --runInBand
npx tsc --noEmit
```

Run a complete booking regression:

```text
Auth
 ↓
Home
 ↓
Search Trip
 ↓
Select Trip
 ↓
Select Seats
 ↓
Checkout
 ↓
Payment
 ↓
History
 ↓
Digital Ticket
 ↓
Tracking
```

Run a complete parcel regression:

```text
Home
 ↓
Parcel
 ↓
Select Terminals
 ↓
Package Details
 ↓
Trip
 ↓
Pricing
 ↓
Payment
 ↓
History
 ↓
Tracking
```

---

# Target Architecture

```text
src/
│
├── shared/
│   │
│   ├── layout/
│   │   ├── responsive.ts
│   │   └── responsive.test.ts
│   │
│   ├── hooks/
│   │   ├── useResponsiveLayout.ts
│   │   └── useThemedStyles.ts
│   │
│   ├── theme/
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── ...
│   │
│   └── components/
│
├── features/
│   ├── auth/
│   ├── home/
│   ├── booking/
│   ├── parcel/
│   ├── tracking/
│   ├── chatbot/
│   └── profile/
│
└── app/
```

Responsive responsibilities:

```text
theme/
    │
    ├── typography
    └── spacing

layout/
    │
    ├── breakpoint
    └── size classification

useResponsiveLayout()
    │
    ▼
Screen / component
    │
    ├── Flexbox
    ├── minWidth
    ├── flexWrap
    ├── compact style
    └── large style
```

Avoid introducing a codebase full of:

```text
wp()
hp()
scale()
moderateScale()
```

unless a very specific use case proves that such behavior is necessary.

---

# Implementation Batches

The recommended execution plan is divided into eight batches.

## Batch 1 — Responsive Foundation

```text
Responsive primitives
Responsive hook
Breakpoint tests
Shared layout rules
```

## Batch 2 — Shared Navigation & Headers

```text
CustomTabBar
ProfileHeader
Shared buttons
Shared inputs
Shared selectors
```

## Batch 3 — Home

```text
Home Ticket mode
Home Parcel mode
Search form
Meta rows
Cards
Home lists
```

## Batch 4 — Booking

```text
Trip search
Trip results
Trip details
Seat selection verification
Passenger information
Checkout
Payment
Digital Ticket
Cancellation
```

## Batch 5 — Parcel

```text
Create Parcel full flow
Station selection
Package information
Trip selection
Sender / Receiver
Pricing
Voucher
Payment
Bottom action bar
```

## Batch 6 — History / Profile / Wallet

```text
Ticket history
Parcel history
Profile
Wallet
Settings
```

## Batch 7 — Chatbot / Tracking / Notifications

```text
Chatbot header
Chatbot thread
Chatbot composer
Tracking regression
Notification lists
```

## Batch 8 — Full Regression & Performance Cleanup

```text
Device matrix
Font scaling
Light / Dark mode
Keyboard behavior
Safe areas
FlashList audit
Render optimization
Lint
Tests
TypeScript
i18n
```

---

# Engineering Principles

The refactor must follow these principles:

1. **Do not rewrite working architecture without reason.**
2. **Fix shared primitives before individual screens.**
3. **Prefer Flexbox over mathematical screen scaling.**
4. **Use responsive breakpoints only when layout behavior actually changes.**
5. **Use `minWidth: 0`, `flexShrink`, and `flexWrap` deliberately.**
6. **Preserve existing business logic.**
7. **Preserve API contracts.**
8. **Preserve navigation flows.**
9. **Preserve visual identity.**
10. **Use FlashList for meaningful dynamic collections.**
11. **Avoid unnecessary inline objects in hot lists.**
12. **Avoid unstable callback references in performance-sensitive lists.**
13. **Use `expo-image` for image content.**
14. **Use `onLayout` when actual rendered size is required.**
15. **Animate `transform` and `opacity` instead of layout properties.**
16. **Do not store derived responsive values in state.**
17. **Do not overuse `useMemo` or `useCallback`.**
18. **Do not add unnecessary dependencies.**
19. **Every modified screen must pass the responsive test matrix.**
20. **Performance after refactoring must be equal to or better than before.**

---

# Final Acceptance Criteria

The responsive refactor is complete only when:

```text
320px phone      PASS
360px phone      PASS
375px phone      PASS
390px phone      PASS
412px phone      PASS
430px phone      PASS

Font scale 1.0   PASS
Font scale 1.2   PASS
Font scale 1.4   PASS

Light mode       PASS
Dark mode        PASS

Android          PASS
iOS              PASS

Lint             PASS
TypeScript       PASS
Jest             PASS
i18n             PASS
```

And all critical business flows continue to work without behavioral regression.

---

## Summary

The goal is **not to make every number dynamic**.

The goal is to build a small, consistent responsive layer and use it only when layout behavior needs to change.

Existing responsive implementations such as SeatGrid and Tracking should be preserved and used as references. Higher-risk areas such as Home, CustomTabBar, booking/checkout, Digital Ticket, and Parcel should be addressed first.

The final codebase should remain:

```text
clean
predictable
testable
performant
responsive
maintainable
```

without turning the responsive refactor into a full application rewrite.
