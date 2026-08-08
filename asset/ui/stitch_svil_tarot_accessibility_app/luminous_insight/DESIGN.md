---
name: Luminous Insight
colors:
  surface: '#11131b'
  surface-dim: '#11131b'
  surface-bright: '#373941'
  surface-container-lowest: '#0c0e15'
  surface-container-low: '#191b23'
  surface-container: '#1d1f27'
  surface-container-high: '#282a32'
  surface-container-highest: '#33343d'
  on-surface: '#e2e1ed'
  on-surface-variant: '#d0c6ae'
  inverse-surface: '#e2e1ed'
  inverse-on-surface: '#2e3038'
  outline: '#99907a'
  outline-variant: '#4d4634'
  surface-tint: '#e8c435'
  primary: '#fff8eb'
  on-primary: '#3b2f00'
  primary-container: '#ffd94a'
  on-primary-container: '#735e00'
  inverse-primary: '#715c00'
  secondary: '#c6c6c8'
  on-secondary: '#2f3132'
  secondary-container: '#454749'
  on-secondary-container: '#b4b5b7'
  tertiary: '#f5f9ff'
  on-tertiary: '#00344f'
  tertiary-container: '#bde0ff'
  on-tertiary-container: '#006696'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe179'
  primary-fixed-dim: '#e8c435'
  on-primary-fixed: '#231b00'
  on-primary-fixed-variant: '#554500'
  secondary-fixed: '#e2e2e4'
  secondary-fixed-dim: '#c6c6c8'
  on-secondary-fixed: '#1a1c1d'
  on-secondary-fixed-variant: '#454749'
  tertiary-fixed: '#cae6ff'
  tertiary-fixed-dim: '#8dcdff'
  on-tertiary-fixed: '#001e30'
  on-tertiary-fixed-variant: '#004b70'
  background: '#11131b'
  on-background: '#e2e1ed'
  surface-variant: '#33343d'
typography:
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.5'
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.8'
    letterSpacing: 0.02em
  body-base:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.8'
    letterSpacing: 0.02em
  interactive-label:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.04em
  caption:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.02em
  tiny:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-target-min: 50px
  gap-standard: 12px
  margin-page: 24px
  stack-lg: 40px
  stack-md: 24px
  stack-sm: 16px
---

## Brand & Style
The design system is engineered for **SVIL Tarot**, a platform where mystical tradition meets clinical accessibility. The brand personality is "Quietly Authoritative"—it avoids the visual noise often associated with esoteric apps, opting instead for a focused, low-vision-first experience.

The visual style is a hybrid of **Minimalism** and **Tactile Dark Mode**. It prioritizes extreme legibility and physical presence through high-contrast borders rather than complex shadows. Every element is designed to reduce eye strain (anti-glare) while maintaining a sense of professional tarot practice. The UI should evoke a sense of calm, dark sanctuary where the user's focus is directed solely toward the radiant, high-contrast interactive elements.

## Colors
The palette is strictly optimized for WCAG AAA compliance (7:1 contrast ratio). 

- **Background Strategy:** Use a subtle radial gradient starting from the center (#1A1A2E) to the edges (#0D0D12) to prevent "crushing" blacks and reduce screen glare.
- **Accent Application:** The Primary Accent (#FFD94A) is used exclusively for interactive intent and borders.
- **Informational Blue:** #7EC8FF is reserved for non-interactive data headers or semantic links to distinguish them from primary action paths.
- **Halation Control:** Avoid large blocks of pure white. Use #F5F5F7 for text to ensure a soft but high-contrast reading experience that does not "vibrate" against the dark background.

## Typography
This design system utilizes **Be Vietnam Pro** as the global typeface for its geometric clarity and exceptional legibility in Korean (LINE Seed KR style).

- **Legibility Rules:** The base font size is set to 18px with a generous 1.8 line height to prevent line-scrambling for low-vision users.
- **Emphasis:** Interactive elements (buttons, navigation, input labels) must always use the **Bold (700)** weight.
- **Hierarchy:** Use Informational Blue (#7EC8FF) for secondary headings to create a clear visual anchor that is distinct from body text and primary actions.

## Layout & Spacing
The layout follows a **Fluid Grid** model with strict minimums for accessibility.

- **Touch Targets:** Every interactive element must maintain a minimum hit area of 50x50px.
- **Padding & Gaps:** Use a 12px base gap for all internal component spacing. Vertical stack spacing should be generous (minimum 24px between content blocks) to facilitate easy scanning.
- **Mobile Adaptivity:** On mobile devices, margins remain 24px to provide a "safe grip" area for users, preventing accidental triggers at the screen edges.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Contrasting Outlines** rather than traditional shadows.

1. **Level 0 (Floor):** The base background gradient.
2. **Level 1 (Cards):** #16161D surface. Used for static content containers.
3. **Level 2 (Raised/Inputs):** #1F1F2A surface. Used for interactive fields and modals.
4. **Interactive State:** Depth is signaled by a **2px solid border**. Shadows are not used, as they can cause blurriness for users with specific visual impairments.

## Shapes
The design system employs a "Soft-Geometric" shape language.

- **Interactive Elements:** Buttons and Input fields use a **12px (rounded)** corner radius.
- **Containers:** Tarot cards, content sections, and modals use a **16px (rounded-lg)** corner radius to create a distinct visual container.
- **Visual Consistency:** No elements should be sharp-edged (0px), as rounded corners reduce cognitive load and visual harshness in high-contrast environments.

## Components

### Buttons
Buttons must never use bright background fills.
- **Primary:** Fill #1C2431 | 2px Border #FFD94A | Text #FFD94A (Bold).
- **Secondary:** Fill #1F1F2A | 2px Border #6B6B82 | Text #F5F5F7 (Bold).
- **Focus State (Critical):** 3px #FFD94A solid outline with a 2px offset from the button edge.

### Input Fields
- **Container:** Fill #1F1F2A with a 1px border #6B6B82. 
- **Active State:** Border increases to 2px #FFD94A.
- **Labels:** Always 18px Bold #F5F5F7, placed above the field with a 12px gap.

### Tarot Cards
- **Static State:** #16161D background, 16px radius, 1px #6B6B82 border.
- **Active/Selected:** 2px #FFD94A border.
- **Touch Area:** Ensure the entire card surface is a 50x50px minimum hit zone if the card is selectable.

### Lists & Navigation
- **Items:** Separated by 12px gaps. 
- **Icons:** Use 24px stroke-based icons with a minimum 2px stroke width for visibility. 
- **Checkboxes/Radios:** Minimum 32x32px visual indicator within a 50x50px touch target. High contrast #FFD94A checkmark on #1F1F2A base.