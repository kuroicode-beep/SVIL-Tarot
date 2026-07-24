---
name: Ethereal Clarity
colors:
  surface: '#131318'
  surface-dim: '#131318'
  surface-bright: '#39383e'
  surface-container-lowest: '#0e0e13'
  surface-container-low: '#1b1b20'
  surface-container: '#1f1f24'
  surface-container-high: '#2a292f'
  surface-container-highest: '#35343a'
  on-surface: '#e4e1e9'
  on-surface-variant: '#c1c7ce'
  inverse-surface: '#e4e1e9'
  inverse-on-surface: '#303035'
  outline: '#8c9198'
  outline-variant: '#42474d'
  surface-tint: '#a2cbed'
  primary: '#edf5ff'
  on-primary: '#00344e'
  primary-container: '#b3ddff'
  on-primary-container: '#38627f'
  inverse-primary: '#396380'
  secondary: '#8dcdff'
  on-secondary: '#00344f'
  secondary-container: '#036c9e'
  on-secondary-container: '#cde7ff'
  tertiary: '#fff2e0'
  on-tertiary: '#402d00'
  tertiary-container: '#fdd277'
  on-tertiary-container: '#775904'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c9e6ff'
  primary-fixed-dim: '#a2cbed'
  on-primary-fixed: '#001e2f'
  on-primary-fixed-variant: '#1e4b67'
  secondary-fixed: '#cae6ff'
  secondary-fixed-dim: '#8dcdff'
  on-secondary-fixed: '#001e30'
  on-secondary-fixed-variant: '#004b70'
  tertiary-fixed: '#ffdf9f'
  tertiary-fixed-dim: '#eac168'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5b4300'
  background: '#131318'
  on-background: '#e4e1e9'
  surface-variant: '#35343a'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '800'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  label-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  margin-mobile: 24px
  margin-desktop: 64px
  gutter: 24px
  touch-target-min: 50px
  container-max: 1200px
---

## Brand & Style

The design system is engineered for a high-contrast, immersive tarot experience that prioritizes accessibility and low-vision usability without sacrificing a mystical, modern atmosphere. The brand personality is "Occult Precision"—combining the spiritual nature of tarot with a rigorous, high-utility interface.

The style is **High-Contrast Dark**, utilizing a deep obsidian foundation to make celestial accents and typography vibrate with clarity. It avoids subtle gradients and delicate lines in favor of bold, structural elements and thick 2px borders. Every interaction is designed to feel deliberate, tactile, and unmistakable, ensuring the mystical journey is navigable for all users.

## Colors

The palette is strictly dark-mode, designed to minimize eye strain while maximizing legibility through significant value contrast. 

- **Background & Surface:** Use a tiered "Obsidian" scale. The base background is the deepest black, with surfaces stepping up in lightness to provide structural hierarchy.
- **Accents:** `Accent-strong` (#b3ddff) is reserved for primary actions and must be paired with black text for maximum contrast. `Accent` (#7ec8ff) handles secondary interactive states.
- **A11Y & Semantic:** A dedicated **Focus Ring** color (#ffd479) is utilized for all keyboard and screen-reader navigation. Status colors (Positive, Warning, Negative) are tuned for high vibrancy against the dark background.

## Typography

Typography is the cornerstone of this design system's accessibility. 
- **Body Text:** A strict minimum of 18px is enforced for all reading material to support low-vision users. Atkinson Hyperlegible Next is used for its distinct character shapes, reducing ambiguity between similar letters.
- **Headings:** Hanken Grotesk provides a bold, modern, and authoritative weight that creates a clear visual anchor on the page.
- **Korean Localization:** Use **Pretendard JP/KR** as the primary fallback, maintaining a minimum weight of 600 for headings and 400 for body copy.
- **Readability:** All text must maintain a contrast ratio of at least 7:1 against its background.

## Layout & Spacing

This design system uses a **Fluid Edge-to-Edge** model. On mobile, the interface uses 24px side margins to ensure content doesn't bleed into hardware curves while maintaining an immersive "full-screen" feel.

- **Rhythm:** An 8px grid system governs all padding and margins. 
- **Touch Targets:** A mandatory minimum height and width of 50px is applied to all interactive elements (buttons, toggles, menu items) to accommodate motor-control and low-vision accuracy.
- **Density:** The layout is intentionally "low-density," allowing for significant breathing room between blocks of information to prevent visual clutter and cognitive overload.

## Elevation & Depth

Depth is conveyed through **Tonal Layers** and **Strong Outlines** rather than soft shadows, which can appear muddy to low-vision users.

- **Structural Borders:** Every container and card must use a `2px` solid border (`#3a3a48`). 
- **Active Elevation:** Interactive elements that are "raised" use a lighter surface color (`#1f1f2a`) and a stronger border (`#6b6b82`).
- **Focus States:** When an element is focused, a `3px` solid ring of `Warning` (#ffd479) must be visible, with a 2px offset from the element's edge.
- **No Shadows:** Avoid drop shadows for structural depth; use color value shifts to indicate hierarchy.

## Shapes

The shape language is "Soft-Geometric." 
- **Standard Radius:** 12px for primary UI elements like buttons and input fields.
- **Large Radius:** 16px to 24px for cards and major containers (e.g., Tarot card displays).
- **Iconography:** Icons must be "thick-stroke" (2px minimum) with rounded ends. Never use "line-only" icons with thin weights.
- **Graphics:** Tarot illustrations should utilize bold, high-contrast shapes with strong outer strokes and minimal fine-line detailing to ensure the core imagery is recognizable at various zoom levels.

## Components

### Buttons
- **Primary:** `Accent-strong` background, black text (#0d0d12), 12px radius, 50px minimum height.
- **Secondary:** Transparent background, `2px` border (`#6b6b82`), white text.
- **Text Labels:** All buttons must contain a text label. If an icon is used, the text label is mandatory.

### Cards (Tarot & Content)
- Background: `Surface` (#16161d), Border: `2px` (#3a3a48).
- Tarot cards in a spread must have a clear "Selection" state: a `4px` border of `Accent` (#7ec8ff).

### Input Fields
- Height: 56px.
- Border: `2px` (`#3a3a48`). 
- Active state: Border changes to `Accent` (#7ec8ff) with a label that floats or remains visible.

### Status Indicators & Chips
- **Rule of Two:** Status must be indicated by both color and a text label/icon. 
- Example: A "Success" message includes the Green color AND a checkmark icon AND the word "Success."

### Lists
- Each list item must have a minimum height of 60px.
- Use a 1px separator (`#3a3a48`) between items, or preferably, distinct card-style containers with 8px gaps.