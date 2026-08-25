# Responsive App Launch Screen Design

## Goal

Redesign both the native splash and the React bootstrap screen so the VietRide logo and every visible line of Vietnamese or English text remain available on short, narrow, inset-heavy, and large-font mobile screens. Preserve the existing launch sequence, translations, theme, mascot, navigation, authentication behavior, and loading duration.

## Visual direction

Use an adaptive brand stack: the padded VietRide driver mark remains the single signature visual, surrounded by the existing restrained teal ambient glows. The foreground stays quiet and centered so the launch state reads immediately. No new copy, controls, cards, or artificial delay are introduced.

## Native splash

- Use `app_icon_adaptive_foreground.png` as the splash source because its transparent safe padding keeps the raster `VietRide` wordmark away from platform masks and bitmap edges.
- Keep `resizeMode: contain` and the existing VietRide launch background.
- Update the icon-generation script so only splash density assets use the padded source; launcher and notification sources retain their existing behavior.
- Regenerate committed Android `drawable-*/splashscreen_logo.png` assets from that source. Future iOS prebuilds receive the same source through Expo config.

## React launch layout

- Keep a full-screen themed background with ambient decorations in an absolute layer. Only this decoration layer may clip overflow.
- Put foreground content inside `SafeAreaView` and a vertical `ScrollView` with `contentContainerStyle.flexGrow = 1`. Center the stack when it fits; allow scrolling when height, safe-area insets, or accessibility font size make it taller than the viewport.
- Derive layout from `useWindowDimensions` through the existing responsive foundation. Use the existing width classes: compact below 360 dp, regular from 360–429 dp, and large at 430 dp or wider.
- Compute a bounded logo frame from width, usable height, and font scale. The frame may shrink on short/compact screens but never below a legible minimum or grow beyond the current visual hierarchy.
- Keep foreground width at 100% with a bounded maximum, `minWidth: 0`, responsive horizontal padding, and wrap-safe text.
- Never set `numberOfLines` or an ellipsis on the tagline or loading message. Remove the old `1.35` font multiplier cap so system accessibility sizing is respected; the scroll fallback owns overflow.
- Render the progress indicator and message in a row on regular screens. Switch them to a centered column when width is compact or font scale is large, preventing the spinner from stealing the message's wrapping width.
- Preserve `MotionFade`, but do not add animation that changes layout or delays navigation.

## Behavior and accessibility

- Keep all existing translations and the optional `message` prop.
- Keep the screen-level loading label, logo label, and progressbar semantics.
- Mark the changing status copy as a polite live region where supported.
- Keep light/dark status-bar behavior and theme restoration.
- Do not change preference hydration, font loading, auth restoration, API timeout, navigation, or global loading overlay behavior.

## Verification

- Unit-test the pure responsive geometry at widths 320, 360, 390, and 430 dp; short and regular heights beginning at 480 dp; font scales 1.0, 1.4, and 2.0; and representative safe-area insets.
- Render-test compact/short/large-font and large-screen variants. Assert that both tagline and full custom loading messages remain present, wrap without line caps, the compact progress layout becomes vertical, and the foreground is scrollable.
- Cover Vietnamese and English copy plus light/dark theme behavior.
- Verify Expo public config references the padded splash asset and generated Android splash density files retain internal transparent padding.
- Run targeted Jest, TypeScript, ESLint, i18n parity, Expo config inspection, and `git diff --check`.

## Scope boundaries

- Passenger Mobile only; no Backend or public contract changes.
- No changes to login, booking, parcel, tracking, Mapbox, Goong, Firebase, FCM, GPS, or Socket.IO.
- No commit, push, release, or generated iOS project is required for this implementation session.
