---
name: VietRide Design System
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dadf'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f9'
  surface-container: '#ebeef3'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#e0e3e8'
  on-surface: '#181c20'
  on-surface-variant: '#3c4948'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f6'
  outline: '#6c7a78'
  outline-variant: '#bbc9c8'
  surface-tint: '#006a67'
  primary: '#006a67'
  on-primary: '#ffffff'
  primary-container: '#2ac1bc'
  on-primary-container: '#004a48'
  inverse-primary: '#4fdad5'
  secondary: '#b81120'
  on-secondary: '#ffffff'
  secondary-container: '#dc3135'
  on-secondary-container: '#fffbff'
  tertiary: '#715d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#ceab00'
  on-tertiary-container: '#4f4000'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#71f7f1'
  primary-fixed-dim: '#4fdad5'
  on-primary-fixed: '#00201f'
  on-primary-fixed-variant: '#00504d'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#ffb3ae'
  on-secondary-fixed: '#410004'
  on-secondary-fixed-variant: '#930014'
  tertiary-fixed: '#ffe177'
  tertiary-fixed-dim: '#ebc300'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#554500'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#e0e3e8'
typography:
  display-bold:
    fontFamily: Be Vietnam Pro
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '800'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-bold:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.2'
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  card-padding: 24px
  section-gap: 32px
  bento-gutter: 16px
  container-margin: 20px
---

## Brand & Style

This design system draws inspiration from the iconic BAEMIN aesthetic, blending hyper-modernity with a quirky, approachable personality. The target audience is urban commuters and Gen-Z travelers who value speed, humor, and a high-end digital experience. 

The visual style is a hybrid of **Bento-box Minimalism** and **High-Contrast Boldness**. It utilizes structured, grid-based layouts to organize information, but softens the rigidity with "squircle" geometry and playful, oversized typography. The emotional goal is to make bus booking feel less like a chore and more like a delightful interaction through a "Digital Toy" interface—vibrant, tactile, and extremely responsive.

## Colors

The palette is anchored by a **Vibrant Mint Green**, used to signal action and brand identity. This is contrasted against an **Off-white** background to ensure that white Bento-box cards pop with subtle depth.

- **Primary (#2AC1BC):** Used for key brand moments and primary CTA backgrounds.
- **Secondary (#FF4B4B):** A "Pop-out" coral used for alerts, live indicators, or urgent bus status.
- **Tertiary (#FFD400):** A sunny yellow for "pro" features or loyalty badges.
- **Neutral/Text (#212529):** A dark charcoal, avoiding pure black to maintain a modern, sophisticated feel while ensuring maximum legibility.
- **Card Surface (#FFFFFF):** Pure white for cards to contrast against the off-white background.

## Typography

This design system utilizes **Be Vietnam Pro** for its friendly yet clean geometric construction. The typographic hierarchy is intentionally dramatic. 

- **Headlines:** Use Extra Bold (800) weights with tight letter-spacing to create a "poster" effect. Headlines should often be slightly oversized compared to standard UI practices.
- **Body:** Use Medium (500) for standard readability to maintain the "thick" visual weight of the brand.
- **CTA Text:** Always Bold (700) or Extra Bold (800) to match the chunkiness of the buttons.

## Layout & Spacing

The layout follows a **Bento-box Grid** philosophy. Content is encapsulated in discrete, squircle-shaped cards of varying sizes that fit together like a puzzle.

- **Grid:** A 4-column fluid grid for mobile.
- **Spacing Rhythm:** Based on an 8px scale.
- **Bento Logic:** Use generous 16px gutters between cards. For secondary info, cards can span 2 columns; for primary journey details, cards span the full 4 columns. 
- **Whitespace:** Emphasize "Breathable Playfulness." Margin between the screen edge and content should be a minimum of 20px to allow the card shadows to breathe.

## Elevation & Depth

Depth is conveyed through **Tonal Stacking** and **Soft Ambient Shadows**. 

1. **The Canvas:** The base layer is the Off-white (#F8F9FA) background.
2. **The Bento Card:** Cards are Pure White (#FFFFFF) with a very soft, large-radius shadow (Blur: 20px, Y: 8px, Color: #212529 at 5% opacity).
3. **The Floating Action:** Primary CTA buttons and "Live" status chips use a slightly more aggressive shadow (10% opacity) to appear physically lifted above the cards.
4. **No Borders:** Do not use high-contrast borders; allow the subtle shadow and color change between the background and card to define the edges.

## Shapes

The design system uses a **Squircle (Super-rounded)** shape language to maintain a friendly, "squishy" atmosphere.

- **Standard Cards:** Use 24px (1.5rem) corner radius. 
- **Buttons:** Large CTAs use a fully rounded (Pill) shape or a 20px radius to appear chunky and touchable.
- **Small Elements:** Chips and Input fields use a 12px (0.75rem) radius.
- **Icons:** Should feature rounded terminals and thick strokes (2px to 2.5px) to match the weight of the typography.

## Components

- **Floating CTAs:** Oversized, mint-green buttons that sit at the bottom of the screen. They feature Extra Bold text and a subtle "bounce" animation on press.
- **Bento Cards:** High-contrast containers for bus routes, seating charts, and tickets. They use the squircle radius and the primary shadow style.
- **Status Chips:** Small, playful pills (e.g., "On Time", "Sold Out") using secondary or tertiary colors with white bold text.
- **Input Fields:** Clean, white surfaces with an 8px offset shadow. On focus, the border-color transitions to the Primary Mint.
- **Playful Empty States:** Large, custom-illustrated "cute" characters (Vietnamese-inspired street food or bus mascots) paired with bold, quirky microcopy.
- **Custom Icons:** Thick-stroke, monoline icons with slightly rounded corners. Avoid sharp points.
- **Progress Trackers:** A "Bus-on-a-string" visual for journey tracking, using a thick mint line and a small bus icon moving along it.